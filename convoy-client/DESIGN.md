@AGENTS.md

# Convoy Mobile App — Design Decisions

> SE5070 Enterprise Mobility — Individual assignment (30%), due 18 October 2026.
> Deliverables: project document (Moodle) + GitHub link + live viva (mandatory, max 20 min, includes live coding defense).

---

## 1. Assignment context

### 1.1 Project area calculation

The project area is derived from the index number:

```text
Index number      : <YOUR INDEX NUMBER>
Digit sum         : <d1 + d2 + ... + dn> = <SUM>
SUM mod 5         : <RESULT>
Assigned area     : <see table>
```

| Result | Area |
|---|---|
| 0 | Edtech |
| 1 | Entertainment |
| 2 | Sustainability & GreenTech |
| 3 | Artificial Intelligence |
| 4 | HealthTech |

> Fill this in before writing the document. The calculation must appear in the submission.

### 1.2 Domain framing for Convoy

The core product (live convoy map, push-to-talk, chat, member status) stays the same for every area. What changes is the angle used to justify the idea and which features are emphasised in the document and viva.

| Area | Angle | Feature to emphasise |
|---|---|---|
| Entertainment | Shared road trips as a group experience; keeps friends connected and engaged without phone-juggling | PTT banter, group chat, shared trip experience |
| Sustainability & GreenTech | Staying together reduces wrong turns, unnecessary stops, and repeated rerouting; battery- and data-efficient design reduces energy use | Adaptive location sampling, low-data design |
| Artificial Intelligence | Smart convoy awareness | Predicting who is falling behind or lost from movement trends (see 15.5) |
| HealthTech | Driver safety and fatigue reduction | Hands-free interaction, driver check-in prompts, SOS to convoy (see 15.6) |
| Edtech | Field-trip or driving-school group coordination | Instructor/leader role, guided convoy order |

Pick the row matching section 1.1 and keep the other rows out of the submitted document.

### 1.3 Assignment requirements → where covered

| Requirement | Section |
|---|---|
| Any compile-to-native framework | 3 |
| Backend service interaction | 3, 26 |
| Offline support + sync back | 14 |
| Constraint design algorithms and principles | 15 |
| Native hardware integration (Camera, GPS, Gyro) | 16 |
| One or more student-built custom components | 17 |
| Architecture, data flow, source structure | 26 |
| UI/UX flow with screenshots | 18 |
| Decision records and failure logs, AI prompts | 19 |
| Viva and live coding preparation | 20 |
| Code of conduct | 21 |

---

## 2. Product concept

Convoy is a mobile-first road-trip coordination app for groups of people travelling together.

The core concept is the Convoy. Once a user starts or joins a convoy, the map becomes the main operating screen and the other features — live locations, member information, push-to-talk, and chat — are organised around the current convoy.

The app should feel like a driving road-trip console, not a generic social or SaaS application.

### 2.1 Why the idea is worthwhile

- Group road trips regularly suffer from vehicles getting separated, missed turns, and unsafe phone calls or texting while driving.
- General messaging apps are not built for glanceable, hands-free use in a moving vehicle.
- Mobile coverage on highways and rural routes is unreliable, so the app must tolerate poor connectivity rather than fail when it drops.
- Convoy combines live location, one-touch voice, and lightweight chat in a single convoy-scoped experience.

### 2.2 Scope

In scope:

- Convoy creation, joining (code and QR), lobby
- Live map with member markers and convoy order line
- Member status and lost-member handling
- Push-to-talk voice
- Group chat
- Offline-first behaviour with sync
- Convoy settings

Out of scope (decided):

- Social features, profiles, friend lists
- Turn-by-turn navigation

---

## 3. Platform and technology direction

The application is a React Native mobile application built with Expo and Expo Router, interacting with a custom Node.js backend using Socket.IO (`convoy-server`). The earlier web-prototype stage is no longer the target; the assignment requires a mobile app.

Tooling should remain free or no-cost.

Backend choice rationale (record final reasoning in DR-002):

- Real-time bidirectional events (location, chat, PTT signalling) fit Socket.IO well.
- A custom backend gives full control over the sync protocol, which is the main subject of the offline requirement.

Local storage:

- A local database (e.g. SQLite via `expo-sqlite`) holds the convoy snapshot, members, chat messages, and the outbox.
- Small key-value items (session id, device id, settings) can use a key-value store.

