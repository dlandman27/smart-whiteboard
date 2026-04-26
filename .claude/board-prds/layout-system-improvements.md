# Board Core PRD: Layout System Improvements

**Area:** layout
**Status:** ready

## One-liner

Six targeted improvements to the layout picker and slot assignment system that eliminate data loss, reduce cognitive load, and make switching layouts feel instant and safe.

## Problem / motivation

The layout system is used every time a board is configured or reorganized. It has six user-facing gaps that together make layout switching feel risky and slow:

1. The flat 16-layout grid is visually overwhelming. Near-duplicate layouts (dashboard/dashboard-r, sidebar-l/r, triple/triple-rows) sit next to each other with no grouping, forcing the user to scan the entire grid every time.
2. Slot assignment initializes sequentially (slot 0 gets widget 0), so a tall clock widget ends up in a wide strip slot and a wide calendar widget ends up in a tall sidebar slot. The assignment canvas then requires manual correction on every layout switch.
3. Switching to a layout with fewer slots than current widgets permanently deletes the unassigned ones. There is no recovery path. This is the most serious UX gap — the user loses data without a clear warning until it is too late.
4. Slot labels are not surfaced in the assignment canvas. The drop zones say "drop here" with no name, so the user cannot tell which zone is "Main" vs "Sidebar" vs "Strip" without mentally mapping coordinates.
5. The assignment step is shown even when the new layout has more slots than widgets and auto-assignment would be unambiguous. The extra step adds friction to a no-decision scenario.
6. Widgets jump to their new positions instantly when a layout is applied. On a wall-mounted ambient display the jump is jarring.

These issues compound: the user hesitates to switch layouts because they fear data loss, and when they do, the interaction feels mechanical. The layout system should feel trustworthy and fluid.

## Behavior

### Improvement 1 — Grouped preset picker

The flat grid in step 1 is replaced with three labeled sections. Within each section the grid is still 3 columns wide.

**Section: Simple** — Focus, Split (left/right), Top/Bottom
**Section: Grid** — 2x2, 3x2, 4x2
**Section: Asymmetric** — Dashboard, Dashboard (R), Sidebar Left, Sidebar Right, Big+Strip, Header+3, Mosaic

Each section has a small uppercase label (e.g. "SIMPLE", "GRID", "ASYMMETRIC") rendered as a subdued section header between the card rows. There is no interactive behavior on the section header — it is purely visual.

Sidebar Left and Sidebar Right remain as two separate cards under Asymmetric. A flip toggle within one card would compress the section but would hide the visual difference; separate cards make the slot shape instantly visible in the thumbnail.

The "Custom (AI)" entry is not shown in this list (it is already excluded by the existing filter).

### Improvement 2 — Aspect-ratio-aware initial assignment

When the assignment step initializes (or when the auto-assignment path fires, see improvement 5), widgets are matched to slots by aspect ratio similarity rather than positional index.

For each widget, compute its aspect ratio (width / height). For each slot, compute the slot's aspect ratio. Match widgets to slots using a greedy nearest-aspect-ratio algorithm: sort slots by aspect ratio, sort widgets by aspect ratio, match greedily from closest pair. Slots receive at most one widget. Unmatched widgets go into the pool (or are hidden, per improvement 3).

The user sees the result of this matching in the assignment canvas. They can still drag to override.

### Improvement 3 — Non-destructive layout switching

Widgets that are not assigned to a slot in the new layout are never deleted. Instead, they are marked hidden. Hidden widgets are retained in the board's widget list but are not rendered on the canvas.

When the user later switches to a layout with more slots, the hidden widgets become eligible for auto-assignment (improvement 2) or manual assignment in the assignment canvas. They are restored and rendered again.

Specific behavior:

- The "X widgets will be removed" warning in the assignment canvas footer changes to "X widgets will be hidden". The danger-red color and warning icon are kept because the widgets will disappear from the board — the distinction is that they are recoverable.
- The widget pool in the assignment canvas still shows hidden-eligible widgets. The user can drag them into slots before applying.
- On Apply, any widget not assigned to a slot gets `hidden: true` in its widget record. It is not deleted from the store.
- When a layout is applied and hidden widgets can now fit in the new layout's empty slots, they are automatically surfaced in the auto-assignment pass and become visible again. This happens without extra user interaction.
- There is no explicit "restore hidden widgets" UI in v1. Recovery happens implicitly through the auto-assignment on the next layout switch.

Risk note: this changes the shape of `WidgetLayout` (adding `hidden`) and of the `setLayout` action. This is a persisted state change and requires a migration. Flag for Lead.

### Improvement 4 — Slot labels in the assignment canvas

Preset slots have human-readable labels defined alongside their coordinates (e.g., "Main", "Sidebar", "Top", "Strip 1"). These labels appear inside the drop zone of the assignment canvas when the slot is empty, replacing or supplementing the current "drop here" placeholder.

When a slot has a widget assigned, the label is not shown (the widget chip fills the zone).

Labels are optional; slots without a label fall back to the current "drop here" placeholder. The `label` field already exists on the `LayoutSlot` type — this improvement wires up the data (adding labels to presets) and the display (rendering them in the canvas).

Label text for existing presets:

