import { convoyRepo } from "@/db";
import { chatStore } from "@/features/chat/useChat";
import type { Convoy, ConvoySettings, Member } from "@/types";
import { useSyncExternalStore } from "react";

// ---------- state ----------
let state: Convoy | null = null;
let hydrated = false;

const listeners = new Set<() => void>();
let persistTimer: ReturnType<typeof setTimeout> | null = null;

function emit() {
  if (persistTimer) clearTimeout(persistTimer);
  persistTimer = setTimeout(() => {
    persist(state);
    persistTimer = null;
  }, 250);

  listeners.forEach((l) => l());
}

function persist(next: Convoy | null) {
  try {
    if (next === null) {
      convoyRepo.clearConvoy();
    } else {
      convoyRepo.saveConvoy(next);
    }
  } catch (e) {
    console.warn("[convoyStore] SQLite persist error:", e);
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot() {
  return state;
}


const DEFAULT_SETTINGS: ConvoySettings = {
  locationSharing: true,
  membersCanPtt: true,
  membersCanChat: true,
  membersCanInvite: true,
};

export const DEFAULT_CONVOY_SETTINGS = DEFAULT_SETTINGS;

// ---------- store (pure state) ----------
export const convoyStore = {
  /**
   * Load any persisted convoy. Called once at app startup.
   * Restores from SQLite local database (DESIGN.md §14.2).
   * Returns true if a convoy was restored.
   */
  async hydrate(): Promise<boolean> {
    let restored: Convoy | null = null;

    try {
      restored = convoyRepo.getActiveConvoy();
    } catch (e) {
      console.warn("[convoyStore] SQLite hydrate check:", e);
    }

    hydrated = true;

    if (!restored) {
      listeners.forEach((l) => l());
      return false;
    }
    if (restored.phase === "ended") {
      try {
        convoyRepo.clearConvoy(restored.id);
      } catch {}
      listeners.forEach((l) => l());
      return false;
    }

    state = restored;
    try {
      chatStore.loadForConvoy(restored.id);
    } catch {}
    listeners.forEach((l) => l());
    return true;
  },

  isHydrated(): boolean {
    return hydrated;
  },

  /** Replace the entire convoy. Used by the socket snapshot handler. */
  applySnapshot(next: Convoy) {
    if (state) {
      state = {
        ...next,
        settings: {
          ...next.settings,
          locationSharing: state.settings.locationSharing,
        },
      };
    } else {
      state = next;
    }
    emit();
  },

  applySettings(next: ConvoySettings) {
    if (!state) return;
    state = {
      ...state,
      settings: {
        ...next,
        locationSharing: state.settings.locationSharing,
      },
    };
    emit();
  },

  /** Merge partial updates into one member. */
  patchMember(memberId: string, patch: Partial<Member>) {
    if (!state) return;
    const members = state.members.map((m) =>
      m.id === memberId ? { ...m, ...patch } : m,
    );
    state = { ...state, members };
    emit();
  },

  /** Remove a member (they left). */
  removeMember(memberId: string) {
    if (!state) return;
    state = {
      ...state,
      members: state.members.filter((m) => m.id !== memberId),
    };
    emit();
  },

  updateSettings(patch: Partial<ConvoySettings>) {
    if (!state) return;
    state = { ...state, settings: { ...state.settings, ...patch } };
    emit();
  },

  rename(name: string) {
    if (!state) return;
    const trimmed = name.trim();
    if (!trimmed) return;
    state = { ...state, name: trimmed };
    emit();
  },

  end() {
    if (!state) return;
    state = { ...state, phase: "ended" };
    emit();
  },

  setMemberLastSeen(memberId: string, iso: string) {
    if (!state) return;
    const existing = state.members.find((m) => m.id === memberId);
    if (!existing || existing.lastSeenAt === iso) return;
    const members = state.members.map((m) =>
      m.id === memberId ? { ...m, lastSeenAt: iso } : m,
    );
    state = { ...state, members };
    emit();
  },

  /** Tear down state entirely — used on leave/end. */
  clear() {
    if (state?.id) {
      try {
        convoyRepo.clearConvoy(state.id);
        chatStore.clear(state.id);
      } catch (e) {
        console.warn("[convoyStore] clear error:", e);
      }
    }
    state = null;
    emit();
  },

  /** Synchronous read of the current state. Useful during boot sequencing. */
  getState(): Convoy | null {
    return state;
  },
};

// ---------- hooks ----------
export function useConvoy(): Convoy | null {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
