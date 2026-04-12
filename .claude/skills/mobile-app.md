---
name: mobile-app
description: Work on the Mobile App (Walli Companion) pillar — Expo/React Native companion app for remote-controlling the whiteboard. Use when building screens, features, or integrations for the mobile app.
---

# Mobile App (Walli Companion) Pillar

You are working on the Mobile App pillar. This is the least mature pillar (2/10) — mostly planning docs, barely any code.

## Architecture

- **Framework**: Expo SDK 54 + React Native 0.81 (New Architecture)
- **Backend**: Same Express server at `http://localhost:3001` (or production URL)
- **API layer**: Centralized SDK in `lib/api.ts`
- **State**: Not yet determined — likely Zustand to match web app

## Current state (2/10)

**What exists**:
- Expo project scaffolding
- Design tokens (color object, font helpers)
- Architectural patterns defined (StyleSheet.create, SafeAreaView)
- Comprehensive objectives doc with 5 planned screens
- Agent specs for mobile-pm, mobile-lead, mobile-dev-1/2

**What's missing (everything)**:
- Chat screen — Walli voice interaction on mobile
- Board screen — switch boards, view widgets, add widget FAB
- Themes screen — apply presets, AI theme generation
- Agents screen — list/enable/disable/create/delete agents
- Settings screen — server URL config, connection status
- Push notifications (ntfy.sh integration exists server-side)
- Widget quick-add from phone
- Layout switcher
- Per-widget settings editor
- Notification history

## Planned screens (from objectives)

1. **Chat** — Walli AI voice/text interaction
2. **Board** — Board switcher, widget list view, add widget FAB
3. **Themes** — Theme gallery, apply presets, AI theme generation
4. **Agents** — Agent list with enable/disable/run/create/delete
5. **Settings** — Server URL, connection status indicator

## Key files

- Mobile app intended location: separate from this repo
- Server API used by mobile: all `/api/*` endpoints in `server/routes/`
- Objectives: `.claude/mobile-specs/`
- Agent specs: `.claude/agents/mobile-*.md`

## Backend endpoints the mobile app will use

- `POST /api/boards` — list/create boards
- `PATCH /api/boards/:id` — update board
- `POST /api/boards/:id/widgets` — add widget
- `PATCH /api/widgets/:id` — update widget settings/position
- `DELETE /api/widgets/:id` — remove widget
- `GET /api/gcal/status` — check Google connection
- `GET /api/spotify/status` — check Spotify connection
- `GET /api/agents` — list agents
- `POST /api/agents/:id/run` — trigger agent manually
- WebSocket at `/ws` — real-time board sync

## Conventions

- Use Expo Router for navigation
- Follow React Native best practices (no web-only APIs)
- Use `StyleSheet.create()` for styles
- Wrap screens in `SafeAreaView`
- Centralize all API calls through `lib/api.ts`
- Handle offline/disconnected states gracefully
- Use the same Supabase auth tokens as the web app

## When working on this pillar

1. Check `.claude/mobile-specs/` for existing plans and objectives
2. The mobile app is a remote control, not a replica — focus on control actions, not full widget rendering
3. Board switching and widget management are the highest-value screens
4. Voice on mobile should use the same `/api/walli/` endpoints
5. Push notifications can use the existing ntfy.sh integration on the server
6. Test on both iOS and Android (Expo handles most cross-platform)
