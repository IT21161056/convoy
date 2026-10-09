import { useToast } from "@/components/ui";
import { chatStore } from "@/features/chat";
import { convoyStore } from "@/features/convoy";
import { locationStore } from "@/features/location";
import { on } from "@/services/socket";
import { EVENTS, type ConvoySnapshot } from "@/services/socket/events";
import type { Convoy, ConvoySettings, Member } from "@/types";
import { deriveMemberStatus } from "@/utils";
import { router } from "expo-router";
import { useEffect } from "react";

export function useMemberSync() {
  const toast = useToast();
  useEffect(() => {
    // ---------- convoy snapshot ----------
    const offSnapshot = on<ConvoySnapshot>(
      EVENTS.CONVOY_SNAPSHOT,
      (snapshot) => {
        const current = convoyStore.getState();
        if (!current) return;
        if (!current.selfId) return;

        const merged: Convoy = {
          ...current,
          name: snapshot.name,
          code: snapshot.code,
          hostId: snapshot.hostId,
          phase: snapshot.phase,
          members: snapshot.members.map(toLocalMember),
          settings: snapshot.settings
            ? {
                ...snapshot.settings,
                locationSharing: current.settings.locationSharing,
              }
            : current.settings,
        };
        convoyStore.applySnapshot(merged);
      },
    );

    // ---------- settings ----------
    const offSettings = on<ConvoySettings>(
      EVENTS.SETTINGS_STATE,
      (settings) => {
        convoyStore.applySettings(settings);
      },
    );

    // ---------- convoy ended (host-initiated) ----------
    const offEnded = on<{ reason: string }>(EVENTS.CONVOY_ENDED, () => {
      // Tear down everything and send the user home.
      locationStore.stop();
      chatStore.clear();
      convoyStore.clear();
      router.replace("/(welcome)");
      toast.show({ message: "Convoy ended by host" });
    });

    // Periodic status sweep derived locally from lastSeenAt age (DESIGN.md §15.6)
    const sweepInterval = setInterval(() => {
      const current = convoyStore.getState();
      if (!current) return;
      const now = Date.now();

      for (const m of current.members) {
        if (m.id === current.selfId || m.status === "offline") continue;
        const derived = deriveMemberStatus(m.lastSeenAt, now);
        if (m.status !== derived) {
          convoyStore.patchMember(m.id, { status: derived });
        }
      }
    }, 5000);

    return () => {
      clearInterval(sweepInterval);
      offSnapshot();
      offSettings();
      offEnded();
    };
  }, []);
}

function toLocalMember(m: ConvoySnapshot["members"][number]): Member {
  return {
    id: m.id,
    name: m.name,
    isHost: m.isHost,
    status: m.status,
    lastSeenAt: m.lastSeenAt,
    location: m.location,
  };
}
