import { convoyStore, useConvoy } from "@/features/convoy";
import { emit, on } from "@/services/socket";
import {
  EVENTS,
  type LocationUpdatePayload,
  type MemberLocationSnapshot,
} from "@/services/socket/events";
import { ADAPTIVE_SAMPLING, distanceMeters, roundCoordinate } from "@/utils";
import { useEffect, useRef } from "react";
import {
  useLocationPermission,
  useLocationServiceState,
  useSelfLocation,
} from "./useLocation";

export function useLocationBroadcast() {
  const convoy = useConvoy();
  const selfLocation = useSelfLocation();
  const permission = useLocationPermission();
  const serviceState = useLocationServiceState();

  // -------- Adaptive Sampling State (DESIGN.md §15.2) --------
  const lastEmitTimeRef = useRef<number>(0);
  const lastEmitPosRef = useRef<{ latitude: number; longitude: number } | null>(null);

  useEffect(() => {
    if (!convoy?.settings.locationSharing) {
      lastEmitTimeRef.current = 0;
      lastEmitPosRef.current = null;
      return;
    }
    if (!convoy) return;
    if (permission !== "granted" || serviceState !== "on") return;
    if (!selfLocation) return;

    const now = Date.now();
    const speed = selfLocation.speed ?? 0;

    // 1. Determine sampling tier based on vehicle speed
    let minIntervalMs: number;
    let minDistanceMeters: number;
    let heartbeatMaxMs: number;

    if (speed > ADAPTIVE_SAMPLING.SPEED_THRESHOLDS.FAST_MPS) {
      // Fast / Cruising (> 15 m/s, ~54 km/h)
      minIntervalMs = ADAPTIVE_SAMPLING.EMIT_INTERVALS_MS.FAST;
      minDistanceMeters = ADAPTIVE_SAMPLING.MIN_DISTANCE_METERS.FAST;
      heartbeatMaxMs = ADAPTIVE_SAMPLING.HEARTBEAT_MAX_MS.FAST;
    } else if (speed >= ADAPTIVE_SAMPLING.SPEED_THRESHOLDS.SLOW_MPS) {
      // Slow / City Driving (2 - 15 m/s)
      minIntervalMs = ADAPTIVE_SAMPLING.EMIT_INTERVALS_MS.SLOW;
      minDistanceMeters = ADAPTIVE_SAMPLING.MIN_DISTANCE_METERS.SLOW;
      heartbeatMaxMs = ADAPTIVE_SAMPLING.HEARTBEAT_MAX_MS.SLOW;
    } else {
      // Stationary / Idle (< 2 m/s)
      minIntervalMs = ADAPTIVE_SAMPLING.EMIT_INTERVALS_MS.STATIONARY;
      minDistanceMeters = ADAPTIVE_SAMPLING.MIN_DISTANCE_METERS.STATIONARY;
      heartbeatMaxMs = ADAPTIVE_SAMPLING.HEARTBEAT_MAX_MS.STATIONARY;
    }

    // 2. Evaluate displacement and elapsed time since last network emit
    const elapsedMs = now - lastEmitTimeRef.current;
    const distanceMoved = lastEmitPosRef.current
      ? distanceMeters(lastEmitPosRef.current, selfLocation.position)
      : Infinity;

    const isInitialFix = lastEmitPosRef.current == null;
    const isHeartbeatExpired = elapsedMs >= heartbeatMaxMs;
    const isMovementThresholdMet = elapsedMs >= minIntervalMs && distanceMoved >= minDistanceMeters;

    // Only broadcast if initial, movement threshold met, or heartbeat expired
    if (!isInitialFix && !isHeartbeatExpired && !isMovementThresholdMet) {
      return;
    }

    lastEmitTimeRef.current = now;
    lastEmitPosRef.current = selfLocation.position;

    // 3. Round coordinates to 6 decimals to bound network payload (DESIGN.md §15.3)
    const payload: LocationUpdatePayload = {
      convoyId: convoy.id,
      memberId: convoy.selfId,
      lat: roundCoordinate(selfLocation.position.latitude),
      lng: roundCoordinate(selfLocation.position.longitude),
      heading: selfLocation.heading != null ? Math.round(selfLocation.heading) : null,
      speed: selfLocation.speed != null ? Math.round(selfLocation.speed * 10) / 10 : null,
      timestamp: selfLocation.timestamp,
    };
    emit(EVENTS.LOCATION_UPDATE, payload);
  }, [
    convoy?.id,
    convoy?.selfId,
    convoy?.settings.locationSharing,
    permission,
    serviceState,
    selfLocation,
  ]);

  // -------- outbound: emit LOCATION_CLEAR when sharing is toggled off --------
  const prevSharingRef = useRef(convoy?.settings.locationSharing);
  useEffect(() => {
    if (prevSharingRef.current && !convoy?.settings.locationSharing && convoy) {
      emit(EVENTS.LOCATION_CLEAR, {
        convoyId: convoy.id,
        memberId: convoy.selfId,
      });
    }
    prevSharingRef.current = convoy?.settings.locationSharing;
  }, [convoy?.settings.locationSharing, convoy?.id, convoy?.selfId]);

  // -------- inbound: apply remote updates --------
  useEffect(() => {
    const off = on<MemberLocationSnapshot>(
      EVENTS.MEMBER_LOCATION,
      (snapshot) => {
        const current = convoyStore.getState();
        if (!current) return;
        if (snapshot.memberId === current.selfId) return; // ignore echo

        convoyStore.patchMember(snapshot.memberId, {
          location:
            snapshot.lat != null && snapshot.lng != null
              ? {
                  lat: snapshot.lat,
                  lng: snapshot.lng,
                  heading: snapshot.heading,
                  speed: snapshot.speed,
                  timestamp: snapshot.timestamp,
                }
              : undefined,
          lastSeenAt: new Date(snapshot.timestamp || Date.now()).toISOString(),
          status: "live",
        });
      },
    );
    return off;
  }, []);

  // -------- heartbeat: periodic beacon so stationary members stay connected --------
  const selfLocationRef = useRef(selfLocation);
  selfLocationRef.current = selfLocation;

  const convoyRef = useRef(convoy);
  convoyRef.current = convoy;

  useEffect(() => {
    if (!convoy?.settings.locationSharing) return;
    if (permission !== "granted" || serviceState !== "on") return;

    const id = setInterval(() => {
      const loc = selfLocationRef.current;
      const c = convoyRef.current;
      if (!loc || !c) return;

      const now = Date.now();
      const elapsed = now - lastEmitTimeRef.current;
      // If no fix was emitted within the heartbeat window, send keepalive fix
      if (elapsed >= ADAPTIVE_SAMPLING.HEARTBEAT_MAX_MS.SLOW) {
        lastEmitTimeRef.current = now;
        emit(EVENTS.LOCATION_UPDATE, {
          convoyId: c.id,
          memberId: c.selfId,
          lat: roundCoordinate(loc.position.latitude),
          lng: roundCoordinate(loc.position.longitude),
          heading: loc.heading != null ? Math.round(loc.heading) : null,
          speed: loc.speed != null ? Math.round(loc.speed * 10) / 10 : null,
          timestamp: now,
        });
      }
    }, 10_000);

    return () => clearInterval(id);
  }, [convoy?.settings.locationSharing, permission, serviceState]);
}
