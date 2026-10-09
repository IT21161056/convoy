# Decision Record: DR-004 Server Monotonic Sequence Numbers & Delta Sync Protocol

- **Status**: Accepted
- **Date**: 2026-10-06
- **Context**: SE5070 Enterprise Mobility offline synchronization & conflict resolution (DESIGN.md §14.3, §26; GEMINI.md §14)

---

## Context

When mobile clients experience intermittent connectivity (cellular dead zones, tunnels, signal handoffs), they temporarily stop receiving real-time events. Upon reconnecting, simply refetching the entire convoy state or re-requesting all history incurs unnecessary data usage and battery drain, violating the mobile constraint design principles (DESIGN.md §15.1).

The assignment requirements dictate:
1. Ordered chat delivery without message loss or duplicates.
2. Efficient resynchronization of missed events since disconnection.
3. Defendable conflict resolution rules for location and messaging.

---

## Options Considered

1. **Option A: Full Convoy Snapshot Reload on Reconnect**
   - *Pros*: Simple to implement.
   - *Cons*: High bandwidth consumption; re-transmits already known messages; wipes optimistic pending messages; causes visible UI flicker.

2. **Option B: Distributed Conflict-Free Replicated Data Types (CRDTs)**
   - *Pros*: Fully decentralized conflict resolution.
   - *Cons*: Extreme complexity, high memory footprint, impossible to defend line-by-line during a 20-minute university viva.

3. **Option C: Monotonic Integer Sequence (`seq`) + Delta Resync Protocol (Selected)**
   - *Pros*:
     - Monotonically increasing sequence number per convoy (`convoy.seq`).
     - Bounded ring buffer on server (capped at 500 items).
     - Client stores `last_seq` cursor in SQLite.
     - Delta request (`{ convoyId, lastSeq }`) returns only missed events (`seq > lastSeq`) plus the latest location snapshot.
     - Client-side de-duplication via unique `clientId` prevents double-posting during reconnection retry bursts.
     - Clean, intuitive conflict resolution:
       - **Location**: Last-write-wins by device timestamp ($ts$).
       - **Chat**: Monotonic server sequence order ($seq$).
       - **Membership**: Server authority.

---

## Decision

Implement the monotonic delta sync protocol across `convoy-server` and `convoy-new`:
1. Server assigns sequential `seq` to all chat events and acknowledges writes with `{ ok, clientId, seq, id }`.
2. Server maintains an in-memory Set of processed `clientId`s to guarantee idempotent processing.
3. Server registers `sync` event returning missed events where `seq > lastSeq` along with current member locations.
4. Client `deltaSync` merges missed messages into SQLite and updates `convoyStore` member positions respecting timestamp precedence.
5. Client advances `last_seq` in SQLite.

---

## Trade-offs & Consequences

- Minimum mobile data consumption: Reconnecting devices only download what was missed while offline.
- Total ordering: Chat messages appear in the exact order assigned by the server, regardless of client transmission order or network packet interleaving.
- Verifiable & Defendable: 100% verified via automated end-to-end integration test (`test_sync_protocol.mjs`).