---

# 4. Core product principles

## 4.1 The convoy is the central concept

All real-time features belong to the current convoy:

- Live map
- Convoy members
- Member status
- Member connections
- Push-to-talk
- Group chat
- Convoy settings
- Invitations

## 4.2 Map-first experience

The map is the main screen after joining or starting a convoy.

The user should immediately understand:

- Where they are
- Where other convoy members are
- Who is connected
- Who may have stopped sending their location
- The approximate relationship between convoy members

## 4.3 Minimal interaction while driving

The primary driving screen focuses on:

1. Map
2. Push-to-talk
3. Quick access to chat
4. Quick access to members

Detailed settings and secondary information stay behind secondary screens or bottom sheets.

## 4.4 No fake or static convoy data

The UI displays actual connected members and real convoy state. Placeholder users such as "Alex" or "James" must not appear in the production UI unless they represent real connected users.

## 4.5 Local-first

The UI always reads from local state. The network only updates local state; it is never read directly by screens. This is what makes offline behaviour consistent (see section 14).

---

# 5. Visual direction

Dark night-drive console style.

| Purpose | Color |
|---|---|
| Background / ink | `#10131A` |
| Panel | `#1A2029` |
| Raised surface | `#212836` |
| Divider / hairline | `#2B3242` |
| Primary accent / amber | `#F5A623` |
| Connected / signal green | `#3DDC97` |
| Alert / error red | `#FF5A5F` |
| Primary text | `#EDEFF3` |
| Muted text | `#8791A6` |

### Typography

- Barlow Condensed for branding, headlines, and section titles
- IBM Plex Sans for body text, inputs, chat, and functional UI

Use sentence case rather than artificial all-caps.

### Driving-safe UI rules

- Touch targets at least 48 dp; the PTT control is much larger.
- High contrast; no text smaller than 14 sp on the driving screen.
- No flows on the driving screen that need more than one tap, except PTT (hold).
- Status is communicated by colour **and** icon/text, not colour alone.

---

# 6. Application flow

```text
Open App
    ↓
Splash Screen
    ↓
Welcome Screen
    ├── Start a Convoy
    │       ↓
    │   Create Convoy
    │       ↓
    │   Convoy Lobby
    │
    └── Join a Convoy
            ├── Enter Convoy Code
            └── Scan QR Code (camera)
                    ↓
               Convoy Lobby
                    ↓
              Main Convoy Map
```

If a user already belongs to an active convoy, the app restores that convoy after startup instead of forcing create or join again. Restoration reads from local storage, so it works offline.

---

# 7. Splash screen

Short and functional.

```text
        [ CONVOY ]

      Stay together.
      Drive together.
```

Practical purpose:

- Restore local session and convoy state from local storage
- Check whether the user is already associated with a convoy
- Initialise required services (socket, location, local DB)
- Check whether required permissions are already granted

```text
Open
 ↓
Splash
 ↓
Restore existing convoy (local)
 ├── Yes → Convoy Map (then reconnect in background)
 └── No  → Welcome
```

---

# 8. Welcome screen

```text
CONVOY

Stay together on the road.

• Live location
• Push to talk
• Group chat
• Works when signal drops

[ Start a Convoy ]

[ Join a Convoy ]
```

No map here; the user has not joined a convoy yet.

---

# 9. Start a Convoy flow

```text
Create Convoy

Your name
[ Anoj ]

Convoy name
[ Weekend Road Trip ]

[ Create Convoy ]
```

After creation the user becomes the convoy host and receives a shareable invitation:

```text
Your convoy is ready!

Weekend Road Trip

8K4P7

[ Share Invite ]

[ Show QR Code ]
```

- The code is issued by the server, so creating a convoy requires a connection. If offline, show: "You need a connection to start a convoy."
- The QR code encodes the convoy code and is rendered on-device.
- A deep link (tap to open the app) is a stretch goal after the code and QR flows work.

---

# 10. Join a Convoy flow

### Method A — Invite link (stretch)

```text
Invite Link → Convoy App → Join Weekend Road Trip → [ Join ]
```

### Method B — Convoy code / QR code

```text
Join a Convoy

[ Scan QR Code ]

or

[ Enter Convoy Code ]

[ 8K4P7 ]

[ Join ]
```

QR scanning uses the device camera (section 16). Joining needs a connection because the server validates the code.

