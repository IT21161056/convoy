# Convoy

Real-time mobile road-trip coordination platform featuring live map tracking, push-to-talk (PTT), group chat, and resilient offline synchronization.

## Project Structure

```text
convoy/
├── convoy-client/          # React Native mobile client (Expo SDK 52, Expo Router v4)
│   ├── src/
│   │   ├── app/            # Expo Router file-based screens and layouts
│   │   ├── components/     # UI design system and domain components
│   │   ├── db/             # SQLite local storage & offline outbox
│   │   ├── features/       # Domain modules (convoy, location, chat, PTT, members)
│   │   ├── services/       # Socket.IO client, sync, routing, storage
│   │   └── theme/          # Typography, color tokens, and spacing
│   └── docs/               # Assignment documentation, AI logs, and ADRs
└── convoy-server/          # Node.js + TypeScript Socket.IO backend
    └── src/                # Real-time event handlers, state, and persistence
```

## Quick Start

### 1. Start the Backend Server
```bash
cd convoy-server
npm install
npm run dev
```
The server runs on `http://localhost:4000`.

### 2. Start the Mobile Client
```bash
cd convoy-client
npm install
npx expo start --dev-client
```

### 3. Emulator Port Forwarding (Android)
If using Android emulators:
```bash
adb -s <serial> reverse tcp:8081 tcp:8081 && adb -s <serial> reverse tcp:4000 tcp:4000
```

## Architecture & Data Flow

- **Local-First & Resilient**: Actions (messages, locations) persist to local SQLite first and queue in an outbox when disconnected.
- **State Synchronization**: Server broadcasts → `useXSync` hooks → SQLite/Stores → React hooks → UI.
- **Environment**: Copy `convoy-client/.env.example` to `convoy-client/.env` and supply your `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY`.
- **Documentation**: See [convoy-client/docs](file:///c:/My%20Folder/projects/convoy/convoy-client/docs) for architecture decision records (ADRs) and the SE5070 project document.
