import { emit, on } from "@/services/socket";
import type {
  ConvoyRejoinPayload,
  ConvoySnapshot,
  CreateConvoyPayload,
  JoinConvoyPayload,
  LeaveConvoyPayload,
  SettingsUpdatePayload,
} from "@/services/socket/events";
import { EVENTS } from "@/services/socket/events";
import { getMemberId } from "@/services/socket/identity";
import type { Convoy, ConvoySettings } from "@/types";
import { convoyStore } from "./useConvoy";

// -------- adapter: wire snapshot → local Convoy --------
function fromSnapshot(
  snapshot: ConvoySnapshot,
  selfId: string,
  currentSettings?: ConvoySettings,
): Convoy {
  return {
    id: snapshot.id,
    name: snapshot.name,
    code: snapshot.code,
    hostId: snapshot.hostId,
    selfId,
    phase: snapshot.phase,
    members: snapshot.members.map((m) => ({
      id: m.id,
      name: m.name,
      isHost: m.isHost,
      status: m.status,
      lastSeenAt: m.lastSeenAt,
      location: m.location,
    })),
    settings: {
      locationSharing: currentSettings?.locationSharing ?? true,
      membersCanPtt: snapshot.settings?.membersCanPtt ?? true,
      membersCanChat: snapshot.settings?.membersCanChat ?? true,
      membersCanInvite: snapshot.settings?.membersCanInvite ?? true,
    },
  };
}

// -------- commands --------
export const convoyCommands = {
  async create(input: { name: string; hostName: string }): Promise<Convoy> {
    const memberId = await getMemberId();

    return new Promise<Convoy>((resolve, reject) => {
      const timeout = setTimeout(() => {
        offSnapshot();
        offError();
        reject(new Error("Timed out creating convoy"));
      }, 8000);

      const offSnapshot = on<ConvoySnapshot>(
        EVENTS.CONVOY_SNAPSHOT,
        (snapshot) => {
          clearTimeout(timeout);
          offSnapshot();
          offError();
          const current = convoyStore.getState();
          const convoy = fromSnapshot(snapshot, memberId, current?.settings);
          convoyStore.applySnapshot(convoy);
          resolve(convoy);
        },
      );

      const offError = on<{ code: string; message: string }>(
        EVENTS.ERROR,
        (err) => {
          clearTimeout(timeout);
          offSnapshot();
          offError();
          reject(new Error(err.message));
        },
      );

      const payload: CreateConvoyPayload = {
        convoyName: input.name,
        hostName: input.hostName,
        memberId,
      };
      emit(EVENTS.CONVOY_CREATE, payload);
    });
  },

  async join(input: { code: string; name: string }): Promise<Convoy> {
    const memberId = await getMemberId();

    return new Promise<Convoy>((resolve, reject) => {
      const timeout = setTimeout(() => {
        offSnapshot();
        offError();
        reject(new Error("Timed out joining convoy"));
      }, 8000);

      const offSnapshot = on<ConvoySnapshot>(
        EVENTS.CONVOY_SNAPSHOT,
        (snapshot) => {
          clearTimeout(timeout);
          offSnapshot();
          offError();
          const current = convoyStore.getState();
          const convoy = fromSnapshot(snapshot, memberId, current?.settings);
          convoyStore.applySnapshot(convoy);
          resolve(convoy);
        },
      );

      const offError = on<{ code: string; message: string }>(
        EVENTS.ERROR,
        (err) => {
          clearTimeout(timeout);
          offSnapshot();
          offError();
          reject(new Error(err.message));
        },
      );

      const payload: JoinConvoyPayload = {
        code: input.code,
        memberName: input.name,
        memberId,
      };
      emit(EVENTS.CONVOY_JOIN, payload);
    });
  },

  async rejoin(convoyId: string): Promise<Convoy> {
    const memberId = await getMemberId();

    return new Promise<Convoy>((resolve, reject) => {
      const timeout = setTimeout(() => {
        offSnapshot();
        offError();
        reject(new Error("Timed out rejoining convoy"));
      }, 8000);

      const offSnapshot = on<ConvoySnapshot>(
        EVENTS.CONVOY_SNAPSHOT,
        (snapshot) => {
          clearTimeout(timeout);
          offSnapshot();
          offError();
          const current = convoyStore.getState();
          const convoy = fromSnapshot(snapshot, memberId, current?.settings);
          convoyStore.applySnapshot(convoy);
          resolve(convoy);
        },
      );

      const offError = on<{ code: string; message: string }>(
        EVENTS.ERROR,
        (err) => {
          clearTimeout(timeout);
          offSnapshot();
          offError();
          if (err.code === "CONVOY_NOT_FOUND" || err.code === "NOT_A_MEMBER") {
            convoyStore.clear();
          }
          reject(new Error(err.message));
        },
      );

      const payload: ConvoyRejoinPayload = {
        convoyId,
        memberId,
      };
      emit(EVENTS.CONVOY_REJOIN, payload);
    });
  },

  updateSettings(patch: Partial<ConvoySettings>) {
    const convoy = convoyStore.getState();
    if (!convoy) return;

    // Optimistically apply locally so the UI updates immediately
    convoyStore.updateSettings(patch);

    if (patch.locationSharing === false) {
      convoyStore.patchMember(convoy.selfId, { location: undefined });
    }

    // Only broadcast shared convoy settings to the server (locationSharing is a local device privacy setting)
    const { locationSharing: _localOnly, ...convoySettingsPatch } = patch;
    if (Object.keys(convoySettingsPatch).length > 0) {
      const payload: SettingsUpdatePayload = {
        convoyId: convoy.id,
        memberId: convoy.selfId,
        patch: convoySettingsPatch,
      };
      emit(EVENTS.SETTINGS_UPDATE, payload);
    }
  },

  rename(name: string) {
    const convoy = convoyStore.getState();
    if (!convoy) return;
    const trimmed = name.trim();
    if (!trimmed) return;
    convoyStore.rename(trimmed);
    emit(EVENTS.CONVOY_RENAME, {
      convoyId: convoy.id,
      memberId: convoy.selfId,
      name: trimmed,
    });
  },

  clearLocation() {
    const convoy = convoyStore.getState();
    if (!convoy) return;
    convoyStore.patchMember(convoy.selfId, { location: undefined });
    emit(EVENTS.LOCATION_CLEAR, {
      convoyId: convoy.id,
      memberId: convoy.selfId,
    });
  },

  start() {
    emit(EVENTS.CONVOY_START);
  },

  leave() {
    const convoy = convoyStore.getState();
    if (convoy) {
      const payload: LeaveConvoyPayload = {
        convoyId: convoy.id,
        memberId: convoy.selfId,
      };
      emit(EVENTS.CONVOY_LEAVE, payload);
    }
    convoyStore.clear();
  },

  end() {
    emit(EVENTS.CONVOY_END);
  },
};