---

# 11. Convoy lobby

```text
Weekend Road Trip

5 members

● Anoj       Host
● Kasun
● Nimal
● Ravi
● Sarah

Ready to go

[ Start Convoy ]
```

The host can start the convoy. Non-host users see "Waiting for host…".

---

# 12. Main convoy screen

```text
┌──────────────────────────────┐
│ ← Weekend Road Trip      ⋮   │
│   ● 5 connected              │
├──────────────────────────────┤
│                              │
│            MAP               │
│                              │
│       ●──────●               │
│       │                      │
│         ●    ●               │
│                              │
│                       ◎      │
├──────────────────────────────┤
│  ● You  ● Kasun  ● Nimal     │
├──────────────────────────────┤
│                              │
│             🎙               │
│        HOLD TO TALK          │
│                              │
├──────────────────────────────┤
│    💬 Chat       👥 Members  │
└──────────────────────────────┘
```

The map dominates the screen.

---

# 13. Map, members, and status

## 13.1 Live map behaviour

Every connected member has a live location marker communicating:

- Name
- Current location
- Online state (live / delayed / stale / lost)
- Direction of travel where available (marker rotates with heading)

The current user has a visually distinct marker. The map updates as new location information arrives, and marker movement is interpolated between updates (see 15.4). A recenter control returns the map to the user's position.

## 13.2 Member strip

A compact horizontal strip below the map:

```text
┌────┐ ┌──────┐ ┌──────┐ ┌────┐
│ 🟢 │ │ 🟢   │ │ 🟢   │ │ 🟢 │
│You │ │Kasun │ │Nimal │ │Ravi│
└────┘ └──────┘ └──────┘ └────┘
```

Tapping a member opens a lightweight member-detail sheet.

## 13.3 Member details

```text
Kasun

● Connected

🚗 350 m ahead

Last update
2 seconds ago

[ Focus on Map ]
```

Keep it lightweight; no social-profile content.

## 13.4 Convoy connections on the map

Do not draw a line from every member to every other member. Draw a single subtle line through members in **convoy order**:

```text
1. Anoj
2. Kasun
3. Nimal
4. Ravi
5. Sarah
```

How the order is determined is described in 15.5.

## 13.5 Relative distance

Show approximate relative position rather than raw coordinates:

```text
Kasun   350 m ahead
Nimal   1.2 km behind
```

## 13.6 Lost-member handling

Distinguish between:

- User intentionally left
- User is connected but has no recent GPS update
- User's connection was lost

```text
⚠ Ravi

Location unavailable

Last seen 42 sec ago
```

A stale member is drawn differently from an active one (faded marker with a "last seen" label). Missing location data is never presented as proof that someone left.

---

# 14. Offline access and sync

This section is a primary assignment requirement. The app must keep working when connectivity drops and sync data back when coverage returns.

## 14.1 Principles

- **Local-first:** screens read only from the local store.
- **Outbox pattern:** every user action that must reach the server is written to a local outbox first, then sent.
- **Idempotent writes:** each outbox item carries a client-generated id; the server ignores duplicates.
- **Server-assigned ordering:** the server assigns a per-convoy sequence number to chat and membership events.
- **Honest UI:** the user always sees whether a message is pending, sent, or failed.

## 14.2 Behaviour by feature

| Feature | While offline | On reconnect |
|---|---|---|
| App start / restore | Restores convoy, members, and chat from local DB | Reconnects in background |
| Map | Shows last known member positions, marked stale with age; own GPS marker keeps updating (GPS does not need data) | Fresh positions replace stale ones |
| Own location | Buffered locally as a capped trail | Latest position sent immediately, trail sent as a batch |
| Chat | Message appears instantly as "pending" (optimistic) and is stored in the outbox | Outbox flushes in order; messages become "sent" |
| Push-to-talk | Disabled with "No connection – can't transmit". Not queued, because stale voice is useless | Re-enabled |
| Members / lobby | Last known list shown with "may be out of date" | Re-synced |
| Create / join convoy | Not available (needs server validation); clear message shown | Normal |
| Settings | Viewable; changes that need the server are queued where safe | Applied |

## 14.3 Sync protocol

