# SportsWidget Fix Verification Checklist
## Spec: 79481a93 | Branch: widget/sports-widget-verify-79481a93

This document is the QA sign-off record for the SportsWidget fix chain
(e1a16c41 → 2358a13f → 78cf584c → fa080275 → dbbc00cc → 79481a93).

---

## Pre-flight: Frozen Files

| File | Status |
|------|--------|
| `src/hooks/useSports.ts` | ✅ Unchanged |
| `server/routes/sports.ts` | ✅ Unchanged |
| `src/components/widgets/SportsSettings.tsx` | ✅ Unchanged |
| `src/components/widgets/registry.tsx` | ✅ Unchanged — `{ width: 340, height: 420 }` confirmed |

---

## Bug 1 — Logo / Fallback Badge

- [x] `TeamLogo` component exists with per-instance `useState(false)` for `imgError`
- [x] `<img>` has `crossOrigin="anonymous"` and `onError={() => setImgError(true)}`
- [x] When `imgError === false`: renders `<img alt="{abbr} logo" crossOrigin="anonymous" onError={...} />`
- [x] When `imgError === true`: renders `<span aria-label={abbr}>` fallback badge with `background: var(--wt-surface-raised)`, `color: var(--wt-text-muted)`
- [x] Fallback text is `abbr.slice(0, 3)` — max 3 chars
- [x] No broken-image icon possible in any state

## Bug 2 — Horizontal Overflow

- [x] Team name columns: `flex: 1; minWidth: 0; overflow: 'hidden'`
- [x] Score column: `flexShrink: 0; minWidth: 64`
- [x] All text nodes: `whiteSpace: 'nowrap'; overflow: 'hidden'; textOverflow: 'ellipsis'`
- [x] No fixed `minWidth` on team columns
- [x] Root shell div: `minWidth: 0`

## Bug 3 — Game Grouping

- [x] `liveGames` = `data.filter(g => g.status === 'in')`
- [x] `upcomingGames` = `data.filter(g => g.status === 'pre')`
- [x] `finalGames` = `data.filter(g => g.status === 'post')`
- [x] Render order: Live → Upcoming → Final
- [x] Empty sections hidden (conditional rendering with `.length > 0`)
- [x] `SectionHeader` has `role="heading"` and `aria-level={3}`
- [x] Section header text: uppercase, `color: var(--wt-text-muted)`, `fontSize: clamp(9px, 2.5cqw, 11px)`, `letterSpacing: '0.08em'`
- [x] Live section header has pulsing dot: `background: var(--wt-danger)`, `animation: 'pulse 1.5s infinite'`
- [x] `sortWithinGroup` sorts favorite team's game to index 0 within its section

## Bug 4 — Hardcoded Colors

- [x] Zero hardcoded hex/rgb values in `SportsWidget.tsx` (verified programmatically)
- [x] Live score text: `color: var(--wt-danger)`
- [x] Live dot: `background: var(--wt-danger)`
- [x] Favorite highlight: `background: color-mix(in srgb, var(--wt-accent) 10%, transparent)`
- [x] Favorite border: `borderLeft: '2px solid var(--wt-accent)'`

## Bug 5 — Hardcoded Font Sizes

- [x] No hardcoded `px` font sizes outside `clamp()` expressions
- [x] Abbr text: `clamp(11px, 3.5cqw, 14px)`
- [x] Score text: `clamp(12px, 4cqw, 16px)`
- [x] Caption/record/header: `clamp(9px, 2.5cqw, 11px)`

## Responsive Behavior

- [x] `SportsShell` uses `useRef<HTMLDivElement>` + `ResizeObserver` (WeatherWidget pattern)
- [x] `containerWidth` in `useState(340)` — sensible default
- [x] `containerWidth` passed to every `GameRow`
- [x] `GameRow` signature: `{ game: Game; favoriteTeam: string; containerWidth: number }`
- [x] `showRecords = containerWidth >= 280` — records hidden below 280px
- [x] Logo size: `Math.max(18, Math.min(28, Math.round(containerWidth * 0.07)))` — responsive

## Accessibility

- [x] Game list container: `role="list"`
- [x] Each `GameRow` root: `role="listitem"`
- [x] Live status text: `<span aria-live="polite">`
- [x] Section headers: `role="heading" aria-level={3}`
- [x] Logo `<img>`: `alt="{abbr} logo"`
- [x] Fallback badge `<span>`: `aria-label={abbr}`

## TypeScript

- [x] `npx tsc --noEmit` passes with zero errors (verified)
- [x] No `any` types in `SportsWidget.tsx` (verified programmatically)

---

## Sign-off

**Lead Engineer:** All 5 bugs verified fixed. TypeScript clean. Frozen files untouched.
**Spec chain closed:** e1a16c41 → 2358a13f → 78cf584c → fa080275 → dbbc00cc → **79481a93 ✅**
