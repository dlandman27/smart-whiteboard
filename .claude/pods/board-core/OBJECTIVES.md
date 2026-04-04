# Board Core Pod — Objectives

This file is the source of truth for the Board Core pod's goals. All agents in this pod operate to advance these.

## Pod mission

Own the spatial engine of the smart-whiteboard: state management, layout system, theme system, and canvas interaction. This is the foundation every other pod builds on. It must be stable, typed, and well-understood before changes are made.

---

## Global project objectives

1. **Living dashboard** — the board must feel seamless to use. Layout transitions, widget placement, and theme changes must be instant and smooth.
2. **Cohesive UI** — the theme system is the single source of truth for all visual styling. Nothing in the UI bypasses it.
3. **Performance** — the canvas is always on. No memory leaks, no unnecessary re-renders, no stale Zustand subscriptions.
4. **Persistence** — board state is persisted via `zustand/persist`. Every schema change needs a migration.

---

## Architecture (know this cold)

### State stores (`src/store/`)
- `whiteboard.ts` — `useWhiteboardStore` — boards array, activeBoardId, all widget CRUD, layout assignment, slot assignment. Persisted as `'whiteboard-layout'` (version 3).
- `theme.ts` — `useThemeStore` — active theme, custom overrides, background, petsEnabled. Persisted as `'widget-theme'` (version 2). Applies CSS vars to `:root` on change.
- `ui.ts` — `useUIStore` — ephemeral UI state: focusedWidgetId, flashingWidgetId. NOT persisted.
- Other stores (`undo.ts`, `briefing.ts`, `chat.ts`, `voice.ts`, `pets.ts`, `notifications.ts`, `gcal.ts`, `spotify.ts`) — domain-specific, mostly not board-core concerns.

### Layout system (`src/layouts/`)
- `presets.ts` — `LAYOUT_PRESETS: Layout[]` — named slot grids (freeform, dashboard, grid-2x2, etc.). Slots use normalized coordinates (0–1 range). `getLayoutPreset(id)` returns a preset by id.
- Layout is stored on `Board.layoutId`. Custom AI layouts store slots on `Board.customSlots`.

### Theme system (`src/themes/`)
- `presets.ts` — `THEME_MAP`, `ThemeVars` interface, `applyThemeVars()`. CSS vars are named `--wt-*` and applied to `:root`.
- `ThemeVars` covers: widget frame, text, surfaces, accent, action panel, settings panel, clock widget, note widget.
- Custom themes are stored as `ThemeStore.customTheme: ThemeVars | null`.

### Types (`src/types.ts` or `src/types/`)
- `WidgetLayout` — `{ id, type, x, y, width, height, settings?, slotId? }`
- `LayoutSlot` — `{ id, x, y, width, height }` (normalized coords)
- `Layout` — `{ id, name, slots: LayoutSlot[] }`

### Canvas / spatial interaction
- Widgets are positioned via `react-rnd` (draggable + resizable).
- Position/size updates call `useWhiteboardStore.updateLayout(id, { x, y, width, height })`.
- `WidgetLayout.x/y/width/height` are pixel values at render time (not normalized like slots).

---

## Pod conventions (enforce these)

### State mutations
- Always mutate via store actions — never directly set Zustand state from components
- New store actions must keep immutability (`map`, `filter`, spread) — no direct array mutation
- Persisted stores need a `migrate` function bump when the state shape changes (increment `version`)
- Never add ephemeral/transient state (hover, loading, animation) to persisted stores — use `useUIStore` or local component state

### Themes
- New theme vars go in the `ThemeVars` interface AND in all existing theme presets
- `applyThemeVars()` is the only way to write to `:root` CSS vars — no direct `document.documentElement.style.setProperty` outside of it
- Every new color in the UI must reference a `--wt-*` CSS variable — no hardcoded values

### Layouts
- New layout presets are plain data in `LAYOUT_PRESETS` — no logic, just slot arrays
- Slot ids must be unique within a layout
- Slot coordinates must tile cleanly (x + width ≤ 1, y + height ≤ 1, no overlaps)

---

## Pod initiatives (current)

### P0 — Stability (non-negotiable)
Board core is the foundation. No regressions. Every change must:
- Pass `npx tsc --noEmit`
- Not break existing persist/migrate contracts
- Not drop any existing ThemeVars keys (widgets depend on them)

### P1 — Theme completeness
All theme vars should be consistent across all presets. Any missing vars cause visual glitches.

### P1 — Store cleanliness
Stores should have no dead actions, no unused state fields, no stale migrations. TypeScript should be clean with no `any` in store definitions.

### P2 — Layout tooling
New layout presets should be easy to preview and validate. Slots should be verifiable (no overlaps, tiles correctly).

---

## Definition of done (for any board-core change)

- [ ] TypeScript clean (`npx tsc --noEmit`)
- [ ] Persist migrations bumped if state shape changed
- [ ] New ThemeVars added to ALL existing theme presets
- [ ] No hardcoded colors — theme vars only
- [ ] No ephemeral state in persisted stores
- [ ] PR reviewed by Dev 2, approved by Lead
- [ ] Merged to `main` via squash commit
