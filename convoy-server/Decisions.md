Host leaving doesn't kick members — the server promotes a new host
You found a real bug in the server's handleLeave. Look at this block in convoy-server/src/handlers/convoy.ts:

ts
if (convoy.hostId === ref.memberId) {
const next = convoy.members[0];
next.isHost = true;
convoy.hostId = next.id;
}
That's the server promoting the next member to host when the host leaves. The comment said "so the convoy isn't orphaned" — but per spec §30, ending the convoy should terminate it for everyone, not hand over the keys.

The distinction between two actions was never wired up:

Leave convoy — the current user exits; if they're the host, the convoy should end (or transfer host, depending on product decision)

End convoy — the current user is the host, and the convoy is over for everyone

Right now both call convoyCommands.leave(), which emits convoy:leave. The server can't tell them apart.

The fix
Add a new event convoy:end and a corresponding client command. Handle it separately on the server:

convoy:leave — remove the caller. If they were the host, still promote the next member (for the "host walks out of a group they created" case). This is what the server does today.

convoy:end — the caller must be the host. Broadcast convoy:ended to the room. Then delete the convoy. Every member receives the event and navigates away.

Then the client side wires End convoy to convoy:end and Leave convoy to convoy:leave.

Files to change
convoy-server/src/types.ts — add CONVOY_END and CONVOY_ENDED event names, add EndConvoyPayload type

convoy-server/src/handlers/convoy.ts — add the CONVOY_END handler; separate handling from leave

convoy-server/src/index.ts — nothing (already registers registerConvoy)

src/services/socket/events.ts — mirror the new event names and types

src/features/convoy/commands.ts — add convoyCommands.end() that emits convoy:end

src/features/convoy/useConvoy.ts — nothing (state is already per-client)

src/features/convoy/useConvoyEnded.ts (new) — a hook that listens for convoy:ended and clears local state + navigates to Welcome

src/app/\_layout.tsx — mount the new hook

src/app/(convoy)/settings.tsx — handleEnd should call convoyCommands.end() instead of convoyStore.end() + convoyCommands.leave()

src/app/(convoy)/lobby.tsx — same change if it has an End action

Send me the current contents of:

convoy-server/src/types.ts

convoy-server/src/handlers/convoy.ts

src/services/socket/events.ts

src/features/convoy/commands.ts

src/app/(convoy)/settings.tsx (we've already got a version, but confirm the current one)

I'll return fixed versions of each. Total is about 8 files.

While we're at it — two related decisions
Decision 1 — When the host taps Leave convoy (not End), what should happen?
Three options:

A) Promote the next member to host. Convoy keeps going. (Current behavior — but per your report, this isn't what you want for End. It might still be right for Leave.)

B) End the convoy for everyone, same as End convoy. Simplest.

C) Show the host a dialog: "Leave and promote someone else?" or "End convoy for everyone?"

I'd recommend A for Leave and reserve B for End. That keeps the two actions meaningfully different:

Host taps Leave → they walk away, group continues.

Host taps End → trip is over, everyone's out.

Decision 2 — When the host ends the convoy, should non-host members see a dialog or a toast?
Something like:

Convoy ended
The host ended the convoy.

with a single OK that takes them to Welcome. Or a toast + auto-redirect. Toast is less jarring.

I'd suggest toast + navigate to Welcome. Same pattern as ChatDrawer's empty state — the app tells you what happened and moves you on.

If you don't want to build the full end event yet
The smallest possible fix: keep the current convoy:leave flow but stop promoting on the server when the host leaves. Change:

ts
if (convoy.hostId === ref.memberId) {
const next = convoy.members[0];
next.isHost = true;
convoy.hostId = next.id;
}
to:

ts
if (convoy.hostId === ref.memberId) {
// Host left — end the convoy for everyone.
io.to(roomOf(convoy.id)).emit(EVENTS.CONVOY_ENDED, { reason: 'host_left' });
convoys.delete(convoy.id);
return;
}
But this means "Leave" and "End" become the same thing for the host. That's simpler, and matches the behavior you just described as desired. The downside is you lose the "host walks away but group continues" case — which, honestly, most convoys probably don't need.

My recommendation: go with the full convoy:end event. It's not much more code, and it leaves the door open for host handover later if you ever want it.

Send the files and I'll write the batch.

[STOPED here --> Part 3 — End-convoy broadcast]
