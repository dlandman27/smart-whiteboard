# Mobile Tech Plan: Full UI Redesign + Apple Health Sync

**PRD:** `.claude/mobile-prds/health-redesign.md`  
**Branch:** `feat/health-redesign`  
**App root:** `C:/Users/dylan/Documents/projects/wiigit-whiteboard/app/`  
**Backend root:** `C:/Users/dylan/Documents/projects/wiigit-whiteboard/smart-whiteboard/server/`  
**Reference screen:** `app/app/(tabs)/index.tsx` (Today screen — best reference for data loading patterns)

---

## Files to create / modify

### App — CREATE
- `app/app/(tabs)/health.tsx` — New Health tab screen
- `app/lib/health.ts` — HealthKit permission + read functions
- `app/lib/healthSync.ts` — Read all data + POST to backend
- `app/store/health.ts` — Zustand store for health data

### App — MODIFY
- `app/app/(tabs)/index.tsx` — Today screen redesign
- `app/app/(tabs)/chat.tsx` — Chat screen enhancements
- `app/app/(tabs)/integrations.tsx` — Control screen redesign
- `app/app/(tabs)/boards.tsx` — Boards screen redesign
- `app/app/(tabs)/settings.tsx` — Settings screen fix (Input component, Button component)
- `app/app/(tabs)/_layout.tsx` — Add Health tab with HeartStraight icon
- `app/lib/api.ts` — Add `postHealthData` function

### Backend — CREATE
- `server/routes/health.ts` — POST /api/health-data route

### Backend — MODIFY
- `server/index.ts` — Register healthRouter

---

## New API functions needed

Add to `app/lib/api.ts`:

```typescript
export type HealthPayload = {
  steps:      number
  calories:   number
  weight:     number | null
  workouts:   Array<{ type: string; duration: number; calories: number; startDate: string }>
  sleep:      number | null
  heartRate:  number | null
  date:       string
}

export async function postHealthData(payload: HealthPayload): Promise<{ ok: boolean }> {
  return base('/api/health-data', {
    method: 'POST',
    body:   JSON.stringify(payload),
  })
}
```

---

## Health lib (`lib/health.ts`)

`react-native-health` is the Expo-compatible HealthKit wrapper. It requires:
1. Adding to `package.json` dependencies: `"react-native-health": "^1.21.0"`
2. Adding to `app.json` / `expo-plugin` the health permissions

Note: `react-native-health` requires native build (not Expo Go). Add as a dependency and use `expo run:ios` or EAS Build. Guard all calls with Platform.OS === 'ios' checks.

```typescript
// lib/health.ts — structure

import { Platform } from 'react-native'
import AppleHealthKit, { HealthKitPermissions, HealthUnit } from 'react-native-health'

export type WorkoutSample = {
  type:       string
  duration:   number   // seconds
  calories:   number
  startDate:  string
}

export type HealthSnapshot = {
  steps:     number
  calories:  number
  weight:    number | null
  workouts:  WorkoutSample[]
  sleep:     number | null      // hours
  heartRate: number | null
}

const PERMISSIONS: HealthKitPermissions = {
  permissions: {
    read: [
      AppleHealthKit.Constants.Permissions.Steps,
      AppleHealthKit.Constants.Permissions.ActiveEnergyBurned,
      AppleHealthKit.Constants.Permissions.BodyMass,
      AppleHealthKit.Constants.Permissions.Workout,
      AppleHealthKit.Constants.Permissions.SleepAnalysis,
      AppleHealthKit.Constants.Permissions.RestingHeartRate,
    ],
    write: [],
  },
}

export function requestHealthPermissions(): Promise<void>
export function readStepsToday(): Promise<number>
export function readCaloriesToday(): Promise<number>
export function readWeightLatest(): Promise<number | null>
export function readWorkoutsThisWeek(): Promise<WorkoutSample[]>
export function readSleepLastNight(): Promise<number | null>
export function readRestingHeartRate(): Promise<number | null>
export function readAllHealth(): Promise<HealthSnapshot>
```

All functions must:
- Return sensible defaults (0 or null) on error, never throw
- Guard with `if (Platform.OS !== 'ios') return <default>`
- Wrap in try/catch

---

## Health store (`store/health.ts`)

```typescript
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'
import type { HealthSnapshot } from '../lib/health'

type HealthStore = HealthSnapshot & {
  lastSynced:    string | null
  setHealthData: (data: HealthSnapshot & { lastSynced: string }) => void
  clear:         () => void
}

// Persist to AsyncStorage with 'health' key
```

---

## Health sync (`lib/healthSync.ts`)

