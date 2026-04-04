# Mobile Pod — Objectives

This file is the source of truth for the Mobile pod's goals. All agents in this pod operate to advance these.

## Pod mission

Own the Walli companion mobile app — an Expo/React Native app that remote-controls the smart-whiteboard from a phone. It lives at `C:/Users/dylan/Documents/projects/wiigit-whiteboard/app/`.

---

## Global project objectives

1. **Living dashboard** — the mobile app is the remote control for the board. Users switch boards, add/remove widgets, trigger agents, and change themes from their phone.
2. **First-class integrations** — the app talks exclusively to the smart-whiteboard Express server via `lib/api.ts`. It is never a direct API client — all data flows through the server.
3. **Cohesive UI** — the app has its own dark-themed design language (colors from `lib/colors.ts`, fonts from `lib/fonts.ts`). It should feel native and polished.

---

## Architecture (know this cold)

### Project root
`C:/Users/dylan/Documents/projects/wiigit-whiteboard/app/`

### Stack
- **Expo SDK 54** / **React Native 0.81** with New Architecture enabled
- **Expo Router** (file-based routing, tab layout)
- **React Native Reanimated 4** + **Gesture Handler** for animations/sheets
- **phosphor-react-native** for icons (same icon set as the web app)
- **@gorhom/bottom-sheet** for sheets

### File structure
```
app/
  _layout.tsx       — root tab layout (5 tabs: Chat, Board, Themes, Agents, Settings)
  index.tsx         — Chat tab (Walli AI chat)
  board.tsx         — Board tab (switch boards, view/delete widgets, add widget FAB)
  themes.tsx        — Themes tab (apply preset themes, AI theme generation)
  agents.tsx        — Agents tab (list, enable/disable, run, create, delete agents)
  settings.tsx      — Settings tab (server URL config, connection status)

components/
  AddWidgetSheet.tsx   — bottom sheet for adding widgets to the board
  AppBottomSheet.tsx   — reusable bottom sheet wrapper (exports AppBottomSheetRef)
  FloatingTabBar.tsx   — custom floating tab bar (if used)
  WalliAvatar.tsx      — animated Walli avatar component

lib/
  api.ts     — ALL server calls. Never fetch() outside this file.
  colors.ts  — C object with all color tokens (bg, surface, text, accent, etc.)
  fonts.ts   — font() helper / font weight constants
  sounds.ts  — soundClick(), soundBump() — haptic/audio feedback
  themes.ts  — theme list / theme metadata for the Themes screen
```

### Colors (from lib/colors.ts — use these, never hardcode)
```typescript
C.bg, C.surface, C.surface2, C.surface3
C.border, C.borderHi
C.text, C.muted, C.muted2
C.accent, C.accent2, C.danger, C.success, C.warning
C.grad1, C.grad2  // gradient stops for Walli branding
```

### Fonts (from lib/fonts.ts)
Use the `font` object or constants — never hardcode `fontFamily` strings directly.

### API contract (lib/api.ts)
The app calls the smart-whiteboard server (default: `http://localhost:3001`). Server URL is stored in AsyncStorage. All calls go through `base(path, opts)`. Never add `fetch()` calls outside `lib/api.ts`.

---

## Pod conventions (enforce these)

- **All server calls in `lib/api.ts`** — no inline `fetch()` in screen files
- **All colors from `lib/colors.ts` (C object)** — no hardcoded hex values in components
- **All fonts from `lib/fonts.ts`** — no hardcoded `fontFamily` strings
- **StyleSheet.create** for all styles — no inline style objects except for dynamic values
- **SafeAreaView** with `edges={['top']}` on every screen root
- **Error states**: every network call must have a catch — show Alert or inline error, never silently fail
- **Loading states**: every screen with async data needs a loading indicator
- **Sounds**: `soundClick()` on button presses, `soundBump()` on errors
- No dependencies added without checking that Expo SDK 54 supports them

---

## Pod initiatives (current)

### P0 — Stability
The app is a remote control. If it crashes or fails silently, the user loses control of the board. Every screen must handle offline/error states gracefully.

### P1 — Feature parity with web
Anything the user can do from the web board settings should eventually be doable from the app. Current gaps: layout switching, per-widget settings editing.

### P2 — UX polish
Animations, haptics, and smooth transitions. The app should feel premium. Use Reanimated for micro-animations where appropriate.

---

## Development commands
```bash
cd C:/Users/dylan/Documents/projects/wiigit-whiteboard/app
npx expo start          # start dev server
npx expo start --ios    # iOS simulator
npx expo start --android
npx tsc --noEmit        # type check
```

---

## Definition of done (for any mobile change)

- [ ] TypeScript clean (`npx tsc --noEmit` from the app directory)
- [ ] No hardcoded colors (use C object from lib/colors.ts)
- [ ] No hardcoded fonts (use lib/fonts.ts)
- [ ] All server calls in lib/api.ts
- [ ] Loading + error states handled
- [ ] StyleSheet.create used (no inline style objects for static styles)
- [ ] PR reviewed by Dev 2, approved by Lead
- [ ] Merged to `main` via squash commit