| Preset | Slot id | Label |
|---|---|---|
| focus | main | Main |
| split-h | left, right | Left, Right |
| split-v | top, bottom | Top, Bottom |
| triple | col-1/2/3 | Col 1, Col 2, Col 3 |
| triple-rows | row-1/2/3 | Row 1, Row 2, Row 3 |
| grid-2x2 | tl/tr/bl/br | Top Left, Top Right, Bottom Left, Bottom Right |
| grid-3x2 | r1c1…r2c3 | Row 1 Col 1 … Row 2 Col 3 |
| grid-4x2 | r1c1…r2c4 | Row 1 Col 1 … Row 2 Col 4 |
| dashboard | main, side-top/mid/bot | Main, Top, Middle, Bottom |
| dashboard-r | side-top/mid/bot, main | Top, Middle, Bottom, Main |
| sidebar-l | left-col, top-right, top-far, bottom | Sidebar, Top Center, Top Right, Main |
| sidebar-r | top-left, top-wide, bottom, right-col | Top Left, Top Wide, Main, Sidebar |
| big-strip | main, strip-1/2/3 | Main, Strip 1, Strip 2, Strip 3 |
| header-3 | header, col-1/2/3 | Header, Col 1, Col 2, Col 3 |
| mosaic | tl, tr-top, tr-bot, bl-l, bl-r, br | Main, Top Right, Mid Right, Bottom Left, Bottom Center, Bottom Right |

### Improvement 5 — Skip assignment step when not needed

When the user selects a new layout, the system checks: does the new layout have at least as many slots as the number of non-hidden widgets on the board?

If yes: auto-assign using the aspect-ratio algorithm (improvement 2), then apply immediately. The picker closes. No assignment canvas is shown.

If no: proceed to the assignment canvas (step 2) as today, with the pre-populated aspect-ratio-aware assignment (improvement 2) already filled in.

The threshold is widget count, not slot count. If the board has 3 widgets and the new layout has 4 slots, the skip applies. If the board has 5 widgets and the new layout has 4 slots, the canvas is shown.

This means switching from a larger layout to a simpler one (e.g., Dashboard 4-slot to Focus 1-slot when there is 1 widget) is instant with no modal. Switching layouts on an empty board is also instant.

### Improvement 6 — Animated widget transitions

When `setLayout` fires and widget positions change, the widgets animate from their old position to the new position rather than jumping.

The animation is a CSS transition on `left`, `top`, `width`, and `height`. Duration is approximately 300ms with an ease-in-out curve.

The animation fires only on layout switch, not during live drag/resize (which must remain synchronous and responsive).

After the animation completes the board looks identical to today's static result. There is no change to widget content or state.

## Acceptance criteria (product-level)

- [ ] Layout picker groups presets into Simple, Grid, and Asymmetric sections with section headers visible between groups
- [ ] Each section header is non-interactive and styled as a subdued label
- [ ] Sidebar Left and Sidebar Right appear as separate cards under Asymmetric
- [ ] Initial slot assignment in the assignment canvas is pre-populated by aspect ratio similarity, not positional index
- [ ] A tall widget is assigned to the tallest available slot; a wide widget is assigned to the widest available slot (approximate matching, not pixel-perfect)
- [ ] Unassigned widgets are marked hidden on Apply; they are not removed from the store
- [ ] The warning in the assignment canvas reads "X Wiigits will be hidden" instead of "X Wiigits will be removed"
- [ ] Switching to a larger layout restores previously hidden widgets into auto-assignment
- [ ] Hidden widgets are not rendered on the canvas
- [ ] Each empty drop zone in the assignment canvas shows a slot label (e.g. "Main", "Sidebar") instead of only "drop here"
- [ ] Drop zones without a label still show "drop here" as a fallback
- [ ] All 15 named presets have labels defined on every slot
- [ ] Selecting a layout where slot count >= current visible widget count applies the layout immediately without showing the assignment canvas
- [ ] Selecting a layout where slot count < current visible widget count shows the assignment canvas pre-populated with best-fit assignment
- [ ] Switching layout on an empty board is instant (no canvas, no modal)
- [ ] Widget positions animate smoothly (~300ms ease-in-out) when a layout is applied
- [ ] The animation does not fire during live drag or resize
- [ ] After animation, widget positions and sizes match the new layout exactly
- [ ] Existing boards are not broken — boards with no hidden widgets behave identically to today
- [ ] Boards persisted before this change load correctly after the migration

## Out of scope (v1)

- An explicit "show hidden widgets" panel or badge count in the board UI
- Undo for layout switches (no history system exists yet)
- Per-board slot label overrides (labels are defined per preset, not per board)
- Animated transitions for drag/resize (those must stay synchronous)
- A flip toggle to mirror sidebar-l/r from a single card
- Custom preset creation from the picker UI
- Aspect ratio matching across widget variants (match on current pixel dimensions only)

## Open questions

[non-blocking] Should hidden widgets from one board be visible in any cross-board inventory screen? Currently no such screen exists, so this is forward-looking only.

[non-blocking] Should the "skip assignment" threshold be based on all non-hidden widgets, or only widgets currently assigned to slots? Unassigned (free-floating) widgets in bento mode technically have no slot, so counting them may cause the canvas to appear when the user expects a skip. Recommend: count only widgets with a slotId (i.e., slot-assigned widgets). Confirm with Lead — this may affect how the check is implemented.

[non-blocking] 300ms is a reasonable default for the layout transition but could feel slow on the wall display at low refresh rates. The Lead may want to expose a duration setting or choose a shorter value (200ms). The product spec does not prescribe the exact value — "approximately 300ms" is the intent.

[blocking] Does adding `hidden: boolean` to `WidgetLayout` require a persist version bump and migration? Yes — confirm with Lead before merging. This is the highest-risk change in this PRD because it touches the persisted store shape and `setLayout` action.
