# Decision Record: DR-003 SQLite Local Data Layer & Outbox Sync Pattern

- **Status**: Accepted
- **Date**: 2026-10-06
- **Context**: SE5070 Enterprise Mobility offline requirement (DESIGN.md §14, §26; GEMINI.md §3, §14)

---

## Context

Mobile convoy coordination occurs in environments with intermittent cellular connectivity (tunnels, rural highways, remote roads). The grading rubric allocates 50% to implementation solidity, emphasizing offline capabilities and clear data flow:
1. The app must start up and render active convoy state and recent chat history even when completely offline.
2. User actions while offline (such as sending messages) must not be lost.
3. The UI must display honest delivery states (`pending ⏳`, `sent`, `failed`).
4. Reconnection must flush pending items oldest-first without duplicate server entries.

---

## Options Considered

1. **Option A: Pure Key-Value Storage (AsyncStorage only)**
   - *Pros*: Simple API.
   - *Cons*: Poor relational indexing; full JSON string serialization for every message append; cannot run transactional atomic operations or efficient bounded FIFO queries for outbox items.

2. **Option B: Heavyweight Mobile ORM (WatermelonDB / TypeORM / Realm)**
   - *Pros*: Built-in sync plugins.
   - *Cons*: Heavy bundle size, complex foreign native dependencies, difficult to explain line-by-line during a live viva defense; violates the principle of student-defendable code.

3. **Option C: Native `expo-sqlite` with hand-written typed Repositories and Outbox Pattern (Selected)**
   - *Pros*:
     - Synchronous high-performance SQLite engine with Write-Ahead Logging (`PRAGMA journal_mode = WAL;`) and relational cascade constraints (`PRAGMA foreign_keys = ON;`).
     - Zero third-party ORM bloat; 100% hand-crafted SQL queries that can be defended directly in the viva.
     - Strict separation of layers: `UI (ChatDrawer) → Feature (chatStore, chatCommands) → Services (outboxSync) → Database (chatRepo, outboxRepo)`.
     - Durable Outbox table with `client_id` primary key ensures idempotent server delivery.

---

## Decision

Adopt `expo-sqlite` with three dedicated repository modules:
1. `convoyRepo`: Stores active convoy snapshot, settings, and member locations with transactional multi-row upserts.
2. `chatRepo`: Stores chat messages with delivery status (`pending`, `sent`, `failed`) and server sequence numbers (`seq`).
3. `outboxRepo`: Durable FIFO queue storing mutations with client IDs, payloads, attempt counters, and error tracking.

Integrate `outboxSync` to coordinate reactive pending counts (`useOutboxPendingCount`) and automatic oldest-first flushing when the Socket.IO connection transitions to `connected`.

---

## Trade-offs & Consequences

- Driver console displays real-time pending outbox badges via `ConnectionStatusPill` (`"Offline (3 pending)"` or `"5 connected · 1 sync"`).
- Outgoing chat messages render optimistically with a subtle `⏳ pending` badge until server acknowledgment.
- App startup restores active convoy and messages instantly without network latency.
