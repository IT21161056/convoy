import type { Convoy, Member } from "@/types";

export function getSelf(convoy: Convoy | null): Member | undefined {
  if (!convoy) return undefined;
  return convoy.members.find((m) => m.id === convoy.selfId);
}

export function isSelf(convoy: Convoy | null, member: Member): boolean {
  return convoy?.selfId === member.id;
}

export function isHost(convoy: Convoy | null): boolean {
  return getSelf(convoy)?.isHost ?? false;
}

export function withSelfConnected(convoy: Convoy): Member[] {
  return convoy.members.map((m) =>
    m.id === convoy.selfId ? { ...m, status: "live" as const } : m,
  );
}
