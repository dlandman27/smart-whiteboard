# Board Core Tech Plan: Layout System Improvements

**PRD:** `.claude/board-prds/layout-system-improvements.md`
**Branch:** `feat/layout-system-improvements`

---

## Architecture clarification: no Zustand persist version

This store does NOT use Zustand `persist` middleware. There is no `whiteboard-layout` persist version to bump. State is persisted to Supabase via `src/lib/db.ts` (`upsertWidget`) and loaded via `loadBoards`. The migration concern from the PRD is therefore:

- Adding `hidden?: boolean` to `WidgetLayout` in `src/types/index.ts` is safe — existing DB rows will load with `hidden: undefined` (falsy), which is correct.
- The `rowToWidget` function in `src/lib/db.ts` must be updated to read `w.is_hidden` (new DB column) and populate `hidden`.
- `upsertWidget` in `src/lib/db.ts` must write `is_hidden: widget.hidden ?? false` to the DB.
- A new Supabase migration `008_widget_hidden.sql` must add `is_hidden boolean not null default false` to the `widgets` table.
- No Zustand persist version bump needed.

Boards without the column (pre-migration) will default to `false` at the DB level, so existing boards are unaffected.

---

## Files to modify

| File | Change |
|---|---|
| `src/types/index.ts` | Add `hidden?: boolean` to `WidgetLayout` |
| `src/layouts/presets.ts` | Add `label` to every slot in all 15 named presets; add `category` field to `Layout`; define `LAYOUT_SECTIONS` grouping |
| `src/types/index.ts` | Add `category?: string` to `Layout` interface |
| `src/components/LayoutPicker.tsx` | Grouped picker (improvement 1), aspect-ratio init (improvement 2), hidden warning text (improvement 3), slot labels (improvement 4), skip assignment step (improvement 5) |
| `src/components/WidgetCanvas.tsx` | Filter out hidden widgets before rendering; add `isLayoutTransitioning` state + CSS transition class (improvement 6) |
| `src/components/Widget.tsx` | Apply layout-transition CSS on `left/top/width/height` when `layoutTransitioning` prop is true |
| `src/store/whiteboard.ts` | Update `setLayout` signature and logic for non-destructive hidden; update `setLayout` type signature |
| `src/lib/db.ts` | `rowToWidget` reads `is_hidden`; `upsertWidget` writes `is_hidden` |
| `supabase/migrations/008_widget_hidden.sql` | New migration: add `is_hidden` column |

---

## New types / interfaces

### `src/types/index.ts`

```ts
export interface Layout {
  id: string
  name: string
  slots: LayoutSlot[]
  category?: 'simple' | 'grid' | 'asymmetric'  // NEW
}

export interface WidgetLayout {
  // ... existing fields ...
  hidden?: boolean  // NEW — widget is off-canvas but not deleted
}
```

### `src/layouts/presets.ts`

Add exported constant:
```ts
export type LayoutCategory = 'simple' | 'grid' | 'asymmetric'

export const LAYOUT_SECTIONS: Array<{ category: LayoutCategory; label: string }> = [
  { category: 'simple',     label: 'SIMPLE'     },
  { category: 'grid',       label: 'GRID'       },
  { category: 'asymmetric', label: 'ASYMMETRIC' },
]
```

Assign `category` to every preset (see slot label table below for which preset goes in which section).

**Simple:** focus, split-h, split-v, triple, triple-rows
**Grid:** grid-2x2, grid-3x2, grid-4x2
**Asymmetric:** dashboard, dashboard-r, sidebar-l, sidebar-r, big-strip, header-3, mosaic

---

## Slot labels — complete mapping

Every slot in every non-custom preset gets a `label` field per the PRD table:

| Preset | Slot id | Label |
|---|---|---|
| focus | main | Main |
| split-h | left | Left |
| split-h | right | Right |
| split-v | top | Top |
| split-v | bottom | Bottom |
| triple | col-1 | Col 1 |
| triple | col-2 | Col 2 |
| triple | col-3 | Col 3 |
| triple-rows | row-1 | Row 1 |
| triple-rows | row-2 | Row 2 |
| triple-rows | row-3 | Row 3 |
| grid-2x2 | tl | Top Left |
| grid-2x2 | tr | Top Right |
| grid-2x2 | bl | Bottom Left |
| grid-2x2 | br | Bottom Right |
| grid-3x2 | r1c1 | Row 1 Col 1 |
| grid-3x2 | r1c2 | Row 1 Col 2 |
| grid-3x2 | r1c3 | Row 1 Col 3 |
| grid-3x2 | r2c1 | Row 2 Col 1 |
| grid-3x2 | r2c2 | Row 2 Col 2 |
| grid-3x2 | r2c3 | Row 2 Col 3 |
| grid-4x2 | r1c1 | Row 1 Col 1 |
| grid-4x2 | r1c2 | Row 1 Col 2 |
| grid-4x2 | r1c3 | Row 1 Col 3 |
| grid-4x2 | r1c4 | Row 1 Col 4 |
| grid-4x2 | r2c1 | Row 2 Col 1 |
| grid-4x2 | r2c2 | Row 2 Col 2 |
| grid-4x2 | r2c3 | Row 2 Col 3 |
| grid-4x2 | r2c4 | Row 2 Col 4 |
| dashboard | main | Main |
| dashboard | side-top | Top |
| dashboard | side-mid | Middle |
| dashboard | side-bot | Bottom |
| dashboard-r | side-top | Top |
| dashboard-r | side-mid | Middle |
| dashboard-r | side-bot | Bottom |
| dashboard-r | main | Main |
| sidebar-l | left-col | Sidebar |
| sidebar-l | top-right | Top Center |
| sidebar-l | top-far | Top Right |
| sidebar-l | bottom | Main |
| sidebar-r | top-left | Top Left |
| sidebar-r | top-wide | Top Wide |
| sidebar-r | bottom | Main |
| sidebar-r | right-col | Sidebar |
| big-strip | main | Main |
| big-strip | strip-1 | Strip 1 |
| big-strip | strip-2 | Strip 2 |
| big-strip | strip-3 | Strip 3 |
| header-3 | header | Header |
| header-3 | col-1 | Col 1 |
| header-3 | col-2 | Col 2 |
| header-3 | col-3 | Col 3 |
| mosaic | tl | Main |
| mosaic | tr-top | Top Right |
| mosaic | tr-bot | Mid Right |
| mosaic | bl-l | Bottom Left |
| mosaic | bl-r | Bottom Center |
| mosaic | br | Bottom Right |

The `SlotPreview` thumbnail component in `LayoutGrid` must NOT render labels — it only renders colored rectangles, and adding text would clutter the tiny thumbnail. Labels are rendered only in `AssignStep`'s drop zones.

---

## Store action changes

### `setLayout` in `src/store/whiteboard.ts`

Current signature:
```ts
setLayout: (boardId: string, layoutId: string, widgetUpdates?: Array<{ id: string; slotId: string | null; x: number; y: number; width: number; height: number }>) => void
```