```typescript
// lib/healthSync.ts

import { readAllHealth } from './health'
import { postHealthData } from './api'
import { useHealthStore } from '../store/health'

export async function syncHealthData(): Promise<void> {
  const snapshot = await readAllHealth()
  const date = new Date().toISOString().split('T')[0]
  await postHealthData({ ...snapshot, date })
  // Update store — call getState().setHealthData directly (outside React)
  useHealthStore.getState().setHealthData({ ...snapshot, lastSynced: new Date().toISOString() })
}
```

---

## Screen structure

### Health screen (`app/(tabs)/health.tsx`)

State:
- `loading: boolean` — initial load
- `refreshing: boolean` — pull to refresh
- `permissionDenied: boolean` — HealthKit not available or denied

Component tree:
```
Screen (scroll, refreshControl)
  ├── Header Row (greeting + date)
  ├── StepsRing (SVG circle, steps/goal)
  ├── MetricGrid (2x2 Row of MetricCard)
  │     ├── MetricCard { icon: Flame, label: "Calories", value: calories }
  │     ├── MetricCard { icon: Moon, label: "Sleep", value: sleep }
  │     ├── MetricCard { icon: HeartStraight, label: "Heart Rate", value: heartRate }
  │     └── MetricCard { icon: Scales, label: "Weight", value: weight }
  └── WorkoutsSection
        ├── Section header
        └── FlatList horizontal of WorkoutCard
              or EmptyState if no workouts
```

StepsRing is an SVG circle progress component. Use `react-native-svg` (already in package.json):
```tsx
import Svg, { Circle } from 'react-native-svg'
// circumference = 2 * Math.PI * r
// strokeDashoffset = circumference * (1 - progress)
```

### Today screen redesign

New header structure:
```
Stack gap-1
  Text variant="title" style={{ fontSize: 42, fontFamily: font.bold }}  // Day of week e.g. "Sunday"
  Text variant="subheading" color="muted"  // "April 13, 2026"
  Text variant="body"  // "Good morning, Dylan"
Row  // Health summary strip — only if healthStore.steps > 0
  Chip with steps count
  Chip with calories count
```

EventRow: time column left-aligned and prominent (font-bold, not caption)

TaskRow: overdue tasks get `style={{ borderLeftWidth: 3, borderLeftColor: theme.danger, paddingLeft: 8 }}`

### Chat screen enhancements

Hint cards: add per-hint icon mapping:
```typescript
const HINTS = [
  { text: "What's on my board?",  icon: SquaresFour },
  { text: 'Morning brief',        icon: Sun },
  { text: 'Add a tasks widget',   icon: Plus },
  { text: 'Switch to Work board', icon: ArrowRight },
]
```

User message bubble: right-aligned in a Row with justifyContent: 'flex-end', gradient background at 20% opacity with full-opacity text.

### Control screen redesign

New section structure:
1. If `nowPlaying?.item && nowPlaying.is_playing` → NowPlayingCard (prominent)
2. Section "Services" → ServiceRow for each integration
3. Section "Agents" → existing AgentCard

NowPlayingCard:
```
Card style with subtle green glow border
  Row
    Stack w-12 h-12 gradient square (album art placeholder)
    Stack flex-1
      Text variant="subheading" (track name)
      Text variant="caption" muted (artist)
    Row gap-3 (SkipBack, play/pause gradient button, SkipForward)
```

ServiceRow:
```
Row items-center gap-3 py-2
  Stack w-9 h-9 rounded-sm (brand color bg at 13% opacity)
    BrandIcon (brand color)
  Text variant="body" flex-1
  StatusChip
```

### Boards screen redesign

Active board card: wrap in a LinearGradient border effect:
```
View style={{ padding: 1.5, borderRadius: 14, background: gradient }}
  Card (no border)
```
Alternative simpler approach: `style={{ borderWidth: 2, borderColor: theme.accent }}` with a gradient check icon — the gradient border via LinearGradient wrapper.

Widget pills (when board selected): replace the vertical list with a flex-wrap Row of Chips:
```
Row className="flex-wrap gap-1.5"
  {widgets.map(w => (
    <Chip key={w.id} label={`${widgetIcon(w.type)} ${widgetLabel(w.type)}`} variant="default" />
  ))}
```

### Settings screen fix

Replace all `TextInput` with the `Input` component from `../../components/ui`.

Replace the ad-hoc Save/Test Pressables with:
```tsx
<Button variant="gradient" label="Save" loading={saving} disabled={!dirty || saving} onPress={save} />
<Button variant="outline"  label="Test" loading={status === 'checking'} onPress={test} />
```

Profile card: Avatar size 56, add sign-out as a full-width Button variant="ghost" color danger below the profile card.

---

## States to implement

