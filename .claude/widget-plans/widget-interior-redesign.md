# Widget Tech Plan: Interior Visual Redesign

**PRD:** `.claude/widget-prds/widget-interior-redesign.md`
**Branch:** `widget/interior-redesign`
**Reference widget:** `RoutinesWidget.tsx` (inline-style pattern), `CalendarWidget.tsx` (ui-kit component pattern)

## Files to modify

- `src/components/widgets/RoutinesWidget.tsx` — MODIFY
- `src/components/widgets/GoalsWidget.tsx` — MODIFY
- `src/components/widgets/TaskListWidget.tsx` — MODIFY
- `src/components/widgets/CalendarWidget.tsx` — MODIFY
- `src/components/widgets/SpotifyWidget.tsx` — MODIFY

No new files. No registry changes. No settings changes. No API changes.

## Skeleton animation

Add a `@keyframes wt-skeleton-pulse` to `src/index.css` (not packages/ui-kit — we cannot add new `--wt-*` vars there). Actually: use an inline `style` tag trick — inject a `<style>` element once via a module-level constant, OR use Tailwind's `animate-pulse` class which already exists in the project. **Use Tailwind `animate-pulse` class on skeleton elements.** This avoids any new CSS custom properties.

Skeleton shape: rounded rectangles using `background: 'var(--wt-surface-hover)'` as the fill color, sized to approximate the real content height.

## Per-widget changes

---

### RoutinesWidget.tsx