New behavior: when `widgetUpdates` is provided, any widget NOT in the `widgetUpdates` list gets `hidden: true` and `slotId: undefined` set. Any widget that IS in the list gets `hidden: false` (explicitly cleared). Widgets with no slotId at all remain unchanged (they were already free-floating — though in bento-only mode this shouldn't happen in practice).

The action signature itself does not change. The internal logic changes:

```ts
setLayout: (boardId, layoutId, widgetUpdates) => {
  analytics.track('layout_changed', { boardId, layoutId })
  set((s) => ({
    boards: s.boards.map((b) => {
      if (b.id !== boardId) return b
      const updatedIds = new Set(widgetUpdates?.map((u) => u.id) ?? [])
      const widgets = b.widgets.map((w) => {
        if (!widgetUpdates) return w  // no updates provided — leave as-is
        const upd = widgetUpdates.find((u) => u.id === w.id)
        if (upd) {
          // Widget is assigned — update position and clear hidden
          return { ...w, slotId: upd.slotId ?? undefined, x: upd.x, y: upd.y, width: upd.width, height: upd.height, hidden: false }
        } else {
          // Widget not assigned — hide it, clear its slot
          return { ...w, hidden: true, slotId: undefined }
        }
      })
      return { ...b, layoutId, widgets }
    }),
  }))
}
```

---

## Aspect-ratio greedy matcher (shared utility)

Extract into a helper function used by both `AssignStep` initial state and `handleLayoutSelect` skip path:

```ts
function matchWidgetsToSlots(
  slots: LayoutSlot[],
  widgets: WidgetLayout[]
): Record<string, string> {
  // Returns slotId -> widgetId mapping
  // Greedy: sort both by aspect ratio, pair from closest
  const slotsSorted  = [...slots].sort((a, b) => (a.width / a.height) - (b.width / b.height))
  const widgetsSorted = [...widgets].sort((a, b) => (a.width / a.height) - (b.width / b.height))
  const result: Record<string, string> = {}
  const usedWidgets  = new Set<string>()
  for (const slot of slotsSorted) {
    let bestWidget: WidgetLayout | null = null
    let bestDiff = Infinity
    for (const w of widgetsSorted) {
      if (usedWidgets.has(w.id)) continue
      const diff = Math.abs((w.width / w.height) - (slot.width / slot.height))
      if (diff < bestDiff) { bestDiff = diff; bestWidget = w }
    }
    if (bestWidget) {
      result[slot.id] = bestWidget.id
      usedWidgets.add(bestWidget.id)
    }
  }
  return result
}
```

This replaces the sequential `widgets[i]?.id` init in `AssignStep` and drives the auto-assign path in `handleLayoutSelect`.

---

## LayoutPicker changes (improvement 1, 2, 3, 4, 5)

### Improvement 1 — Grouped preset picker

`LayoutGrid` currently renders a flat `visiblePresets.map(...)`. Change to:

1. Import `LAYOUT_SECTIONS` from presets
2. For each section, filter `visiblePresets` by `layout.category === section.category`
3. Render a `<div>` section header between groups using the section label
4. Keep the 3-column grid per section

Section header style: `text-[10px] font-semibold uppercase tracking-widest` with `color: var(--wt-text-muted)` and `opacity: 0.5`. Not interactive.

### Improvement 2 — Aspect-ratio initial assignment

In `AssignStep`, replace the `useState` initializer:
```ts
// Before:
layout.slots.forEach((slot, i) => { init[slot.id] = widgets[i]?.id ?? '' })
// After:
const matched = matchWidgetsToSlots(layout.slots, widgets)
layout.slots.forEach((slot) => { init[slot.id] = matched[slot.id] ?? '' })
```

### Improvement 3 — Non-destructive layout switching

In `LayoutPicker.handleApply`:
- Remove the line: `widgets.filter((w) => !assignedIds.has(w.id)).forEach((w) => removeWidget(w.id))`
- The `setLayout` action now handles hiding unassigned widgets internally (see store changes above)
- Update the warning text: `"X Wiigit{s} will be hidden"` instead of `"will be removed"`

Also update `AssignStep` props — it currently receives `widgets: WidgetLayout[]`. To support the "hidden widgets become eligible" behavior, `handleLayoutSelect` in `LayoutPicker` must pass the full widget list including currently hidden widgets (so they can be re-assigned). Change `AssignStep` to receive all widgets (hidden included), but display the hidden ones distinctly or simply include them in the pool normally — for v1, treat hidden widgets identically to unassigned ones in the pool.

The non-hidden widget count check for the skip path uses: `widgets.filter(w => !w.hidden)`.

### Improvement 4 — Slot labels

In `AssignStep`'s empty drop zone:
```tsx
// Before:
<span>drop here</span>
// After:
<span>{slot.label ?? 'drop here'}</span>
```

Also show the slot label above the icon when slot is empty:
```tsx
{!widget && (
  <div className="flex flex-col items-center gap-1 pointer-events-none select-none">
    <Icon icon="Plus" size={14} style={{ opacity: 0.25 }} />
    <span className="text-[10px] font-medium" style={{ color: 'var(--wt-text-muted)', opacity: 0.5 }}>
      {slot.label ?? 'drop here'}
    </span>
  </div>
)}
```

### Improvement 5 — Skip assignment step

In `handleLayoutSelect` in `LayoutPicker`:

```ts
function handleLayoutSelect(layout: Layout) {
  if (!activeBoard) return
  if (layout.slots.length === 0) { onClose(); return }

  const nonHiddenWidgets = (activeBoard.widgets ?? []).filter(w => !w.hidden)

  if (!nonHiddenWidgets.length) {
    // Empty board — apply instantly
    setLayout(activeBoardId, layout.id)
    onClose()
    return
  }

  if (layout.slots.length >= nonHiddenWidgets.length) {
    // Auto-assign and apply immediately — no modal
    const allWidgets = activeBoard.widgets ?? []
    const hiddenWidgets = allWidgets.filter(w => w.hidden)
    const eligibleWidgets = [...nonHiddenWidgets, ...hiddenWidgets]
      .slice(0, layout.slots.length)  // only as many as there are slots
    // actually: match nonHidden first, then fill remaining slots with hidden
    const matched = matchWidgetsToSlots(layout.slots, eligibleWidgets)
    // compute slot rects and build widgetUpdates
    const slotRects = Object.fromEntries(
      layout.slots.map((s) => [s.id, computeSlotRect(s, canvasSize.w, canvasSize.h, slotGap, slotPad)])
    )
    const widgetUpdates = Object.entries(matched).map(([slotId, widgetId]) => {
      const rect = slotRects[slotId]
      return { id: widgetId, slotId, x: rect.x, y: rect.y, width: rect.width, height: rect.height }
    })
    setLayout(activeBoardId, layout.id, widgetUpdates)
    onClose()
    return
  }

  // Fewer slots than widgets — show assignment canvas
  setSelectedLayout(layout)
}
```

Note on "open question" from PRD: count only non-hidden widgets (`w.hidden !== true`) for the skip threshold. This matches the PRD's recommendation.

---

## Widget animation (improvement 6)

### Approach

Add a `layoutTransitioning` prop to `Widget`. When true, apply CSS transition on `left`, `top`, `width`, `height` (300ms ease-in-out). When false (during drag/resize), no transition on position — exactly the current behavior.

In `WidgetCanvas`:
- Add `const [layoutTransitioning, setLayoutTransitioning] = useState(false)`
- Subscribe to `useWhiteboardStore` to detect when `setLayout` fires by comparing `boards[activeIndex]?.layoutId`
- When `layoutId` changes, set `layoutTransitioning = true`, then clear it after 350ms (slightly longer than animation duration to catch the last frame)

Detailed implementation in `WidgetCanvas.tsx`:
```ts
const prevLayoutIdRef = useRef<string | undefined>(undefined)
const [layoutTransitioning, setLayoutTransitioning] = useState(false)
const transitionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

const currentLayoutId = boards[activeIndex]?.layoutId
useEffect(() => {
  if (prevLayoutIdRef.current !== undefined && prevLayoutIdRef.current !== currentLayoutId) {
    setLayoutTransitioning(true)
    if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current)
    transitionTimerRef.current = setTimeout(() => setLayoutTransitioning(false), 350)
  }
  prevLayoutIdRef.current = currentLayoutId
}, [currentLayoutId])
```

In `Widget.tsx`, add `layoutTransitioning?: boolean` to Props. In the non-fullscreen branch of `fsStyle`:
```ts
// Current transition line:
transition: dragging ? 'transform 0.15s ease' : 'transform 0.2s ease',
// New:
transition: dragging
  ? 'transform 0.15s ease'
  : layoutTransitioning
  ? 'left 0.3s ease-in-out, top 0.3s ease-in-out, width 0.3s ease-in-out, height 0.3s ease-in-out, transform 0.2s ease'
  : 'transform 0.2s ease',
```

CRITICAL: the transition must NOT fire during drag or resize. Drag is guarded by the `dragging` check in the ternary. Resize uses `posRef`/`sizeRef` directly and calls `setPos`/`setSize` on every pointer move — because `layoutTransitioning` will be false during drag/resize (it's only set true when `layoutId` changes, not during pointer events), the transition won't be active during those operations.

Also CRITICAL: `pos` state in `Widget` is synced from props via `useEffect([x, y])` and `useEffect([width, height])`. These effects fire when the store updates positions. The CSS transition will animate between old and new prop values naturally, without any special handling needed.

---

## Database migration

### `supabase/migrations/008_widget_hidden.sql`

```sql
-- Add is_hidden column to widgets table for non-destructive layout switching
alter table widgets add column if not exists is_hidden boolean not null default false;
```

### `src/lib/db.ts` changes

In `rowToWidget`:
```ts
hidden: w.is_hidden ?? false || undefined,
// More precisely — only set hidden if true, otherwise omit (undefined = not hidden):
hidden: w.is_hidden ? true : undefined,
```

In `upsertWidget`:
```ts
is_hidden: widget.hidden ?? false,
```

Also update `onlyPositionChanged` in `syncBoards.ts` to not treat `hidden` changes as position-only (they should sync immediately, not be debounced). The current implementation uses `JSON.stringify(aRest) !== JSON.stringify(bRest)` which will catch `hidden` changes correctly — no change needed.

---

## Technical acceptance criteria

- [ ] `npx tsc --noEmit` passes with zero errors
- [ ] No persist version bump needed (store uses Supabase, not Zustand persist)
- [ ] Supabase migration 008 adds `is_hidden boolean not null default false`
- [ ] `rowToWidget` reads `is_hidden` from DB row and maps to `hidden`
- [ ] `upsertWidget` writes `hidden` as `is_hidden` to DB
- [ ] `WidgetLayout.hidden` is typed `boolean | undefined`, not `any`
- [ ] `Layout.category` is typed as a union, not `string`
- [ ] All 15 named presets have `category` set
- [ ] All slots in all 15 named presets have `label` set
- [ ] `SlotPreview` (thumbnail) does NOT render slot labels (labels only in `AssignStep`)
- [ ] `LayoutGrid` renders three section headers: SIMPLE, GRID, ASYMMETRIC
- [ ] Section headers are not interactive (`pointer-events: none` or no `onClick`)
- [ ] `AssignStep` initial state uses aspect-ratio matcher, not positional index
- [ ] "will be removed" changed to "will be hidden" in warning
- [ ] Unassigned widgets get `hidden: true` on Apply, not deleted
- [ ] Layout switch with slot count >= visible widget count skips assignment canvas
- [ ] Empty-board layout switch skips assignment canvas
- [ ] Hidden widgets are excluded from `WidgetCanvas` render (`w.hidden !== true`)
- [ ] `WidgetCanvas` auto-assign `useEffect` skips hidden widgets
- [ ] `layoutTransitioning` prop drives CSS transition on position/size in `Widget`
- [ ] Transition fires only on `layoutId` change, not during drag or resize
- [ ] `npm test` passes (preset tests unchanged — labels are additive, tests check `id/name/slots` shape not label content)
- [ ] No `any` in store or theme types introduced

---

## Risks

1. **Hidden widget re-surfacing in auto-assign** — `WidgetCanvas` has a `useEffect` that auto-assigns slotless widgets to empty slots. Hidden widgets with `slotId: undefined` would be picked up by this auto-assigner and re-shown immediately after being hidden. The auto-assigner must check `!w.hidden` before including a widget in the slotless list. This is the highest-risk subtlety.

2. **Animation flicker on board switch** — `WidgetCanvas` uses `key={activeBoardId}`. When the board changes, the canvas unmounts and remounts, so there's no `prevLayoutIdRef` continuity across boards. The `useEffect` will see `prevLayoutIdRef.current === undefined` on first render and correctly skip the transition. No action needed.

3. **`upsertWidget` not writing `is_hidden`** — If the DB column exists but `upsertWidget` doesn't write it, hidden state won't survive a page reload. Review carefully.

4. **`handleApply` still calling `removeWidget`** — The current `LayoutPicker.handleApply` calls `removeWidget` for unassigned widgets. This line must be removed. If it remains, widgets will be deleted from the DB despite the non-destructive intent.

5. **Skip-path doesn't compute slot rects for hidden widgets that get restored** — When auto-assigning on the skip path, hidden widgets should be eligible to fill remaining empty slots after non-hidden widgets are matched. The implementation must include them in `eligibleWidgets` only up to the slot count. Off-by-one here could silently drop a hidden widget.

6. **Slot labels breaking `SlotPreview`** — The `SlotPreview` component only renders `<div>` rectangles based on x/y/width/height. It doesn't use `slot.label`. No change needed there. The risk is accidentally adding a label render inside `SlotPreview` — verify the diff touches only `AssignStep`'s drop zone.
