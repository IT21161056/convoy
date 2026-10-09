# AGENTS.md — Convoy (SE5070 Enterprise Mobility)

Instructions for AI coding agents working in this repository. Read this file and `design.md` before making changes. `design.md` is the source of truth for product behaviour; this file defines how to build it.

---

## 1. Project summary

Convoy is a mobile road-trip coordination app. Users start or join a convoy, then see everyone on a live map, talk with push-to-talk (PTT), and chat. It must keep working when the network drops and sync when it returns.

This is a university assignment (individual, 30%, due **18 Oct 2026**). The student must understand and defend every line in a live viva with live coding. Write code the student can explain.

Features in scope: convoy create/join (code + QR), lobby, live map, member status and lost-member handling, PTT, chat, settings, offline sync.

**Out of scope — do not add:** social features, profiles, turn-by-turn navigation, a generic five-tab layout.

---

## 2. Assignment requirements (must all be met)

Every change should move toward these. Do not remove or weaken any of them.

1. **Compile-to-native framework:** React Native with Expo and Expo Router.
2. **Backend service:** custom Node.js + Socket.IO server in `convoy-server/`.
3. **Offline capability with sync-back:** local-first, outbox, resync on reconnect (see section 6).
4. **Constraint design algorithms and principles:** adaptive location sampling, small payloads, thresholds, backoff, bounded buffers (see section 7).
5. **Native hardware:** GPS (required), camera for QR scanning, microphone for PTT; compass/gyro heading and haptics optional.
6. **Custom components built by the student:** `HoldToTalkButton`, `ConvoyMemberMarker`, `ConnectionStatusPill` (see section 8).
7. **Documentation support:** keep the decision records, AI usage log, and failure log up to date (see section 10).

Grading weights: idea and documentation 15%, implementation solidity 50% (structure, data flow, offline, constraints, completeness, live coding), UX and custom components 20%, presentation 15%. Prioritise a working offline/sync implementation and clear data flow over extra features.

---

## 3. Tech stack

| Area | Choice |
|---|---|
| App | React Native, Expo, Expo Router, TypeScript |
| Backend | Node.js, Socket.IO (`convoy-server/`) |
| Local storage | SQLite (`expo-sqlite`) for convoy, members, messages, outbox; small key-value store for session/settings |
| Maps | A free/no-cost map option (decide and record in a decision record) |
| Tooling | Free or no-cost only. Do not add paid services or API keys that require billing |

Use TypeScript with strict typing. Do not add a new dependency without a short reason; prefer Expo-supported packages.

---

## 4. Commands

Adjust if the repository scripts differ; check `package.json` first.

```bash
# App
npm install
npx expo start            # dev server
npx expo start --android  # Android
npx expo start --ios      # iOS (macOS only)

# Server
cd convoy-server
npm install
npm run dev               # or: node src/index.js

# Quality
npm run lint
npx tsc --noEmit
```

Run lint and type-check before declaring a task done.

---

## 5. Architecture rules

Follow the layers in `design.md` section 26.

```text
UI (app/ screens, src/components)
   ↓ hooks
Feature layer (src/features/*)
   ↓
Services (src/services/*)
   ↓
Local data layer (src/db) + Native device layer
   ↕ Socket.IO
convoy-server
```

Rules:

- **Screens never call sockets or device APIs directly.** They use feature hooks.
- **Screens read only from the local store**, never directly from network responses.
- Incoming socket events go through the sync service into the local DB; the UI updates from the DB.
- Routes in `app/` contain screens only; logic lives in `src/features` and `src/services`.
- Keep geo maths, backoff, and time helpers as small pure functions in `src/utils` so they are testable and easy to explain.

Target structure:

```text
app/                    Expo Router routes
src/
  components/           Reusable and custom UI components
  features/
    convoy/  location/  chat/  ptt/  members/
  services/             socket, sync, audio, location, storage
  db/                   schema, queries, migrations
  theme/                colours, typography, spacing
  utils/                geo, backoff, time
convoy-server/          Node.js + Socket.IO backend
```

---

## 6. Offline and sync (core requirement)

Implement exactly this model; do not replace it with ad-hoc caching.

- **Local-first:** UI reads only from local DB.
- **Outbox:** every action that must reach the server is written to the local outbox first, then sent. Item shape: `{ clientId, type, payload, createdAt, attempts }`.
- **Idempotency:** server de-duplicates by `clientId`.
- **Ordering:** server assigns a per-convoy sequence number to chat and membership events; the client stores `lastSeq`.
- **Reconnect flow:**
  1. Socket reconnects with exponential backoff and jitter.
  2. Client flushes the outbox oldest first.
  3. Server acknowledges with server seq.
  4. Client sends `sync { convoyId, lastSeq }`.
  5. Server returns missed events plus the latest location snapshot per member.
  6. Client merges into local DB and updates `lastSeq`.
- **Conflict rules:** location is last-write-wins by device timestamp; chat is ordered by server seq (pending messages shown last); membership is server-authoritative.

Behaviour while offline:

| Feature | Behaviour |
|---|---|
| App start | Restore convoy, members, chat from local DB |
| Map | Show last known positions marked stale with age; own GPS marker keeps updating |
| Own location | Buffer a capped trail; send latest first on reconnect, then the batch |
| Chat | Show immediately as pending; sync later; states: pending, sent, failed (tap to retry) |
| PTT | Disabled with "No connection – can't transmit"; never queued |
| Create / join convoy | Requires connection; show a clear message |

Connection status shown to the user derives from socket health (heartbeat), not only the OS network flag.

---

## 7. Constraint design (core requirement)

Implement and keep these visible in code (named functions and constants) so they can be explained in the viva. Values are initial and must be recorded when changed.

