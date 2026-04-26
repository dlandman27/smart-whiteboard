# Widget PRD: Interior Visual Redesign

**Status:** ready

## One-liner
Upgrade the interior visual treatment of the five core widgets — Routines, Goals, TaskList, Calendar, and Spotify — so they are glanceable from 1.5 metres and feel as polished as the outer frame that wraps them.

## Problem / motivation
The widget shell (`Widget.tsx`) already ships with beautiful bones: 3rem border-radius, a layered shadow stack, and glass/solid/borderless style modes. The interior content does not match. Body copy sits at 10–13px, progress bars are 3–4px tall, inner cards fight the outer frame with mismatched radii, and accent colors are buried on tiny checkboxes. On a wall-mounted 1080p display viewed from across a room, the widgets are effectively unreadable. This redesign closes that gap without touching any data, API, or settings logic.

## User stories
- As a user glancing at the board from my couch, I want to read my morning routine items and goal progress at a glance, without squinting or moving closer.
- As a user, I want the category of each routine group (morning / daily / evening) to be immediately obvious from across the room, not something I have to decode from tiny labels.
- As a user, I want loading states to look intentional and designed, not like a broken widget.
- As a user, I want completed or inactive items to feel visually retired, not just struck through.

## Behavior

### Design principles
- **Wall-display-first.** If text or a progress bar is not readable at 1.5m, it is too small. Minimum body text 15px, minimum headers 18px, minimum captions 13px (muted contexts only).
- **Interiors must match the outer frame.** The outer shell uses 3rem radii and a premium shadow. Inner items should use 12–16px radii and generous padding so the inside feels like it belongs in the same design language — not like a data table squeezed inside a pill.
- **Accent colors do the work.** Category colors, priority colors, and calendar event colors should dominate their section — a colored stripe, a tinted band, or a bold colored label — not appear only on a 16px icon or dot.
- **Completion is opacity, not strikethrough.** A checked-off routine, a completed task, or a done goal should reduce to ~35–40% opacity and be visually pushed to the bottom of its group. Strikethrough is hard to read at distance.

### RoutinesWidget
What changes:
- Section headers (Morning, Daily Habits, Evening) gain a left-border accent stripe 4px wide in the category color (orange / blue / purple). Header label increases to 18px bold. The header row gets a very light tint of the category color as a background band — enough to anchor it visually, not enough to overpower.
- Routine item buttons: padding increases to 10px vertical, 14px horizontal. Border-radius increases to 14px. Font size increases to 15px. The checkbox increases to 22px diameter.
- Completed routines: opacity 35%, pushed below incomplete items within their section. No strikethrough.
- Progress bars (if shown): height 7px, fully rounded ends, with a visible track in `--wt-surface`.
- Loading state: replace plain "Loading..." text with 3–4 skeleton rows — rounded rectangles at the correct item height, animated with a subtle pulse using `--wt-surface` and `--wt-surface-hover`.

What stays:
- Period grouping logic (morning / daily / evening) is unchanged.
- Checkbox completion interaction is unchanged.
- All settings (period filter, etc.) are unchanged.

### GoalsWidget
What changes:
- Goal cards: padding increases to 14px. Border-radius increases to 16px. Background uses `--wt-surface` to create depth against the widget background.
- Goal title: 17px, weight 600.
- Progress bar: height 7px, fully rounded. Track in `--wt-surface-hover`. Fill in the goal's accent color (or `--wt-accent` if none).
- Percentage label: remains large (42px is good), but sub-labels (milestone count, days remaining) increase from 10–11px to 14px.
- Focus mode card: the percentage numeral and goal title should both be comfortably readable at distance. Title: 20px minimum. The sub-detail row: 14px.
- Empty/done goals: opacity 40%, visually de-prioritised.
- Loading state: skeleton cards — two rounded rectangles with a slim skeleton progress bar beneath each, pulsing.

What stays:
- Focus mode toggle is unchanged.
- Goal type rendering logic (numeric / habit / milestone / time_based) is unchanged.
- All settings are unchanged.

### TaskListWidget
What changes:
- Header: list name increases to 17px bold. The active-count badge increases to 13px, with 4px vertical / 10px horizontal padding.
- Task rows: padding increases to 10px vertical, 12px horizontal. Border-radius increases to 14px. Title font size increases to 15px.
- Checkbox: diameter increases to 22px. Priority color (red / amber / blue / muted) moves from the border only to fill the entire circle outline at full opacity, making it readable at distance.
- Overdue indicator: the date label increases to 12px, and the overdue row gets a left-border accent stripe in red (4px wide) instead of (or in addition to) the faint red background.
- Due date label: 12px on normal tasks, 13px bold on overdue tasks.
- Completed tasks: opacity 35%. Strikethrough removed — rely on the checked-circle and opacity alone.
- Quick-add input: font size 15px, padding 10px vertical.
- Loading state: 3 skeleton task rows — rounded rectangles + a small circle on the left, pulsing.
- Empty state ("All done!"): center-aligned, 16px, styled to feel celebratory rather than like an error — use `--wt-success` color at 60% opacity.

