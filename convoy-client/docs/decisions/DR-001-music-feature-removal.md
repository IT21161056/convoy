# Decision Record: DR-001 Removal of Music Streaming & Shared Queue

- **Status**: Accepted
- **Date**: 2026-10-06
- **Context**: SE5070 Enterprise Mobility individual assignment constraints

---

## Context

Early drafts of Convoy included a group music streaming / shared queue feature. However, the assignment requirements prioritize enterprise mobility core competencies:
1. Low-power location tracking & constraint design (battery, speed-adaptive sampling).
2. Offline resilience and bidirectional outbox synchronization.
3. Push-to-talk (PTT) over Socket.IO / WebSockets.
4. Native hardware sensor integration (accelerometer hard-brake detection, GPS).

A music streaming feature increased protocol complexity, added unnecessary background audio session conflicts with Push-to-Talk, and diverted focus from the strict evaluation criteria.

---

## Options Considered

1. **Option A: Retain Music feature as a secondary tab**
   - *Pros*: Extra feature to demo.
   - *Cons*: Complicated audio ducking/focus against PTT audio recording/playback; added dead code and state synchronization burden; not part of core rubric.
2. **Option B: Complete purge across client and server (Selected)**
   - *Pros*: Codebase stays simple, clean, and easily defendable in the live viva; prevents accidental bugs in socket lifecycle; frees UI real estate for safety and chat controls.
   - *Cons*: Removed multimedia novelty.

---

## Decision

Completely remove all music streaming, DJ permissions, and playback state from both `convoy-server` and `convoy-new`. Replace welcome screen highlighting with "Safety alerts".

---

## Trade-offs & Consequences

- Simplified Socket.IO payload contract (`convoy:snapshot`, `settings:update`).
- Unblocked clean audio focus for Push-to-Talk recording and playback via `expo-audio`.
- Codebase is 100% compliant with the negative constraints in `GEMINI.md`.