```text
1. Socket reconnects (with backoff)
2. Client flushes outbox (oldest first)
     each item: { clientId, type, payload, createdAt }
3. Server de-duplicates by clientId and acknowledges with server seq
4. Client sends sync request: { convoyId, lastSeq }
5. Server replies with events missed after lastSeq
     + latest location snapshot for every member
6. Client merges into local DB and updates lastSeq
```

Conflict rules:

- Location: last-write-wins by device timestamp; older updates are dropped.
- Chat: ordered by server sequence; pending local messages are shown at the bottom until acknowledged.
- Membership: server is the source of truth.

## 14.4 Connectivity detection

Combine OS network state with socket health (heartbeat/ping). The OS may say "connected" while the socket is dead on weak signal, so the UI status derives from the socket, not the OS flag alone.

---

# 15. Constraint design algorithms and principles

The app runs on a moving phone with limited battery, intermittent and costly data, a small screen, and a user who must not be distracted. The design is shaped by those constraints.

## 15.1 Constraints and principles

| Constraint | Principle applied |
|---|---|
| Battery | Adaptive GPS sampling; avoid constant high-accuracy polling when stationary |
| Data usage | Compact payloads; send only when position meaningfully changes; capped voice clip length |
| Unreliable network | Local-first, outbox, retry with backoff, resync by sequence |
| Small screen / glance use | Map-first layout; large controls; limited text |
| Driver attention | One-touch/hold interactions; no typing required to communicate (PTT) |
| Memory / CPU | Bounded local buffers; limited trail points; lightweight markers |
| Privacy | Location shared only inside the convoy; sharing stops when convoy ends or user leaves |

## 15.2 Adaptive location sampling

Update frequency depends on speed and movement. Initial values (tunable, record final values in a DR):

| State | Condition | Sampling |
|---|---|---|
| Moving fast | speed > ~15 m/s | every ~3 s |
| Moving slow | ~2–15 m/s | every ~5 s |
| Stationary | < ~2 m/s | every ~15–30 s |

Only publish when the position moved more than a minimum distance or a maximum time elapsed, whichever comes first.

## 15.3 Reduced payload

Location message example:

```text
{ lat, lng, heading, speed, ts }   // fixed small fields, rounded precision
```

Coordinates rounded to ~6 decimals; no redundant fields; server fans out only to the convoy room.

## 15.4 Marker smoothing

Between updates, markers are interpolated toward the new position over a short duration, so the map looks continuous even with sparse updates. This allows a lower update rate without visible jumping.

## 15.5 Convoy order and relative distance

- Distance between two members: Haversine formula.
- "Ahead / behind": project the vector between two members onto the reference member's heading (dot product with the heading unit vector). Positive means ahead, negative means behind.
- Convoy order: sort members by their projection along the convoy's overall direction of travel (derived from the host/leader heading), giving the order for the connection line.

Optional (AI-area framing): use recent speed trend and gap growth to flag "falling behind" before the member goes stale.

## 15.6 Stale and lost detection

Each member has `lastSeenAt`. Status is derived locally from age, so it works even without server messages:

| Age | Status |
|---|---|
| < 10 s | Live |
| 10–30 s | Delayed |
| 30–120 s | Stale (faded marker, "last seen" label) |
| > 120 s | Lost connection (warning in member strip) |

Thresholds are initial values and should be tuned and recorded.

Optional (HealthTech-area framing): a driver check-in prompt and an SOS action that sends a high-priority message to the convoy.

## 15.7 Retry with exponential backoff and jitter

Reconnect and outbox retry delays grow exponentially up to a cap, with random jitter, to avoid battery drain and server stampedes when many devices reconnect at once.

## 15.8 Bounded buffers and voice limits

- Offline location trail capped (e.g. last ~200 points, down-sampled).
- Chat history stored locally capped per convoy.
- PTT clip max duration (e.g. 30 s), compressed audio, and a delivery time-to-live (e.g. 60 s); expired clips are dropped.

---

# 16. Native hardware integration

| Hardware | Used for | Notes |
|---|---|---|
| GPS / location | Live member location, speed, heading | Foreground tracking required; background tracking is a stretch goal (needs extra permission handling) |
| Camera | Scanning convoy QR codes to join | Permission requested only when the user taps Scan |
| Microphone | Push-to-talk recording | Permission requested on first use of PTT |
| Compass / gyroscope (device sensors) | Marker heading when GPS heading is unreliable (e.g. low speed) | Optional; GPS course used when moving |
| Haptics (optional) | Tactile feedback for PTT start/stop | Helps eyes-free use |