**Current issues:**
- Header: `fontSize: 15` is OK for category label, but the section label has no left-border accent stripe
- Progress bar: `height: 3`, needs to be `7`
- Item button: `padding: '9px 10px'`, `borderRadius: 10`, `fontSize: 13` — all below target
- Checkbox: `width: 18, height: 18` — needs to be 22
- Completed item: `textDecoration: 'line-through'` + `opacity: 0.5` — remove strikethrough, reduce to 0.35 opacity
- No loading state (the `useRoutines` hook returns `isLoading` but current code doesn't use it)
- No sorting: completed items render in place, not pushed to bottom

**What to change:**

1. **Header section** — wrap the header `<div>` in a container that has `borderLeft: '4px solid <color>'` and a faint `background: '${color}12'` tint (12 = ~7% hex opacity). Increase the category label to `fontSize: 18, fontWeight: 700`. The count label stays but increases to `fontSize: 13`.

2. **Progress bar** — `height: 7`, `borderRadius: 4`, track background `var(--wt-surface-hover)` (not `var(--wt-border)`).

3. **Item buttons** — `padding: '10px 14px'`, `borderRadius: 14`, `fontSize: 15` for the title span.

4. **Checkbox** — `width: 22, height: 22`, keep the `borderRadius: 6` approach (it's a rounded square for routines, fine).

5. **Completed items** — remove `textDecoration`, set `opacity: 0.35`. Sort completed items after incomplete within the `filtered` array: `[...incomplete, ...complete]` ordering.

6. **Loading state** — add `isLoading` from `useRoutines()`. When loading, render 4 skeleton rows: each a `<div>` with `height: 44, borderRadius: 14, background: 'var(--wt-surface-hover)', marginBottom: 4, className="animate-pulse"`.

**Sorting logic:**
```typescript
const incomplete = filtered.filter((r) => !completedIds.includes(r.id))
const complete   = filtered.filter((r) =>  completedIds.includes(r.id))
const sorted     = [...incomplete, ...complete]
```
Map over `sorted` instead of `filtered`.

**Header tint note:** `color` is already `#f97316`, `#3b82f6`, or `#8b5cf6` — these are the CATEGORY_COLORS constants already in the file. Append `'12'` for ~7% opacity background, `'30'` for ~19% (try `'15'` = ~8%). The PRD says "very light tint — enough to anchor it visually". Use `${color}15` (already used for completed item backgrounds in the current code — same pattern).

**Header layout change:**
```tsx
<div style={{
  padding: '14px 16px 10px',
  borderLeft: `4px solid ${color}`,
  background: `${color}15`,
  flexShrink: 0,
}}>
```
The outer wrapper `<div style={{ padding: '14px 16px 10px', flexShrink: 0 }}>` becomes the accented container.

---

### GoalsWidget.tsx

**Current issues:**
- `GoalCard` borderRadius: 10 — needs 16
- `GoalCard` padding: `'8px 10px'` / `'10px 12px'` — needs 14px
- Title fontSize: `compact ? 12 : 13` — needs 17px (non-compact), 13px (compact OK)
- ProgressBar default height: 4 — needs 7 (GoalCard calls it with `height={compact ? 3 : 4}`)
- Sub-labels fontSize: 10 — needs 14
- `GoalFocus` title fontSize: 15 — needs 20 minimum
- `GoalFocus` detail row fontSize: 11 — needs 14
- `GoalFocus` milestone labels fontSize: 11 — needs 13, remove `textDecoration: 'line-through'` (replace with opacity)
- Loading state: shows "Loading goals…" text — needs skeleton cards
- Header "Goals" label: `fontSize: 13` — needs 18
- Header count: `fontSize: 10` — needs 13

**What to change:**

1. **GoalCard:**
   - `borderRadius: 16`
   - padding: `compact ? '10px 12px' : '14px'`
   - title `fontSize: compact ? 13 : 17`, weight stays 600
   - `ProgressBar` call: `height={compact ? 4 : 7}`
   - sub-label spans: `fontSize: compact ? 11 : 14`
   - target date: `fontSize: compact ? 10 : 12`
   - completed goals: wrap in opacity container — GoalCard receives a `done` prop and applies `opacity: 0.4` to its root div

2. **GoalFocus:**
   - title `fontSize: 20`
   - description `fontSize: 13`
   - detail row `fontSize: 14`
   - milestone item title `fontSize: 13`, remove `textDecoration`, set `opacity: m.completed_at ? 0.4 : 1`
   - `ProgressBar` already uses `height={6}` here — upgrade to 7

3. **Widget header:**
   - "Goals" label: `fontSize: 18, fontWeight: 700`
   - count label: `fontSize: 13`

4. **Loading skeleton:**
   ```tsx
   <div style={{ flex: 1, padding: '0 10px 10px', display: 'flex', flexDirection: 'column', gap: 6 }}>
     {[1, 2].map((i) => (
       <div key={i} className="animate-pulse" style={{
         borderRadius: 16, background: 'var(--wt-surface)',
         border: '1px solid var(--wt-border)', padding: 14,
         display: 'flex', flexDirection: 'column', gap: 8,
       }}>
         <div style={{ height: 17, borderRadius: 6, background: 'var(--wt-surface-hover)', width: '70%' }} />
         <div style={{ height: 7, borderRadius: 4, background: 'var(--wt-surface-hover)' }} />
         <div style={{ height: 14, borderRadius: 6, background: 'var(--wt-surface-hover)', width: '45%' }} />
       </div>
     ))}
   </div>
   ```

5. **Completed goals opacity:** In `GoalsWidget` root, when rendering `GoalCard`, pass a `done={calcProgress(goal) >= 1}` prop. In `GoalCard`, apply `opacity: done ? 0.4 : 1` to the root `<div>`.

---

### TaskListWidget.tsx

**Current issues:**
- Header list name: `fontSize: 13` — needs 17, `fontWeight: 600`
- Active badge: `fontSize: 10`, `padding: '1px 6px'` — needs `fontSize: 13`, `padding: '4px 10px'`
- Task button: `padding: '7px 8px'`, `borderRadius: 8` — needs `'10px 12px'`, 14
- Task title: `fontSize: 12` — needs 15
- Checkbox: `width: 16, height: 16` — needs 22
- Priority color: only on border, not fill — needs to fill the circle outline at full opacity when unchecked
- Overdue: `border: '1px solid rgba(239,68,68,0.3)'` — needs 4px left-border in red (use `var(--wt-danger)` not hardcoded `#ef4444`)
- Due date label: `fontSize: 9` — needs 12 (normal), 13 bold (overdue)
- Completed: `textDecoration: 'line-through'`, `opacity: 0.4` — remove strikethrough, set opacity 0.35
- Loading: plain "Loading…" text — needs 3 skeleton rows
- Empty state: left-aligned plain text — needs centered, use `var(--wt-success)` at 60% opacity for "All done!"
- Quick-add input: `fontSize: 12`, `padding: '6px 10px'` — needs `fontSize: 15`, `padding: '10px'`

**Hardcoded color violations to fix:**
- `PRIORITY_DOT[1]: '#ef4444'` — replace with `'var(--wt-danger)'`
- `PRIORITY_DOT[2]: '#f59e0b'` — this is amber, no `--wt-*` var for it. Use `'#f59e0b'` (amber) — this is a semantic priority color constant, not a theme color. The PRD says "use existing `CATEGORY_COLORS` pattern" — keeping named priority constants is acceptable. Note this in the implementation.
- `PRIORITY_DOT[3]: '#3b82f6'` — this is the same blue as `CATEGORY_COLORS.daily`. Acceptable as a priority semantic constant.
- `background: done ? '#22c55e' : 'transparent'` in checkbox — replace `'#22c55e'` with `'var(--wt-success)'`
- `color: isOverdue ? '#ef4444'` — replace with `'var(--wt-danger)'`

**Priority fill change:** When NOT done, fill the checkbox circle with `PRIORITY_DOT[task.priority]` at ~20% opacity as background, with full-opacity border. This makes the priority color visible without looking "checked". When done, fill with `var(--wt-success)`.

**Overdue row:** Add `borderLeft: '4px solid var(--wt-danger)'` to the button style, remove the faint red background `rgba(239,68,68,0.04)` (replace with transparent). Keep `border: '1px solid var(--wt-border)'` for the main border. The left-border override dominates.

Note: inline `borderLeft` will override the shorthand `border`. Use explicit `borderTop`, `borderRight`, `borderBottom`, `borderLeft` separately, or use `borderLeft` after `border` in the style object (CSS specificity — later properties in the same object win in React inline styles).

**What to do:** Remove the `border` shorthand from overdue rows. Apply:
```tsx
style={{
  borderTop: '1px solid var(--wt-border)',
  borderRight: '1px solid var(--wt-border)',
  borderBottom: '1px solid var(--wt-border)',
  borderLeft: isOverdue ? '4px solid var(--wt-danger)' : '1px solid var(--wt-border)',
  // ... rest of styles
}}
```

**Loading skeleton (3 rows):**
```tsx
{[1, 2, 3].map((i) => (
  <div key={i} className="animate-pulse" style={{
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '10px 12px', marginBottom: 3,
    borderRadius: 14, border: '1px solid var(--wt-border)',
    background: 'var(--wt-surface)',
  }}>
    <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--wt-surface-hover)', flexShrink: 0 }} />
    <div style={{ height: 15, borderRadius: 6, background: 'var(--wt-surface-hover)', flex: 1 }} />
  </div>
))}
```

**Empty state:**
```tsx
<div style={{
  textAlign: 'center', paddingTop: 32,
  fontSize: 16, color: 'var(--wt-success)', opacity: 0.6,
}}>
  All done!
</div>
```

---

### CalendarWidget.tsx

**Current issues:**
- `EventRow` color bar: `className="w-0.5"` = 2px — needs 4px (use inline `width: 4`)
- `EventRow` title: `Text variant="label" size="small"` — size "small" may be 12–13px. Override with `style={{ fontSize: 15 }}`
- `EventRow` time: `Text variant="caption" size="small"` — override with `style={{ fontSize: 13 }}`
- `EventRow` padding: `className="py-1.5 px-3"` = 6px/12px — needs 12px/14px vertical/horizontal. Use `style={{ paddingTop: 12, paddingBottom: 12, paddingLeft: 14, paddingRight: 14 }}`
- `WeekView` day label: `Text variant="label" size="small"` — override `style={{ fontSize: 14, fontWeight: 700 }}`
- `WeekView` date numeral: `Text variant="body" size="small"` — override `style={{ fontSize: 16, fontWeight: 600 }}`
- `WeekView` event title: `Text as="span" variant="caption" size="large"` — override `style={{ fontSize: 14 }}`
- `WeekView` time annotation: `Text as="span" variant="caption" size="small"` — override `style={{ fontSize: 12 }}`
- `MonthView` day numbers: `Text variant="label" size="small"` — override `style={{ fontSize: 14 }}`
- `MonthView` event dots: `className="w-1 h-1"` = 4px — needs 6px. Use inline `style={{ width: 6, height: 6 }}`
- `MonthView` overflow count: `style={{ fontSize: '8px' }}` — needs 11px
- `MonthView` today cell: currently `background: 'var(--wt-surface)'` — add a more prominent accent circle behind the date number. Use a wrapper div with `width: 22, height: 22, borderRadius: '50%', background: 'var(--wt-accent)', opacity: 0.2` positioned behind the numeral. Actually simpler: just change today cell background to `var(--wt-surface-hover)` and add `color: var(--wt-accent)` to the date numeral.
- Loading: `<Text className="animate-pulse">Loading events…</Text>` — needs skeleton rows
- Disconnected state: `Icon size={28}` — needs 36px. Text font needs 15px.
- Status loading: `<Text className="animate-pulse">Loading calendar…</Text>` — needs a basic spinner or skeleton

**CalendarWidget loading skeleton (4 rows for day view shape):**
```tsx
<div style={{ padding: '8px 14px', display: 'flex', flexDirection: 'column', gap: 2 }}>
  {[1, 2, 3, 4].map((i) => (
    <div key={i} className="animate-pulse" style={{
      display: 'flex', alignItems: 'center', gap: 10,
      paddingTop: 12, paddingBottom: 12, paddingLeft: 14, paddingRight: 14,
    }}>
      <div style={{ width: 4, height: 40, borderRadius: 2, background: 'var(--wt-surface-hover)', flexShrink: 0 }} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ height: 15, borderRadius: 6, background: 'var(--wt-surface-hover)', width: '75%' }} />
        <div style={{ height: 13, borderRadius: 6, background: 'var(--wt-surface-hover)', width: '45%' }} />
      </div>
    </div>
  ))}
</div>
```

**Note on CalendarWidget Tailwind className approach:** This file uses `@whiteboard/ui-kit` components heavily (FlexRow, Box, Text, etc.). Style overrides must be applied via the `style` prop on those components (they pass through `style`). For the event dot width change from `w-1 h-1` to 6px: replace `className="w-1 h-1 rounded-full"` with `style={{ width: 6, height: 6, borderRadius: '50%' }}` and no className for size.

---

### SpotifyWidget.tsx

**Current issues:**
- Progress bar: `height: 3` — needs 6
- Progress bar track: `borderRadius: 2` — needs 3 (fully rounded for 6px height)
- Time labels: `Text variant="caption" size="small"` — override with `style={{ fontSize: 13 }}`
- Track title: `Text variant="heading" size="small"` — add `style={{ fontSize: 17, minFontSize: 17 }}` override, or just `style={{ fontSize: 17 }}`
- Artist name: `Text variant="body" size="small"` — add `style={{ fontSize: 15 }}` override
- Play/pause button: `large ? 44 : 32` — change to `large ? 52 : 38`
- Play button icon: `size={18}` — increase to `size={22}` for the larger button
- Skip button icon: `size={16}` — increase to `size={18}`
- "Nothing playing" state: `SpotifyIcon size={32}` — needs 48px. `Text variant="body" size="small"` — add `style={{ fontSize: 16 }}`
- Spinner: `width: 20, height: 20, border: '2px solid'` — needs `width: 28, height: 28, border: '3px solid'`

**CtrlBtn `large` size change:**
```tsx
width: large ? 52 : 38, height: large ? 52 : 38,
```

**Icon sizes in CtrlBtn calls:**
```tsx
<Icon icon="SkipBack"    size={18} weight="fill" />   // was 16
<Icon icon="Pause"       size={22} weight="fill" />   // was 18
<Icon icon="Play"        size={22} weight="fill" style={{ marginLeft: 2 }} />  // was 18
<Icon icon="SkipForward" size={18} weight="fill" />   // was 16
```

---

## Skeleton animation note

Tailwind's `animate-pulse` class animates opacity 1→0.5→1. All skeleton elements use `className="animate-pulse"` — this already exists in the Tailwind config (it's a base Tailwind utility). No new CSS needed.

For the CalendarWidget skeleton which uses ui-kit `<ScrollArea>`, render the skeleton inside `<ScrollArea>` directly, not inside the `Center` component.

---

## Component structure

No structural changes. Each widget keeps its existing component tree. Changes are purely to inline style values, a handful of Tailwind class swaps, and the addition of loading/skeleton branches.

---

## Responsive behavior

All changes use fixed pixel values consistent with the existing pattern (these are ambient-display widgets viewed at fixed resolution — responsive scaling is not a requirement for this redesign). Verify nothing breaks at minimum size (200×200 small-square).

---

## Technical acceptance criteria

- [ ] `npx tsc --noEmit` passes with zero new errors
- [ ] No new hardcoded colors introduced — `#ef4444` → `var(--wt-danger)`, `#22c55e` → `var(--wt-success)`. PRIORITY_DOT amber/blue are semantic constants (acceptable per PRD convention note)
- [ ] All body text min 15px (task titles, routine items, event titles, goal titles, artist name)
- [ ] All headers min 18px (RoutinesWidget category label, GoalsWidget "Goals" header)
- [ ] All progress bars min 6–7px height with rounded ends and visible track
- [ ] Inner border-radius ≥ 12px on all cards and list items
- [ ] Completed/done items use opacity ≤ 40%, no strikethrough
- [ ] All 5 widgets show skeleton loading state using animate-pulse + var(--wt-surface-hover)
- [ ] RoutinesWidget section header has 4px left-border in category color + light tint background
- [ ] TaskListWidget overdue rows have 4px left-border in var(--wt-danger)
- [ ] CalendarWidget event color bars are 4px wide
- [ ] SpotifyWidget play button is 52px, progress bar is 6px
- [ ] Routines: completed items sorted to bottom, no strikethrough
- [ ] GoalsWidget "Nothing playing" Spotify icon 48px — N/A (Spotify widget). GoalFocus title ≥ 20px
- [ ] No changes to Widget.tsx, registry.tsx, or any data/API layer

## Risks / open technical questions

1. **CalendarWidget uses Tailwind className for layout** (`py-1.5 px-3`, `w-0.5`, `w-1 h-1`) — replacing these with inline styles must be verified to not break layout. The `FlexRow` and `Box` components from ui-kit accept `style` prop directly. The `w-0.5` class → inline `width: 4` is straightforward. The `py-1.5 px-3` on `FlexRow` — add a `style` prop override, but also keep or remove the className. Safest: keep className for other utility classes, add explicit `style` for the values we're changing. Removing className entirely risks losing other classes. Pattern: add `style={{ paddingTop: 12, paddingBottom: 12, paddingLeft: 14, paddingRight: 14 }}` to the `FlexRow` in EventRow, which will override Tailwind padding via inline style specificity.

2. **Text component size prop** — The ui-kit `Text` component uses `size="small"`, `size="large"` etc. We don't know exactly what pixel values these map to. Adding `style={{ fontSize: 15 }}` inline should override whatever the component renders. Verify this works.

3. **animate-pulse in CalendarWidget** — The CalendarWidget uses `ScrollArea` from ui-kit. Skeleton content goes inside `ScrollArea` as children; this should work fine.

4. **GoalsWidget compact mode** — When `goals.length > 3`, `compact={true}` is passed and font sizes stay smaller. The PRD says title should be 17px. In compact mode (>3 goals), forcing 17px may cause overflow. Decision: in compact mode, use `fontSize: 14` as a compromise (still above 13px current). Spec says 17px non-compact; compact is an edge case.

5. **CATEGORY_COLORS hex strings** — used as `${color}15` for opacity tint. This works when `color` is a hex code like `#f97316`. It does NOT work if `color` is `var(--wt-accent)` (GoalsWidget fallback). In RoutinesWidget, `color` is always from `CATEGORY_COLORS` (always a hex), so this is safe.
