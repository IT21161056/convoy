import * as Location from "expo-location";
import { useSyncExternalStore } from "react";
import {
  setBackgroundFixHandler,
  startBackgroundLocationUpdates,
  stopBackgroundLocationUpdates,
} from "./backgroundTask";
import type {
  BackgroundPermission,
  LocationPermission,
  LocationServiceState,
  SelfLocation,
} from "./types";

// -------- state --------
let permission: LocationPermission = "unknown";
let backgroundPermission: BackgroundPermission = "unknown";
let serviceState: LocationServiceState = "permission";
let self: SelfLocation | null = null;

let subscription: Location.LocationSubscription | null = null;

const listeners = new Set<() => void>();
function emit() {
  listeners.forEach((l) => l());
}
function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

// -------- selectors --------
function getSelf() {
  return self;
}
function getPermission() {
  return permission;
}
function getBackgroundPermission() {
  return backgroundPermission;
}
function getServiceState() {
  return serviceState;
}

// -------- store --------
export const locationStore = {
  /**
   * Directly update the self location from a background task or high-accuracy fix.
   */
  updateSelf(next: SelfLocation) {
    self = next;
    emit();
  },

  /**
   * Ask for permission (if not yet determined) and start foreground
   * location subscription + background location updates. Safe to call multiple times.
   */
  async start() {
    if (subscription) return;

    const existing = await Location.getForegroundPermissionsAsync();
    let status = existing.status;

    if (status !== "granted" && existing.canAskAgain) {
      const asked = await Location.requestForegroundPermissionsAsync();
      status = asked.status;
    }

    permission = status === "granted" ? "granted" : "denied";
    emit();

    if (permission !== "granted") {
      serviceState = "permission";
      emit();
      return;
    }

    const servicesEnabled = await Location.hasServicesEnabledAsync();
    if (!servicesEnabled) {
      serviceState = "servicesOff";
      emit();
      return;
    }

    serviceState = "on";
    emit();

    // Immediately get initial fix so we don't have to wait for watch callback on stationary devices
    Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    })
      .then((loc) => {
        const next: SelfLocation = {
          position: {
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
          },
          heading:
            loc.coords.heading != null && loc.coords.heading >= 0
              ? loc.coords.heading
              : null,
          speed: loc.coords.speed ?? null,
          timestamp: loc.timestamp || Date.now(),
        };
        self = next;
        emit();
      })
      .catch(() => {});

    subscription = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        distanceInterval: 3,
        timeInterval: 2000,
      },
      (loc) => {
        const next: SelfLocation = {
          position: {
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
          },
          heading:
            loc.coords.heading != null && loc.coords.heading >= 0
              ? loc.coords.heading
              : null,
          speed: loc.coords.speed ?? null,
          timestamp: loc.timestamp || Date.now(),
        };
        self = next;
        emit();
      },
    );

    // Silently check background permission state without forcing system settings
    Location.getBackgroundPermissionsAsync()
      .then((bg) => {
        backgroundPermission = bg.status === "granted" ? "granted" : "denied";
        emit();
        if (backgroundPermission === "granted") {
          void startBackgroundLocationUpdates();
        }
      })
      .catch(() => {
        backgroundPermission = "denied";
        emit();
      });
  },

  /**
   * Explicitly request background location permission ("Allow all the time").
   * Call this only when user opts in from UI/settings.
   */
  async requestBackgroundPermission(): Promise<boolean> {
    try {
      const existing = await Location.getBackgroundPermissionsAsync();
      if (existing.status === "granted") {
        backgroundPermission = "granted";
        emit();
        void startBackgroundLocationUpdates();
        return true;
      }

      if (!existing.canAskAgain) {
        return false;
      }

      const asked = await Location.requestBackgroundPermissionsAsync();
      backgroundPermission = asked.status === "granted" ? "granted" : "denied";
      emit();

      if (backgroundPermission === "granted") {
        void startBackgroundLocationUpdates();
        return true;
      }
      return false;
    } catch (err) {
      console.warn("[location] requestBackgroundPermission failed:", err);
      return false;
    }
  },

  /**
   * Re-check permission and service state, and (re)start the subscription
   * if needed. Safe to call after returning to the foreground.
   */
  async refresh() {
    const existing = await Location.getForegroundPermissionsAsync();
    permission = existing.status === "granted" ? "granted" : "denied";
    emit();

    if (permission !== "granted") {
      // Permission was revoked while backgrounded — stop the stale subscription.
      if (subscription) {
        subscription.remove();
        subscription = null;
      }
      void stopBackgroundLocationUpdates();
      serviceState = "permission";
      emit();
      return;
    }

    const servicesEnabled = await Location.hasServicesEnabledAsync();
    if (!servicesEnabled) {
      if (subscription) {
        subscription.remove();
        subscription = null;
      }
      void stopBackgroundLocationUpdates();
      serviceState = "servicesOff";
      emit();
      return;
    }

    serviceState = "on";
    emit();

    // Silently refresh background permission state
    try {
      const bg = await Location.getBackgroundPermissionsAsync();
      backgroundPermission = bg.status === "granted" ? "granted" : "denied";
      emit();
    } catch {}

    if (!subscription) {
      await locationStore.start();
    } else if (backgroundPermission === "granted") {
      void startBackgroundLocationUpdates();
    }
  },

  /** Stop the subscription and background updates. Does not revoke permission. */
  stop() {
    subscription?.remove();
    subscription = null;
    self = null;
    emit();
    void stopBackgroundLocationUpdates();
  },

  /** For testing — force a specific permission state. */
  _setPermission(next: LocationPermission) {
    permission = next;
    emit();
  },
};

// -------- hooks --------
export function useSelfLocation(): SelfLocation | null {
  return useSyncExternalStore(subscribe, getSelf, getSelf);
}
export function useLocationPermission(): LocationPermission {
  return useSyncExternalStore(subscribe, getPermission, getPermission);
}
export function useBackgroundPermission(): BackgroundPermission {
  return useSyncExternalStore(
    subscribe,
    getBackgroundPermission,
    getBackgroundPermission,
  );
}
export function useLocationServiceState(): LocationServiceState {
  return useSyncExternalStore(subscribe, getServiceState, getServiceState);
}

// Wire background fix updates to store without circular dependencies
setBackgroundFixHandler((loc) => locationStore.updateSelf(loc));