- **Adaptive location sampling:** faster while moving fast, slower when slow or stationary; only publish when moved a minimum distance or a maximum time has passed.
- **Compact location payload:** `{ lat, lng, heading, speed, ts }`, rounded coordinates, sent only to the convoy room.
- **Marker interpolation** between updates.
- **Haversine distance** and **ahead/behind** via projection onto heading; **convoy order** by projection along the leader's direction of travel.
- **Stale/lost thresholds** derived locally from `lastSeenAt`: live < 10 s, delayed 10–30 s, stale 30–120 s, lost > 120 s.
- **Exponential backoff with jitter** for reconnect and outbox retry.
- **Bounded buffers:** capped offline trail (~200 points, down-sampled), capped local chat history per convoy.
- **PTT limits:** max clip length ~30 s, compressed audio, delivery TTL ~60 s; expired clips are dropped. PTT is clip-based, not a continuous stream.
- **Driver-safe UI:** touch targets ≥ 48 dp, no text under 14 sp on the driving screen, status never conveyed by colour alone, no multi-step flows on the main screen.

Put tunable values in one constants file (e.g. `src/utils/constants.ts`).

---

## 8. Custom components

Build these by hand (no copied component code). Each needs typed props and events, and a short comment block describing them (the viva asks for properties and events).

**`HoldToTalkButton`**
- Props: `state: 'idle' | 'recording' | 'disabled' | 'sending'`, `maxDurationMs`, `disabledReason?`, `size?`
- Events: `onPressStart`, `onPressEnd`, `onLimitReached`, `onCancel`
- Behaviour: recording timer and pulse while held, haptic feedback, ignores presses when disabled.

**`ConvoyMemberMarker`**
- Props: `name`, `isSelf`, `status: 'live' | 'delayed' | 'stale' | 'lost'`, `heading?`, `lastSeenAt`
- Events: `onPress`

**`ConnectionStatusPill`**
- Props: `status`, `connectedCount`
- Events: `onPress?`
- Text: `5 connected`, `Connection unstable`, `Reconnecting…` (no technical wording like "Socket.IO").

Other third-party UI libraries are allowed for ordinary controls, but these custom components must stay hand-written.

---

## 9. UI and UX rules

- Follow `design.md` sections 5 and 12–13 for palette, typography, and layout.
- Dark night-drive console style. Barlow Condensed for headlines, IBM Plex Sans for body. Sentence case.
- Palette: background `#10131A`, panel `#1A2029`, raised `#212836`, divider `#2B3242`, accent `#F5A623`, connected `#3DDC97`, alert `#FF5A5F`, text `#EDEFF3`, muted `#8791A6`. Use theme tokens, not hard-coded hex values in components.
- Main screen is map-first with PTT large and central; chat and members open as bottom sheets; settings are secondary.
- Never show placeholder or fake users in the UI.
- Ask permissions in context with a short reason; handle denied states without crashing; never silently hide a member whose location is unavailable.

Screens: Splash, Welcome, Create Convoy, Join (code + QR), Lobby, Main Map, Member sheet, Chat sheet, Settings.

---

## 10. Required logging for the assignment

The submission must document AI usage, prompts, and failures. Maintain these files and update them as work happens.

- `docs/decisions.md` — decision records (`DR-00X`: context, options, decision, consequences). Existing: DR-001 convoy-centred navigation, DR-002 custom Socket.IO backend, DR-003 local-first with outbox, DR-004 PTT not queued offline, DR-005 create/join needs connection.
- `docs/ai-log.md` — for each substantial AI-assisted change: date, task, the prompt the student used (verbatim), what the AI produced, what was wrong, and the final fix.
- `docs/failures.md` — date, symptom or error message, cause, fix, lesson.

**Agent duties:**
- When making a non-trivial design choice, add or propose a decision record.
- When something fails (build error, runtime bug, wrong approach), propose a failure-log entry with the real error text.
- Do not invent or backfill prompts or errors that did not happen. Log only what actually occurred; if unsure, leave a TODO for the student.

---

## 11. Code of conduct and originality

- Do not copy existing codebases, tutorial projects, or readily available logic. Write code from the design.
- Assets (icons, images, sounds) must be self-made or properly licensed; list any third-party asset in `docs/assets.md`.
- Do not paste large unexplained blocks. Prefer small, readable functions with clear names.
- If code is adapted from a library's documented example, keep it minimal and note it in the AI log.

---

## 12. Working style for agents

1. Read `design.md` and the relevant feature folder before editing.
2. Make small, focused changes; one feature or fix per change.
3. Keep logic simple enough for the student to re-implement a piece live in under a few minutes (viva live-coding).
4. Add short comments explaining *why* for sync, sampling, threshold, and ordering logic.
5. Do not change the architecture layers, offline model, or scope without asking the student and recording a decision.
6. Never expose secrets; use environment variables and an `.env.example`.
7. After changes, run lint and type-check, then summarise what changed and which assignment requirement it supports.

---

## 13. Definition of done

A feature is done when:

- It works on a real device or emulator, including with the network off and back on.
- UI reads from the local store and follows the layer rules.
- Edge states are handled: permission denied, no GPS, offline, reconnecting.
- Constants and thresholds live in one place and are documented.
- Lint and type-check pass.
- Decision record, AI log, and failure log are updated where relevant.
- The student can explain the data flow and re-implement a small part of it.

## 14. Priority order if time runs short

1. Convoy create/join, lobby, live map with member markers
2. Offline outbox and sync (chat and location)
3. Constraint algorithms (sampling, stale detection, backoff)
4. Custom components (`HoldToTalkButton` first)
5. QR scanning and PTT polish
6. Screenshots, documentation, viva preparation
7. Stretch: deep links, background location, map tile caching