What stays:
- Toggle interaction is unchanged.
- Quick-add (Enter to confirm, Escape to cancel) is unchanged.
- showCompleted setting is unchanged.

### CalendarWidget
What changes:
- Day view EventRow: the left-edge color bar increases from 2px (`w-0.5`) to 4px. Event title increases to 15px. Time range increases to 13px. Row padding increases to 12px vertical, 14px horizontal.
- Week view: day label (Mon/Tue...) increases to 14px bold. Date numeral increases to 16px. Event title in week rows increases to 14px. Time annotation increases to 12px. Today row gets a slightly stronger tint using `--wt-surface`.
- Month view: day numbers increase to 14px. Event dots increase from 4px to 6px diameter. The overflow count ("+2") increases to 11px. Today cell gets a more prominent filled circle behind the date number using `--wt-accent` at 20% opacity.
- Loading state ("Loading events..."): replace animated-pulse text with a skeleton of 4–5 event row shapes, pulsing.
- All-day / timed divider in Day view: increase contrast slightly.
- Disconnected state icon: increase to 36px, label to 15px.

What stays:
- Day / Week / Month tab toggle is unchanged.
- Prev / Next navigation is unchanged.
- Calendar ID setting is unchanged.

### SpotifyWidget
What changes:
- Progress bar height: 3px increases to 6px. Track background increases in opacity.
- Time labels (elapsed / total): increase from the current caption size to 13px.
- Track title: remains at `heading/small` but the effective rendered size should be at least 17px.
- Artist name: increases to 15px.
- Play/pause button: diameter increases from 44px to 52px. Skip buttons increase from 32px to 38px.
- Album art shadow: already uses `--wt-shadow-lg`, which is good — keep it.
- "Nothing playing" state: Spotify icon increases to 48px, label increases to 16px.
- Connecting/spinner state: spinner increases from 20px to 28px diameter, stroke 3px.

What stays:
- Blurred album-art backdrop behavior is unchanged — it is already the best visual element in this widget.
- Auth flow and settings panel are unchanged.
- Poll interval (5 seconds) is unchanged.

## Settings / preferences
No new settings are introduced by this redesign. All changes are purely visual — sizing, spacing, color emphasis, and skeleton states.

## Acceptance criteria (product-level)
- [ ] Routine section headers (Morning / Daily / Evening) are visually distinct with their category accent color and legible at 1.5m from a 1080p display.
- [ ] All widget body text (task names, routine names, goal titles, event titles) renders at minimum 15px.
- [ ] All progress bars render at minimum 6px height with rounded ends and a visible track.
- [ ] Inner cards and list items use border-radius of 12px or larger, consistent with the outer frame language.
- [ ] Completed tasks, done routines, and inactive goals use opacity reduction (maximum 40%) rather than strikethrough as the primary visual cue.
- [ ] All five widgets show a skeleton loading state (animated pulse, correctly shaped to their content) instead of plain "Loading..." text.
- [ ] The Spotify progress bar is 6px tall and time labels are legible at distance.
- [ ] Calendar event color bars are 4px wide and event titles are minimum 15px.
- [ ] The overdue task state in TaskListWidget uses a left-border red accent stripe that is clearly visible at distance.
- [ ] No hardcoded color values are introduced — all colors reference existing `--wt-*` CSS variables or established category-color constants already in the codebase.
- [ ] All five widgets look correct at their minimum supported size and at large size.

## Out of scope (v1)
- Any changes to data fetching, API calls, or business logic.
- New widget settings or configuration options.
- Changes to the widget shell (`Widget.tsx`), drag/resize behavior, or layout system.
- New CSS custom properties (no new `--wt-*` tokens; use what exists).
- Dark/light theme switching logic — the redesign must work correctly on whichever theme is active, but theme-switching itself is out of scope.
- Animation beyond the skeleton pulse (no entrance transitions, no celebration confetti).
- The clock, weather, or any other widget not listed above.

## Open questions
- [non-blocking] Should the category color tint on RoutinesWidget section headers be derived from a fixed palette (orange / blue / purple) hardcoded per period name, or should there be a way for the user to override period colors in the future? For v1, hardcoded is fine — just flag if the implementation buries these values somewhere impossible to extract later.
- [non-blocking] The GoalsWidget focus mode shows a single goal at full size. Should the skeleton for focus mode be the same full-bleed skeleton, or a simplified version? Either is acceptable — lead's call.
- [non-blocking] CalendarWidget month view dots are already very small. At 6px they may crowd on days with 3 events. Is 5px acceptable if 6px causes layout overflow? Lead's call on the exact value within the 5–7px range.