Permission rules:

- Ask in context, with a short explanation of why.
- Handle denied and "ask again" states without breaking the app.
- Location unavailable never silently hides the user (see 13.6 and 22).

---

# 17. Custom components

At least one component is built by the student. Planned custom components:

## 17.1 `HoldToTalkButton`

Large push-to-talk control.

Properties:

| Prop | Type | Description |
|---|---|---|
| `state` | `'idle' \| 'recording' \| 'disabled' \| 'sending'` | Visual and behavioural state |
| `maxDurationMs` | number | Auto-stops recording at this limit |
| `disabledReason` | string (optional) | Text shown when disabled (e.g. no connection) |
| `size` | number (optional) | Diameter of the control |

Events:

| Event | Description |
|---|---|
| `onPressStart` | Fired when the user begins holding; starts recording |
| `onPressEnd` | Fired on release; returns recorded clip info |
| `onLimitReached` | Fired when `maxDurationMs` is hit |
| `onCancel` | Fired if the gesture is cancelled (e.g. slide away) |

Behaviour: shows pulse/recording timer while held; haptic feedback; ignores presses when `disabled`.

## 17.2 `ConvoyMemberMarker`

Map marker for one member.

Properties:

| Prop | Type | Description |
|---|---|---|
| `name` | string | Member label |
| `isSelf` | boolean | Distinct styling for the current user |
| `status` | `'live' \| 'delayed' \| 'stale' \| 'lost'` | Controls colour/opacity |
| `heading` | number (optional) | Rotates the vehicle icon |
| `lastSeenAt` | number | Used to show "last seen" for stale members |

Events: `onPress` — opens member detail.

## 17.3 `ConnectionStatusPill`

Top-bar human-readable status (`5 connected`, `Connection unstable`, `Reconnecting…`).

Properties: `status`, `connectedCount`. Events: `onPress` (optional, opens detail).

Other candidates (add only if time allows): `MemberStripItem`, `PendingMessageBubble`.

---

# 18. UI/UX flow and screenshots

For the document, include screenshots and a short rationale for each screen:

| Screen | Screenshot | UX rationale |
|---|---|---|
| Splash | `<add>` | Short, restores state |
| Welcome | `<add>` | Two primary actions only |
| Create convoy | `<add>` | Minimal form |
| Join (code + QR) | `<add>` | Two quick join methods |
| Lobby | `<add>` | Confirm members before driving |
| Main map | `<add>` | Map-first, PTT central |
| Member sheet | `<add>` | Lightweight detail |
| Chat sheet | `<add>` | Does not compete with map |
| Offline state | `<add>` | Shows pending/stale clearly |
| Settings | `<add>` | Secondary |

Also include a navigation diagram (section 25.3).

---

# 19. Decision records and failure logs

The assignment requires documenting the implementation process, including AI usage with prompts, failures, and errors.

## 19.1 Decision records

Format:

```text
DR-00X — Title
Date:
Context:
Options considered:
Decision:
Consequences:
```

Initial records:

- **DR-001 — Convoy-centred navigation instead of a five-tab layout.** The map is the primary screen; secondary features live in sheets.
- **DR-002 — Custom Socket.IO backend instead of Firebase/Amplify.** Reason to confirm and record: control over sync protocol and real-time events.
- **DR-003 — Local-first with outbox.** Screens read only from local DB.
- **DR-004 — PTT is not queued offline.** Stale voice has no value; disabled with explanation, and clips expire (TTL).
- **DR-005 — Creating/joining a convoy requires a connection.** Codes are issued and validated by the server.

Add further records as decisions are made (map library, local DB choice, thresholds in 15.2 and 15.6, audio format).

## 19.2 AI usage log

For each use of AI during implementation:

```text
Date:
Task:
Prompt (verbatim):
Result summary:
What failed / what had to be changed:
Final solution:
```

Keep prompts as you actually wrote them.

## 19.3 Failure log

```text
Date:
Symptom / error message:
Cause:
Fix:
Lesson:
```

Typical areas worth recording: permissions, background location, socket reconnect loops, duplicate messages after reconnect, audio recording format issues, map marker performance.

---

# 20. Viva and live-coding preparation

- Viva: max 20 minutes, mandatory attendance (non-attendance means zero).
- Live coding: be able to implement a small piece unprompted.

