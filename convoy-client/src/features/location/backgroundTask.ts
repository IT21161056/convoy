import { convoyStore } from "@/features/convoy";
import * as Location from "expo-location";
import { requireOptionalNativeModule } from "expo-modules-core";
import { AppState } from "react-native";
import type { SelfLocation } from "./types";

export const LOCATION_TASK_NAME = "CONVOY_BACKGROUND_LOCATION_TASK";

type FixHandler = (loc: SelfLocation) => void;
let fixHandler: FixHandler | null = null;
export function setBackgroundFixHandler(handler: FixHandler | null) {
  fixHandler = handler;
}

// Safely resolve TaskManager only if the native module is compiled into the current binary
type TaskManagerType = typeof import("expo-task-manager");
let TaskManager: TaskManagerType | null = null;

if (requireOptionalNativeModule("ExpoTaskManager")) {
  try {
    TaskManager = require("expo-task-manager");
  } catch (e) {
    console.warn("[background-location] Could not load expo-task-manager:", e);
  }
} else {
  console.log(
    "[background-location] ExpoTaskManager native module not present in current binary. Background updates will be enabled upon next native build.",
  );
}

// Define headless background location task at module scope if TaskManager is available
if (TaskManager) {
  TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
    if (error) {
      console.warn("[background-location] Task error:", error.message);
      return;
    }
    if (!data) return;

    const { locations } = data as { locations?: Location.LocationObject[] };
    if (!locations || locations.length === 0) return;

    const loc = locations[locations.length - 1];
    const timestamp = loc.timestamp || Date.now();

    const selfLocation: SelfLocation = {
      position: {
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      },
      heading:
        loc.coords.heading != null && loc.coords.heading >= 0
          ? loc.coords.heading
          : null,
      speed: loc.coords.speed ?? null,
      timestamp,
    };

    // Forward fix to the location store so adaptive sampling in useLocationBroadcast
    // processes the fix through vehicle speed tiers and distance thresholds.
    fixHandler?.(selfLocation);

    // Check convoy state & privacy toggle
    let convoy = convoyStore.getState();
    if (!convoy) {
      await convoyStore.hydrate();
      convoy = convoyStore.getState();
    }

    if (!convoy || !convoy.id || convoy.phase === "ended" || !convoy.settings.locationSharing) {
      void stopBackgroundLocationUpdates();
    }
  });
}

/**
 * Start the background location updates with an Android foreground service.
 * Keeps GPS updates streaming even when the app is minimized or screen is locked.
 * Requires "Allow all the time" permission and active app state to start.
 */
export async function startBackgroundLocationUpdates(): Promise<void> {
  if (!TaskManager) return;
  try {
    const isAvailable = await Location.isBackgroundLocationAvailableAsync();
    if (!isAvailable) {
      return;
    }

    // Android 12+ restriction: Foreground services CANNOT be started when the app is in the background
    if (AppState.currentState !== "active") {
      return;
    }

    // Verify background permission is actually granted ("Allow all the time")
    const bgPermission = await Location.getBackgroundPermissionsAsync().catch(() => null);
    if (!bgPermission || bgPermission.status !== "granted") {
      return;
    }

    // Check if convoy is active and location sharing is on
    const convoy = convoyStore.getState();
    if (!convoy || !convoy.id || convoy.phase === "ended" || !convoy.settings.locationSharing) {
      return;
    }

    const isStarted = await Location.hasStartedLocationUpdatesAsync(
      LOCATION_TASK_NAME,
    ).catch(() => false);

    if (isStarted) return;

    await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
      accuracy: Location.Accuracy.High,
      timeInterval: 3000,
      distanceInterval: 5,
      deferredUpdatesInterval: 3000,
      deferredUpdatesDistance: 5,
      showsBackgroundLocationIndicator: true,
      pausesUpdatesAutomatically: false,
      foregroundService: {
        notificationTitle: "Convoy Active",
        notificationBody: "Sharing live location with your convoy",
        notificationColor: "#10B981",
      },
    });

    console.log("[background-location] Started background location updates");
  } catch (err: any) {
    // Avoid noisy unhandled rejections if OS denies foreground service launch
    console.warn("[background-location] Notice:", err?.message ?? err);
  }
}

/**
 * Stop background location updates and remove the Android foreground notification.
 */
export async function stopBackgroundLocationUpdates(): Promise<void> {
  if (!TaskManager) return;
  try {
    const isStarted = await Location.hasStartedLocationUpdatesAsync(
      LOCATION_TASK_NAME,
    ).catch(() => false);

    if (isStarted) {
      await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME).catch(() => {});
      console.log("[background-location] Stopped background location updates");
    }
  } catch (_err) {
    // Non-critical if task was already stopped by OS
  }
}