### Health screen
- **Loading (initial):** Skeleton cards for StepsRing and MetricGrid
- **Permission denied:** EmptyState with HeartStraight icon, "Health access needed", explanation text
- **iOS unavailable (Platform.OS !== 'ios'):** EmptyState with explanation "Apple Health is only available on iOS"
- **Empty (no data):** Steps ring at 0, metric cards show "—"
- **Success:** Full dashboard

### All redesigned screens
- **Loading:** ActivityIndicator centered (existing pattern)
- **Error:** No crashes — catch all errors silently, show EmptyState or muted text

---

## Interaction / navigation

**Health screen:**
- Pull to refresh → `syncHealthData()` → update store → re-render
- Mount → request permissions if not granted → sync

**Today screen:**
- Health strip pills are display-only (no tap action)
- EventRow: no change
- TaskRow: onComplete behavior unchanged, just restyled

**Control screen:**
- NowPlayingCard play/pause: `onSpotifyAction(spotifyPause/Play)` — same as before
- ServiceRows: no tap action (status only)

**Haptics:**
- `soundClick()` on all interactive presses
- `soundBump()` on errors

---

## Backend: `server/routes/health.ts`

Pattern: identical to voice.ts — use `Router`, `asyncRoute`, import from `../middleware/error.js`.

```typescript
import { Router } from 'express'
import { asyncRoute, AppError } from '../middleware/error.js'

// In-memory store: Map<`${userId}:${date}`, HealthPayload>
const healthStore = new Map<string, any>()

export function healthRouter(): Router {
  const router = Router()

  router.post('/health-data', asyncRoute(async (req, res) => {
    const userId = req.userId  // set by requireAuth middleware
    const body   = req.body
    if (!body?.date) throw new AppError(400, 'date is required')
    const key = `${userId}:${body.date}`
    healthStore.set(key, { ...body, userId, receivedAt: new Date().toISOString() })
    res.json({ ok: true })
  }))

  router.get('/health-data', asyncRoute(async (req, res) => {
    const userId = req.userId
    const date   = (req.query.date as string) ?? new Date().toISOString().split('T')[0]
    const key    = `${userId}:${date}`
    const data   = healthStore.get(key) ?? null
    res.json({ data })
  }))

  return router
}
```

Register in `server/index.ts`:
```typescript
import { healthRouter } from './routes/health.js'
// ...
app.use('/api', healthRouter())
```

Note: `req.userId` is set by the `requireAuth` middleware (already used by other routes).

---

## `_layout.tsx` changes

```typescript
import { ..., HeartStraight } from 'phosphor-react-native'

// Add after the settings tab:
<Tabs.Screen name="health" options={{
  title: 'Health',
  tabBarIcon: ({ color, size }) => <HeartStraight color={color} size={size} weight="fill" />,
}} />
```

---

## Technical acceptance criteria

- [ ] `npx tsc --noEmit` passes (run from `/c/Users/dylan/Documents/projects/wiigit-whiteboard/app`)
- [ ] No hardcoded colors — uses `C` from `lib/colors` or `useTheme()`
- [ ] No hardcoded fonts — uses `font` from `lib/tokens` or `lib/fonts`
- [ ] All server calls in `lib/api.ts`
- [ ] Loading state shown during all fetches
- [ ] Error states shown on failure (no unhandled promise rejections)
- [ ] `StyleSheet.create` used for any static styles (or inline style objects extracted to constants)
- [ ] Safe area insets respected (Screen component handles this)
- [ ] Platform.OS guard on all HealthKit calls
- [ ] Health tab added to _layout.tsx
- [ ] Backend health route registered and responding

---

## Risks

1. **`react-native-health` requires native build** — it will not work in Expo Go. The package must be added and the user must run `expo run:ios`. Document this clearly in code comments.
2. **HealthKit permission UX** — if the user denies permissions, all reads return 0/null. The Health screen must handle this gracefully with an EmptyState explaining what to do.
3. **SVG ring math** — the steps ring uses `strokeDasharray` / `strokeDashoffset`. Must clamp progress to [0, 1] to avoid visual glitches.
4. **Boards screen gradient border** — LinearGradient cannot be used as a border directly in RN. Use the "padding + inner card" wrapper approach: `<LinearGradient style={{padding:1.5, borderRadius:14}}><Card style={{borderWidth:0}}>...</Card></LinearGradient>`.
5. **TypeScript for react-native-health** — types may need `@types/react-native-health` or are bundled. Check after install.
6. **req.userId type** — the `requireAuth` middleware sets `req.userId`. In the health route, this should be typed. Check existing routes for the pattern (e.g. voice.ts uses `req.userId!`).