Likely live-coding tasks to practise:

- Add a new field to a chat message and display it
- Change a status threshold (e.g. stale after N seconds)
- Add a prop to `HoldToTalkButton`
- Add a new socket event end to end (UI → service → server → UI)
- Add a simple outbox item type

Be ready to explain:

- Data flow from a user action to the server and back to the UI
- Why the UI reads from the local store
- How the outbox and sync cursor work
- Why the chosen sampling and thresholds were used
- The folder structure and reasons for it

---

# 21. Code of conduct

- All assets (icons, images, sounds) must be self-made or properly licensed and acknowledged.
- No copied codebases or collision/logic code taken from existing projects.
- If another student is helped (or helps), record who, what help, and their index number in the document.
- Plagiarism found in the viva means the assignment is zeroed.

---

# 22. Location status

When permission is needed:

```text
Allow Convoy to access your location

Your location is shared only
with people in your convoy.
```

When active:

```text
Location sharing
🟢 Active
```

When unavailable:

```text
⚠ Location unavailable

Turn on Location Services
```

The app does not silently make a member disappear if their location becomes unavailable.

---

# 23. Push-to-talk

Push-to-talk is a primary interaction, available directly on the main convoy screen.

Default:

```text
        🎙

   HOLD TO TALK
```

Holding:

```text
        🔴

      RECORDING  0:07
```

Offline:

```text
   No connection – can't transmit
```

Other users see who is speaking:

```text
🔊 Kasun is talking...
```

Design notes:

- Voice is sent as short compressed clips (capped length) rather than a continuous stream. This keeps data use low and fits the constraint-design requirement.
- Playback of received clips is automatic and in order; clips older than their TTL are dropped.
- The PTT control never requires leaving the main screen.

---

# 24. Chat

Chat is available but does not permanently compete with the map. The main screen shows only a quick-access button with an unread badge:

```text
💬 Chat ③
```

Opens as a bottom sheet:

```text
┌──────────────────────────────┐
│ Convoy Chat               ×  │
├──────────────────────────────┤
│ Kasun                        │
│ Are we stopping here?        │
│                              │
│                    You       │
│              Yes, 2 km ahead │
│                    ⏳ pending │
│ Nimal                        │
│ 👍                           │
├──────────────────────────────┤
│ Message...              Send │
└──────────────────────────────┘
```

Message states: pending (⏳), sent, failed (tap to retry). Messages sent while offline remain visible and sync later (section 14).

---

# 25. Connection status, settings, and navigation

## 25.1 Convoy connection status

Normal:

```text
● 5 connected
```

Weak:

```text
● Connection unstable
```

Disconnected:

```text
● Reconnecting...
```

Avoid technical wording such as "Socket.IO connected".

## 25.2 Convoy settings

Secondary to the live map.

```text
Convoy Settings

Convoy name
Invite members
Convoy code
QR code

Location sharing
Member permissions

Leave convoy
End convoy
```

## 25.3 Navigation structure

```text
CONVOY
   │
   ▼
MAIN MAP
   │
   ├── Members
   │     └── Member Details
   │
   ├── Chat
   │
   └── Convoy Settings
```

Push-to-talk remains directly accessible from the main map.

## 25.4 Screen hierarchy

```text
APP
│
├── Splash
│
├── Welcome
│   ├── Start Convoy
│   │   └── Convoy Lobby
│   │
│   └── Join Convoy
│       ├── Enter Code
│       └── Scan QR
│
└── Convoy
    │
    ├── Main Map
    │   ├── Live Members
    │   ├── Member Connections
    │   ├── Recenter
    │   ├── Push-to-Talk
    │   ├── Chat
    │   └── Members
    │
    ├── Members
    │   └── Member Details
    │
    ├── Chat
    │
    └── Convoy Settings
        ├── Invite
        ├── Members
        ├── Permissions
        ├── Leave
        └── End Convoy
```

---

# 26. Architecture and design

## 26.1 Major design decisions (summary)

- React Native (Expo + Expo Router) for a compile-to-native mobile app.
- Custom Node.js + Socket.IO backend (`convoy-server`) for real-time events.
- Local-first data flow with a local database and outbox.
- Convoy-centred navigation, map-first UI.
- Constraint-driven algorithms (adaptive sampling, thresholds, backoff).

