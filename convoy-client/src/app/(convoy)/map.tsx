import { useToast } from "@/components/ui";
import { pttCommands, usePushToTalk } from "@/features/pushToTalk";
import { router } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  AppState,
  LayoutAnimation,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from "react-native-maps";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ChatDrawer } from "@/components/ChatDrawer";
import { ConnectionStatusPill } from "@/components/ConnectionStatusPill";
import { ConvoyMemberMarker } from "@/components/ConvoyMemberMarker";
import { ConvoyTelemetryHud } from "@/components/ConvoyTelemetryHud";
import { LocationStatusBanner } from "@/components/LocationStatusBanner";
import { MapFloatingControls } from "@/components/MapFloatingControls";
import { MemberDetailSheet } from "@/components/MemberDetailSheet";
import { MemberStrip } from "@/components/MemberStrip";
import PttControl from "@/components/PttControl";
import { QuickAccessRow } from "@/components/QuickAccessRow";

import { convoyStore, getSelf, useConvoy } from "@/features/convoy";
import { useOutboxPendingCount } from "@/services/sync";
import {
  locationStore,
  useLocationPermission,
  useLocationServiceState,
  useSelfLocation,
} from "@/features/location";

import { isHost, withSelfConnected } from "@/features/convoy/selectors";
import { useConnectionState } from "@/features/connection";
import { usePttSpeaker } from "@/features/pushToTalk/usePttSync";
import { colors, radii, spacing, typography } from "@/theme";
import type { Member } from "@/types";
import {
  calculateConvoySpanMeters,
  distanceMeters,
  orderMembersAlongConvoy,
  relativePosition,
  type LatLng,
} from "@/utils/geo";

const INITIAL_REGION = {
  latitude: 6.9271,
  longitude: 79.8612,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};

const TRANSPARENT_MARKER_ICON = require("../../../assets/images/transparent-dot.png");


