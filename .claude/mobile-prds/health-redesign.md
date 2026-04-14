# PRD: Walli Companion App — Full UI Redesign + Apple Health Sync

**Author:** PM Agent  
**Date:** 2026-04-13  
**Status:** Ready for implementation

---

## Overview

The Walli companion app is the primary remote control for the smart whiteboard. The current screens are functionally sound but aesthetically flat — they lack visual hierarchy, personality, and the sense that this is a premium life-coach product. This PRD covers two parallel tracks:

1. **UI Redesign** — all 5 existing tab screens redesigned with proper visual hierarchy, better use of the existing UI kit, and stronger brand personality.
2. **Apple Health Sync** — a new Health tab that reads HealthKit data, syncs it to the backend, and shows a premium health dashboard.

---

## Track 1: UI Redesign

### Today Screen (index.tsx)

**Problems:**
- Greeting is just body text, no visual weight
- Date is a caption below the title — backwards hierarchy
- Weather is a tiny caption — easily missed
- Sections feel like a flat settings list
- No visual urgency for overdue tasks

**Redesign goals:**
- Large day-of-week text (e.g. "Sunday") as the hero, with full date below
- Greeting text ("Good morning, Dylan") as a subheading underneath
- Weather displayed as a proper pill card with icon, temperature, and condition description — not a caption
- Calendar events: keep the color strip, but make the time more prominent (large time, smaller title below)
- Tasks: overdue tasks get a red left strip (matching cal event pattern) and red "Overdue" badge. Today tasks are normal. Upcoming tasks are visually dimmed.
- Health summary strip (2 metric pills: steps with ring icon, today's calorie goal) — shown only if health data is available in the health store

### Chat Screen (chat.tsx)

**Problems:**
- Empty state is good but the hint cards feel generic
- Message bubbles are fine but there is no visual distinction for Walli vs user tone

**Redesign goals:**
- Empty state: WalliAvatar with glow, warmer copy ("Your board, your rules — just ask me")
- Hint cards: slightly larger, with a small icon per hint (CalendarBlank, CheckCircle, SquaresFour, Sparkle)
- User messages: right-aligned, gradient bubble (WALLI_GRAD at low opacity)
- Walli messages: keep left-aligned with avatar

### Control Screen (integrations.tsx)

**Problems:**
- Renamed from "Integrations" to "Control" — the tab label is already "Connect" which is fine
- Single flat list of services with no visual grouping
- Spotify player is buried inside a card with no prominence
- Agents section has no visual grouping from services

**Redesign goals:**
- Split into two named sections: "Services" and "Agents"
- If Spotify is connected and playing: show a prominent Now Playing card at the top of Services — large track name, artist, album art placeholder (gradient square), prominent play/pause/skip controls
- If Spotify connected but nothing playing: compact status row
- Google Calendar and Todoist shown as compact status rows with their brand colors and connected/not-connected chips
- Agents section: keep the existing card design but add a subtle gradient accent on the header

### Boards Screen (boards.tsx)

**Problems:**
- Board cards are functional but flat
- Widget list is a simple list — not scannable at a glance

**Redesign goals:**
- Active board card: gradient border/glow instead of just a chip
- Selected board card: slightly elevated with surface hover
- Widget pills grid: when a board is selected, show widgets as a horizontal wrap of small pill chips (icon + name) instead of a vertical list of cards — much more compact and scannable
- Section headers cleaner: "My Boards" with count badge, "System Boards" with a lock icon

### Settings Screen (settings.tsx)

**Problems:**
- Raw TextInput used instead of the Input component
- Profile card is minimal
- Save/Test button area is ad-hoc

**Redesign goals:**
- Replace all TextInput with Input component from ui kit
- Profile card: larger Avatar (56px), name as heading, email as caption, sign-out as a full-width danger ghost button at the bottom of the section
- Server connection section: cleaner Input labels ("Board Server URL", "Walli Service URL")
- Save/Test buttons: use Button component variants (Button variant="gradient" for Save, Button variant="outline" for Test)
- Connection status: use the existing pattern but with the Card component
- App info table: keep, but style consistently

---

## Track 2: Apple Health Sync

### User story

> As a user, I want Walli to know my health data so it can coach me, show me my progress, and integrate it into my daily brief.

### New: Health Tab Screen

A new tab "Health" with a HeartStraight icon. This is the life-coach screen.

**Sections:**
1. **Header** — greeting + today's date (matches Today screen style)
2. **Steps ring** — SVG circle progress ring showing today's steps vs 10,000 goal. Large number in center, "steps today" label below.
3. **Metric row** — 4 small cards in a 2x2 grid: Calories (active), Sleep (hours last night), Heart Rate (resting BPM), Weight (most recent lbs/kg)
4. **Workouts this week** — horizontal scroll of workout cards. Each card: workout type icon, name, duration, calories. If no workouts, show EmptyState.
5. **Pull to refresh** — re-reads HealthKit and re-syncs to backend

### New files

**`app/lib/health.ts`** — HealthKit wrapper
- Permission request function
- Read functions for: steps today, active calories today, weight (most recent), workouts (last 7 days), sleep (last night duration), resting heart rate (most recent)
- Uses `react-native-health` package

**`app/lib/healthSync.ts`** — Sync orchestrator
- Calls all health read functions
- POSTs to backend `POST /api/health-data`
- Payload: `{ steps, calories, weight, workouts, sleep, heartRate, date }`
- Returns the payload for local state use

**`app/store/health.ts`** — Zustand store
- `{ steps, calories, weight, workouts, sleep, heartRate, lastSynced }`
- Actions: `setHealthData`, `clear`
- Persisted via AsyncStorage
- Today screen can read steps/calories from this store for the summary strip

**`app/(tabs)/health.tsx`** — Health screen
- Requests HealthKit permissions on mount
- Loads from store first (instant display), then syncs in background
- Pull to refresh triggers re-sync

### Backend: `POST /api/health-data`

New route at `server/routes/health.ts`.

**Accepts:**
```json
{
  "steps": 8432,
  "calories": 620,
  "weight": 175.2,
  "workouts": [{ "type": "Running", "duration": 1800, "calories": 320, "startDate": "..." }],
  "sleep": 7.5,
  "heartRate": 58,
  "date": "2026-04-13"
}
```

**Behavior:** Store in memory (Map keyed by userId + date). Return `{ ok: true }`. Logging at minimum. Supabase persistence to follow in a later ticket.

**Register** in `server/index.ts` the same way other routes are registered.

---

## Non-goals

- No Supabase persistence for health data in this ticket (memory store only)
- No Android health integration (Google Fit) in this ticket — iOS/HealthKit only
- No health data displayed in chat responses (Walli AI integration comes later)
- No trend charts beyond the steps ring in this ticket

---

## Acceptance criteria

- [ ] All 5 existing screens visually redesigned per the goals above
- [ ] No hardcoded colors — all from `C` (lib/colors) or `useTheme()`
- [ ] No hardcoded fonts — all from `lib/fonts` or `lib/tokens`
- [ ] All API calls in `lib/api.ts`
- [ ] `react-native-health` added to package.json
- [ ] `lib/health.ts` created with permission request + all 6 read functions
- [ ] `lib/healthSync.ts` created, posts to `/api/health-data`
- [ ] `store/health.ts` Zustand store created
- [ ] Health tab added to `_layout.tsx` with HeartStraight icon
- [ ] `app/(tabs)/health.tsx` created with all 4 sections
- [ ] `server/routes/health.ts` created and registered in `server/index.ts`
- [ ] TypeScript clean: `npx tsc --noEmit` passes from app directory
- [ ] Loading states shown during all fetches
- [ ] Error states handled gracefully (no crashes if HealthKit unavailable)
- [ ] Safe area insets respected on all screens
