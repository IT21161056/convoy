import { getItem, setItem, STORAGE_KEYS } from "@/services/storage";
import * as Crypto from "expo-crypto";

let cached: string | null = null;

export async function getMemberId(): Promise<string> {
  if (cached) return cached;

  const existing = await getItem<string>(STORAGE_KEYS.userIdentity);
  if (existing) {
    cached = existing;
    return existing;
  }

  const fresh = Crypto.randomUUID();
  await setItem(STORAGE_KEYS.userIdentity, fresh);
  cached = fresh;
  return fresh;
}