export default function MapScreen() {
  const convoy = useConvoy();
  const ptt = usePushToTalk();
  const speaker = usePttSpeaker();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapView | null>(null);

  const selfLocation = useSelfLocation();
  const permission = useLocationPermission();
  const serviceState = useLocationServiceState();
  const connectionState = useConnectionState();
  const pendingCount = useOutboxPendingCount();

  const [isPanelCollapsed, setIsPanelCollapsed] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);

  // 3D camera and map display options
  const [is3D, setIs3D] = useState(false);
  const [showTraffic, setShowTraffic] = useState(false);

  const togglePanelCollapse = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsPanelCollapsed((prev) => !prev);
  }, []);

  // ---------------- start/stop location tracking based on settings ----------------
  useEffect(() => {
    if (convoy?.settings.locationSharing) {
      void locationStore.start();
    } else {
      locationStore.stop();
    }
    return () => {
      // Intentionally do NOT stop tracking on unmount. Leaving the convoy
      // is what stops it (see handlers in lobby/settings).
    };
  }, [convoy?.settings.locationSharing]);

  // ---------------- refresh permission/service state on foreground ----------------
  useEffect(() => {
    const sub = AppState.addEventListener("change", (next) => {
      if (next !== "active") return;
      if (convoy?.settings.locationSharing) {
        void locationStore.refresh();
      }
    });
    return () => sub.remove();
  }, [convoy?.settings.locationSharing]);

  // ---------------- push lastSeen for self ----------------
  useEffect(() => {
    if (!selfLocation || !convoy) return;
    convoyStore.setMemberLastSeen(
      convoy.selfId,
      new Date(selfLocation.timestamp).toISOString(),
    );
  }, [selfLocation?.timestamp, convoy?.selfId]);

  // ---------------- derived member positions ----------------
  const positionsById = useMemo(() => {
    const map: Record<string, LatLng> = {};
    if (!convoy) return map;

    const isSharing = Boolean(convoy.settings?.locationSharing);

    for (const m of convoy.members) {
      if (m.id === convoy.selfId) {
        // Self: prefer the live local reading only when location sharing is enabled.
        if (selfLocation && isSharing) {
          map[m.id] = selfLocation.position;
        }
      } else if (m.location && m.location.lat != null && m.location.lng != null) {
        map[m.id] = {
          latitude: m.location.lat,
          longitude: m.location.lng,
        };
      }
    }
    return map;
  }, [convoy, selfLocation]);

  const members = convoy ? withSelfConnected(convoy) : [];
  const hostMember = members.find((m) => m.isHost);
  const leaderHeading =
    hostMember?.id === convoy?.selfId
      ? selfLocation?.heading
      : hostMember?.location?.heading;

  // Order members along the convoy travel vector (DESIGN.md §15.5)
  const orderedMembers = useMemo(() => {
    return orderMembersAlongConvoy(members, positionsById, leaderHeading);
  }, [members, positionsById, leaderHeading]);

  const connectedCount = members.filter(
    (m) => m.status !== "offline" && m.status !== "lost",
  ).length;

  const validWaypoints = useMemo(() => {
    return orderedMembers
      .map((m) => positionsById[m.id])
      .filter(Boolean) as LatLng[];
  }, [orderedMembers, positionsById]);

  // Convoy span distance (meters) along ordered waypoints (100% offline)
  const convoySpanMeters = useMemo(() => {
    return calculateConvoySpanMeters(validWaypoints);
  }, [validWaypoints]);

  const self = convoy ? getSelf(convoy) : null;
  const isHostUser = Boolean(self?.isHost);
  const selfHeading = selfLocation?.heading ?? null;

  // ---------------- camera helpers: 3D angle, recenter & fit ----------------
  const recenter = useCallback(() => {
    const target = selfLocation?.position ?? validWaypoints[0] ?? {
      latitude: INITIAL_REGION.latitude,
      longitude: INITIAL_REGION.longitude,
    };

    if (is3D) {
      mapRef.current?.animateCamera(
        {
          center: target,
          pitch: 55,
          heading: selfHeading && selfHeading > 0 ? selfHeading : 0,
          zoom: 16.5,
          altitude: 800,
        },
        { duration: 600 },
      );
    } else {
      mapRef.current?.animateCamera(
        {
          center: target,
          pitch: 0,
          heading: 0,
          zoom: 15,
          altitude: 2000,
        },
        { duration: 500 },
      );
    }
  }, [selfLocation, is3D, selfHeading]);

  const toggle3DView = useCallback(() => {
    setIs3D((prev) => {
      const next = !prev;
      const target = selfLocation?.position ?? {
        latitude: INITIAL_REGION.latitude,
        longitude: INITIAL_REGION.longitude,
      };

      if (next) {
        // Angled 3D driving view
        mapRef.current?.animateCamera(
          {
            center: target,
            pitch: 55,
            heading: selfHeading && selfHeading > 0 ? selfHeading : 0,
            zoom: 16.5,
            altitude: 800,
          },
          { duration: 800 },
        );
      } else {
        // Overhead flat 2D map view
        mapRef.current?.animateCamera(
          {
            center: target,
            pitch: 0,
            heading: 0,
            zoom: 15,
            altitude: 2000,
          },
          { duration: 600 },
        );
      }
      return next;
    });
  }, [selfLocation, selfHeading]);

  const fitConvoy = useCallback(() => {
    if (validWaypoints.length === 0) return;

    if (validWaypoints.length === 1) {
      mapRef.current?.animateCamera(
        {
          center: validWaypoints[0],
          pitch: is3D ? 50 : 0,
          zoom: 16,
          altitude: 1000,
        },
        { duration: 600 },
      );
      return;
    }

    mapRef.current?.fitToCoordinates(validWaypoints, {
      edgePadding: {
        top: insets.top + 120,
        right: 50,
        bottom: insets.bottom + 230,
        left: 50,
      },
      animated: true,
    });
  }, [validWaypoints, insets, is3D]);

  // Auto-recenter once, when GPS first locks in.
  const hadFixRef = useRef(false);
  useEffect(() => {
    if (!selfLocation) return;
    if (hadFixRef.current) return;
    hadFixRef.current = true;
    recenter();
  }, [selfLocation, recenter]);

  // ---------------- guard: no convoy ----------------
  if (!convoy) return null;

  // ---------------- loading: waiting for GPS (only when locationSharing is enabled) ----------------
  if (
    convoy.settings.locationSharing &&
    !selfLocation &&
    permission === "granted" &&
    serviceState === "on"
  ) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator color={colors.primary} size="large" />
        <Text style={styles.loadingText}>Locating…</Text>
      </View>
    );
  }

  // Calculate distance to host (convoy leader) if applicable
  const distanceToHost =
    hostMember &&
    hostMember.id !== convoy.selfId &&
    positionsById[hostMember.id] &&
    positionsById[convoy.selfId]
      ? distanceMeters(positionsById[convoy.selfId], positionsById[hostMember.id])
      : null;

  const relativeFor = (m: Member): string | undefined => {
    if (m.id === convoy.selfId) return undefined;
    if (m.status === "offline" || m.status === "lost") return undefined;
    const pos = positionsById[m.id];
    const selfPos = positionsById[convoy.selfId];
    if (!pos || !selfPos) return undefined;
    return relativePosition(selfPos, pos, selfHeading);
  };

  // ---------------- render ----------------
  return (
    <View style={styles.container}>
      {/* ---------------- Map ---------------- */}
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        provider={Platform.OS === "android" ? PROVIDER_GOOGLE : undefined}
        initialRegion={
          selfLocation
            ? {
                ...selfLocation.position,
                latitudeDelta: 0.02,
                longitudeDelta: 0.02,
              }
            : validWaypoints[0]
              ? {
                  latitude: validWaypoints[0].latitude,
                  longitude: validWaypoints[0].longitude,
                  latitudeDelta: 0.02,
                  longitudeDelta: 0.02,
                }
              : INITIAL_REGION
        }
        showsUserLocation={false}
        showsCompass={false}
        showsMyLocationButton={false}
        toolbarEnabled={false}
        customMapStyle={darkMapStyle}
        pitchEnabled={true}
        rotateEnabled={true}
        scrollEnabled={true}
        zoomEnabled={true}
        showsBuildings={true}
        showsTraffic={showTraffic}
        showsIndoors={false}
      >
        {/* Remote Member Markers (stable list, never reorders with self) */}
        {convoy.members
          .filter((m) => m.id !== convoy.selfId)
          .map((member) => {
            const pos = positionsById[member.id];
            if (!pos) return null;

            return (
              <Marker
                key={`peer-${member.id}`}
                coordinate={pos}
                anchor={{ x: 0.5, y: 0.5 }}
                icon={TRANSPARENT_MARKER_ICON}
                tracksViewChanges={true}
                zIndex={10}
                onPress={() => setSelectedMember(member)}
              >
                <ConvoyMemberMarker
                  name={member.name}
                  isSelf={false}
                  status={member.status}
                  heading={member.location?.heading ?? null}
                  lastSeenAt={member.lastSeenAt}
                  speed={member.location?.speed ?? null}
                  relativeDistance={relativeFor(member)}
                  isHost={Boolean(member.isHost)}
                  onPress={() => setSelectedMember(member)}
                />
              </Marker>
            );
          })}

        {/* Self Location Marker (dedicated, top z-index, only when locationSharing is enabled) */}
        {convoy.settings.locationSharing && positionsById[convoy.selfId] ? (
          <Marker
            key={`self-${convoy.selfId}`}
            coordinate={positionsById[convoy.selfId]}
            anchor={{ x: 0.5, y: 0.5 }}
            icon={TRANSPARENT_MARKER_ICON}
            tracksViewChanges={true}
            zIndex={999}
            onPress={() => {
              const selfMember = getSelf(convoy);
              if (selfMember) setSelectedMember(selfMember);
            }}
          >
            <ConvoyMemberMarker
              name="You"
              isSelf={true}
              status="live"
              heading={selfHeading}
              speed={selfLocation?.speed ?? null}
              isHost={isHost(convoy)}
              onPress={() => {
                const selfMember = getSelf(convoy);
                if (selfMember) setSelectedMember(selfMember);
              }}
            />
          </Marker>
        ) : null}

        {/* Convoy Formation Waypoint Path */}
        {validWaypoints.length >= 2 ? (
          <>
            {/* Ambient illuminated glow halo along convoy line */}
            <Polyline
              coordinates={validWaypoints}
              strokeColor="rgba(245, 166, 35, 0.28)"
              strokeWidth={Platform.OS === "ios" ? 8 : 10}
              lineCap="round"
              lineJoin="round"
            />
            {/* Core high-visibility convoy path */}
            <Polyline
              coordinates={validWaypoints}
              strokeColor={colors.primary}
              strokeWidth={3.8}
              lineCap="round"
              lineJoin="round"
              lineDashPattern={[8, 8]}
            />
          </>
        ) : null}
      </MapView>

      {/* ---------------- Top navigation bar ---------------- */}
      <View style={[styles.topBar, { paddingTop: insets.top + spacing.xs }]}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          style={styles.iconButton}
          accessibilityLabel="Back"
        >
          <Text style={styles.iconText}>←</Text>
        </Pressable>

        <View style={styles.topCenter}>
          <Text style={styles.convoyName} numberOfLines={1}>
            {convoy.name}
          </Text>
          <ConnectionStatusPill
            status={connectionState}
            connectedCount={connectedCount}
            pendingCount={pendingCount}
          />
        </View>

        <View style={styles.topRightActions}>
          <Pressable
            onPress={fitConvoy}
            hitSlop={10}
            style={styles.iconButton}
            accessibilityLabel="Fit Convoy"
          >
            <Text style={styles.topFitIcon}>⛶</Text>
          </Pressable>

          <Pressable
            onPress={() => router.push("/(convoy)/settings")}
            hitSlop={12}
            style={styles.iconButton}
            accessibilityLabel="Settings"
          >
            <Text style={styles.iconText}>⋮</Text>
          </Pressable>
        </View>
      </View>

      {/* ---------------- Telemetry & Formation HUD ---------------- */}
      <View style={[styles.hudSlot, { top: insets.top + 58 }]}>
        <ConvoyTelemetryHud
          convoySpanMeters={convoySpanMeters}
          speed={selfLocation?.speed ?? null}
          heading={selfHeading}
          distanceToHost={distanceToHost}
          isHost={isHostUser}
          memberCount={connectedCount}
        />
      </View>

      {/* ---------------- Floating Map Controls Dock (3D Angle, Fit, Recenter) ---------------- */}
      <View
        style={[
          styles.floatingControlsSlot,
          { bottom: insets.bottom + (isPanelCollapsed ? 68 : 210) },
        ]}
      >
        <MapFloatingControls
          is3D={is3D}
          onToggle3D={toggle3DView}
          onFitConvoy={fitConvoy}
          onRecenter={recenter}
          showTraffic={showTraffic}
          onToggleTraffic={() => setShowTraffic((prev) => !prev)}
          heading={selfHeading}
        />
      </View>

      {/* ---------------- Bottom console ---------------- */}
      <View
        style={[
          styles.bottom,
          isPanelCollapsed && styles.bottomCollapsed,
          { paddingBottom: insets.bottom + (isPanelCollapsed ? spacing.sm : spacing.xs) },
        ]}
      >
        {/* Interactive drag notch / toggle handle (DESIGN.md §15.1 - Driver Safety Touch Target) */}
        <Pressable
          onPress={togglePanelCollapse}
          hitSlop={12}
          style={styles.notchHandle}
          accessibilityRole="button"
          accessibilityLabel={
            isPanelCollapsed ? "Show Convoy Controls" : "Hide Convoy Controls"
          }
        >
          <View style={styles.notch} />
          <View style={styles.notchLabelRow}>
            <Text style={styles.notchLabelText}>
              {isPanelCollapsed
                ? `▲ Show Controls (${connectedCount} connected)`
                : "▼ Hide Panel"}
            </Text>
          </View>
        </Pressable>

        {!isPanelCollapsed && (
          <>
            <View style={styles.bannerSlot}>
              <LocationStatusBanner
                permission={permission}
                serviceState={serviceState}
                onRequest={() => {
                  void locationStore.start();
                }}
              />
            </View>

            {/* Member strip with live statuses */}
            <MemberStrip
              members={members}
              selfId={convoy.selfId}
              onMemberPress={(member) => setSelectedMember(member)}
            />

            {/* PTT Control Button */}
            <PttControl
              ptt={ptt}
              allowed={convoy.settings.membersCanPtt || isHostUser}
              onSend={async (rec) => {
                try {
                  const base64 = await ptt.getLastRecordingBase64();
                  if (!base64) {
                    toast.show({ message: "Recording failed", variant: "error" });
                    ptt.clear();
                    return;
                  }
                  pttCommands.broadcast(base64, rec.durationMs);
                  toast.show({
                    message: `Sent ${Math.round(rec.durationMs / 1000)}s message`,
                    variant: "success",
                  });
                } catch (err) {
                  toast.show({ message: "Send failed", variant: "error" });
                } finally {
                  ptt.clear();
                }
              }}
              onError={(msg) => toast.show({ message: msg, variant: "error" })}
            />

            {/* Quick Access Row */}
            <QuickAccessRow
              onChatPress={() => setChatOpen(true)}
              chatUnread={0}
            />
          </>
        )}
      </View>

      {/* ---------------- Drawers & Sheets ---------------- */}
      <ChatDrawer visible={chatOpen} onClose={() => setChatOpen(false)} />

      <MemberDetailSheet
        visible={selectedMember !== null}
        member={selectedMember}
        selfId={convoy.selfId}
        relativePosition={
          selectedMember ? relativeFor(selectedMember) : undefined
        }
        onClose={() => setSelectedMember(null)}
        onFocus={(member) => {
          const pos = positionsById[member.id];
          if (!pos) return;
          if (is3D) {
            mapRef.current?.animateCamera(
              { center: pos, pitch: 55, zoom: 17, altitude: 700 },
              { duration: 600 },
            );
          } else {
            mapRef.current?.animateToRegion(
              { ...pos, latitudeDelta: 0.01, longitudeDelta: 0.01 },
              500,
            );
          }
        }}
      />

      {/* ---------------- Talking PTT Banner ---------------- */}
      {speaker ? (
        <View style={[styles.talkingBadge, { top: insets.top + 130 }]}>
          <View style={styles.talkingPulseDot} />
          <Text style={styles.talkingText}>🔊 {speaker.name} is talking…</Text>
        </View>
      ) : null}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  loadingWrap: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
  },
  loadingText: {
    ...typography.bodyMuted,
    fontSize: 15,
  },

  topBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(16, 20, 28, 0.88)",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.06)",
  },
  topCenter: {
    flex: 1,
    alignItems: "center",
    gap: 2,
    marginHorizontal: spacing.sm,
  },
  convoyName: {
    ...typography.h3,
    maxWidth: 220,
    textAlign: "center",
  },
  topRightActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: radii.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.raised,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  iconText: {
    ...typography.body,
    fontSize: 17,
    color: colors.text,
  },
  topFitIcon: {
    fontSize: 15,
    color: colors.primary,
  },

  hudSlot: {
    position: "absolute",
    left: 0,
    right: 0,
    zIndex: 10,
  },

  floatingControlsSlot: {
    position: "absolute",
    right: spacing.md,
    zIndex: 15,
  },

  bottom: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: 2,
    gap: spacing.md,
    backgroundColor: "rgba(16, 20, 28, 0.94)",
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.08)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
  },
  bottomCollapsed: {
    gap: 0,
  },
  notchHandle: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 6,
    paddingBottom: 4,
    minHeight: 44,
  },
  notch: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    alignSelf: "center",
  },
  notchLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 3,
  },
  notchLabelText: {
    ...typography.label,
    fontSize: 11,
    fontWeight: "600",
    color: colors.textMuted,
    letterSpacing: 0.5,
  },
  bannerSlot: {
    paddingHorizontal: spacing.md,
  },

  talkingBadge: {
    position: "absolute",
    alignSelf: "center",
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
    backgroundColor: "rgba(26, 32, 41, 0.95)",
    borderWidth: 1.5,
    borderColor: colors.alert,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    shadowColor: colors.alert,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 6,
    zIndex: 20,
  },
  talkingPulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.alert,
  },
  talkingText: {
    ...typography.body,
    fontSize: 13,
    fontWeight: "700",
    color: colors.alert,
  },
});

