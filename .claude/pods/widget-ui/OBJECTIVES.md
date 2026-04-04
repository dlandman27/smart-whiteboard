# Widget UI Pod — Objectives

This file is the source of truth for the Widget UI pod's goals. All agents in this pod operate to advance these.

## Pod mission

Build and maintain the widget library that makes the smart-whiteboard a personalized, living dashboard.

---

## Global project objectives

These come from the top-level vision of the smart-whiteboard project. Every pod must align to them.

1. **Living dashboard** — the board should feel like it's alive and personalized. Widgets are the primary vehicle for this.
2. **First-class integrations** — Notion, Google Calendar, weather, sports, Spotify are core data sources. Widgets should surface them naturally.
3. **Cohesive UI** — all widgets must use the shared theme system (CSS vars, font tokens, spacing). No widget should feel foreign.
4. **Performance** — the board is always-on. Widgets must not leak memory, must clean up intervals/observers, and must use rAF where appropriate.

---

## Pod initiatives (current)

These are the active, prioritized goals for the Widget UI pod. Update when priorities shift.

### P0 — Code quality (most important — non-negotiable)
Code quality is the highest priority in this pod, above speed, above feature count. A widget that ships broken, inconsistent, or poorly written is worse than no widget. Every PR must pass the full quality bar before merge. The lead must block and send back anything that doesn't meet the standard, no exceptions.

Quality means:
- Zero TypeScript errors (`npx tsc --noEmit` clean)
- Zero hardcoded colors or font values (theme tokens only)
- No memory leaks (intervals, observers, RAF all cleaned up in `useEffect` return)
- No dead code, unused imports, or leftover `console.log`
- No over-engineering (no premature abstractions for one-widget use cases)
- Every configurable option in the spec has a working settings control
- Responsive at all sizes — test at minimum and large dimensions

### P1 — Pattern consistency
All existing widgets should follow the same conventions:
- `useWidgetSettings` hook (not local state for persistent settings)
- Theme CSS vars (no hardcoded colors)
- ResizeObserver for responsive sizing
- Root div with `width/height: 100%` + `boxSizing: border-box`

### P1 — New widget coverage
Priority areas for new widgets (in order):
1. Productivity (focus, habits, routines — extending Pomodoro/Routines direction)
2. Data integrations (more Notion views, Todoist, GitHub issues)
3. Media / ambiance (additional display/info widgets)

### P2 — Settings depth
Existing widgets should have richer settings where it improves UX:
- Widgets with no settings panel that clearly need one
- Settings panels that are missing obvious controls

---

## Definition of done (for any widget)

A widget is done when:
- [ ] Implemented as `XWidget.tsx` (+ `XSettings.tsx` if configurable)
- [ ] Registered in `registry.tsx` with correct metadata
- [ ] Uses theme tokens exclusively (zero hardcoded colors or fonts)
- [ ] Responsive to resize (ResizeObserver or flexbox-based)
- [ ] TypeScript clean (`npx tsc --noEmit` passes)
- [ ] PR reviewed by Dev 2, approved by Lead
- [ ] Merged to `main` via squash commit
