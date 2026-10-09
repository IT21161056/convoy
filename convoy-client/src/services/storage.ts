import AsyncStorage from "@react-native-async-storage/async-storage";

export const STORAGE_KEYS = {
  userIdentity: "convoy.userIdentity",
  userName: "convoy.userName",
} as const;

export async function getItem<T>(key: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (raw == null) return null;
    return JSON.parse(raw) as T;
  } catch (err) {
    // Corrupt or non-JSON data — treat as absent.
    console.warn(`[storage] failed to read ${key}`, err);
    return null;
  }
}

export async function setItem<T>(key: string, value: T): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.warn(`[storage] failed to write ${key}`, err);
  }
}

export async function removeItem(key: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(key);
  } catch (err) {
    console.warn(`[storage] failed to remove ${key}`, err);
  }
}

/** Clear everything. Useful for a debug "reset app" action later. */
export async function clearAll(): Promise<void> {
  try {
    await AsyncStorage.multiRemove(Object.values(STORAGE_KEYS));
  } catch (err) {
    console.warn("[storage] failed to clear", err);
  }
}