Details and reasoning go in the decision records (section 19).

## 26.2 Layers and data flow

```text
┌───────────────────────────────┐
│ UI layer                      │  Screens, custom components
│ (Expo Router screens)         │
├───────────────────────────────┤
│ State / feature layer         │  Hooks and stores per feature:
│                               │  convoy, location, chat, ptt, members
├───────────────────────────────┤
│ Service layer                 │  socketService, locationService,
│                               │  audioService, syncService, storageService
├───────────────────────────────┤
│ Local data layer              │  Local DB + outbox + key-value store
├───────────────────────────────┤
│ Native / device layer         │  GPS, camera, microphone, sensors
└───────────────────────────────┘
              ↕ Socket.IO / HTTP
┌───────────────────────────────┐
│ convoy-server                 │  Rooms per convoy, sequence numbers,
│                               │  de-duplication, snapshots
└───────────────────────────────┘
```

Rules:

- Screens never call the socket or device APIs directly; they use feature hooks.
- Services write to the local data layer; stores read from it and update the UI.
- Incoming socket events go through the sync service into the local DB, then the UI updates.

### Example: sending a chat message

```text
User taps Send
  → chat feature hook creates message with clientId
  → saved to local DB as "pending" + outbox
  → UI shows it immediately
  → syncService sends via socket (when connected)
  → server stores, assigns seq, acknowledges
  → local DB updates message to "sent"
  → UI updates
```

### Example: location update

```text
GPS reading
  → locationService applies sampling/min-distance rules
  → local self-position updated (map marker moves)
  → socketService publishes (or buffers if offline)
  → server fans out to convoy room
  → other devices update their local member records
  → their maps interpolate to the new position
```

## 26.3 Source organisation

Proposed structure (adjust to match the actual repository):

```text
app/                    Expo Router routes (screens only)
src/
  components/           Reusable and custom UI components
  features/
    convoy/             Create, join, lobby, session
    location/           Tracking, sampling, stale logic
    chat/               Messages, outbox integration
    ptt/                Recording, playback, clip rules
    members/            Member list, order, relative distance
  services/             socket, sync, audio, location, storage
  db/                   Schema, queries, migrations
  theme/                Colours, typography, spacing
  utils/                Geo maths, backoff, time helpers
convoy-server/          Node.js + Socket.IO backend
```

Why:

- Feature folders keep related UI, state, and logic together, which makes it easy to explain and extend a single feature.
- Services isolate device and network details so they can be mocked and swapped.
- Routes contain only screens, keeping navigation separate from logic.

---

# 27. Core design priorities

1. **Map** — where am I and where is my convoy?
2. **Push-to-talk** — how do I quickly talk to everyone?
3. **Chat** — what did the convoy say that I need to read or respond to?
4. **Member information** — who is this and where are they relative to me?
5. **Resilience** — does it still make sense when the signal drops?

Everything else is secondary.

---

# 28. Design philosophy

The application should feel like a shared driving console for a group, not a social network.

The ideal interaction is: Open → Join → See the convoy → Drive.

The interface stays visually calm, map-focused, and easy to understand at a glance. The strongest visual moment is the large push-to-talk control, while the map remains the persistent information layer.

---

# 29. Evaluation alignment

| Criterion | Weight | How this design addresses it |
|---|---|---|
| Uniqueness and idea rationale, documentation | 15% | Sections 1.2, 2.1, 19 |
| Solidness of implementation (structure, data flow, offline, constraints, completeness, live coding) | 50% | Sections 14, 15, 26, 20 |
| UX richness and navigation, custom components | 20% | Sections 5, 13, 17, 18, 25 |
| Presentation and viva | 15% | Section 20 |

Spend the most effort on the 50% block: a reliable offline/sync implementation and being able to explain the data flow.

---

# 30. Submission checklist

- [ ] Index number digit sum and project area shown
- [ ] Project overview and features
- [ ] Architecture, layers, data flow, source structure with reasoning
- [ ] Offline access and sync techniques
- [ ] Constraint design algorithms and principles
- [ ] Native hardware integration
- [ ] UI/UX flow with screenshots
- [ ] Custom components with properties and events
- [ ] Decision records, AI prompts, failure logs
- [ ] GitHub link to source code
- [ ] Document uploaded to Moodle before 18 October 2026
- [ ] Viva prepared (demo, live-coding practice)