// ---------------------------------------------------------------------------
// Enhanced Dark map style with 3D buildings support
// ---------------------------------------------------------------------------

const darkMapStyle = [
  { elementType: "geometry", stylers: [{ color: "#10131A" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#8791A6" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#10131A" }] },
  {
    featureType: "administrative",
    elementType: "geometry",
    stylers: [{ color: "#2B3242" }],
  },
  {
    featureType: "poi",
    elementType: "geometry",
    stylers: [{ color: "#1A2029" }],
  },
  {
    featureType: "poi",
    elementType: "labels.text.fill",
    stylers: [{ color: "#8791A6" }],
  },
  {
    featureType: "road",
    elementType: "geometry",
    stylers: [{ color: "#212836" }],
  },
  {
    featureType: "road",
    elementType: "geometry.stroke",
    stylers: [{ color: "#2B3242" }],
  },
  {
    featureType: "road.highway",
    elementType: "geometry",
    stylers: [{ color: "#2E3748" }],
  },
  {
    featureType: "road.highway",
    elementType: "geometry.stroke",
    stylers: [{ color: "#1A2029" }],
  },
  {
    featureType: "transit",
    elementType: "geometry",
    stylers: [{ color: "#1A2029" }],
  },
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [{ color: "#0B0E13" }],
  },
  {
    featureType: "water",
    elementType: "labels.text.fill",
    stylers: [{ color: "#8791A6" }],
  },
  {
    featureType: "landscape.man_made",
    elementType: "geometry",
    stylers: [{ color: "#151922" }],
  },
  {
    featureType: "landscape.man_made",
    elementType: "geometry.stroke",
    stylers: [{ color: "#2A3344" }],
  },
];
