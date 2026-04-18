# wiigit design system

Use this skill whenever building or editing any UI in this app. All rules are mandatory.

## Core rules

1. **Inline `style` props only** — never Tailwind classes, never CSS modules, never styled-components
2. **CSS variables only for colors** — never hardcode hex values (exception: user-chosen `goal.color` / category accent colors like `CATEGORY_COLORS`)
3. **No UI library components** (no shadcn, no MUI, no Radix) — plain HTML elements only

## CSS variables

```
var(--wt-bg)             page background
var(--wt-text)           primary text
var(--wt-text-muted)     secondary/disabled text
var(--wt-surface)        card/panel background
var(--wt-surface-hover)  hover state background
var(--wt-border)         borders
var(--wt-border-active)  active/focused border
var(--wt-accent)         primary action color
var(--wt-accent-text)    text on accent backgrounds
var(--wt-success)        success/complete
var(--wt-danger)         error/delete
var(--wt-shadow-sm)      small shadow
var(--wt-shadow-md)      medium shadow
var(--wt-shadow-lg)      large shadow
```

## Typography (fontSize as numbers)

```
h1 page title:   fontSize: 20, fontWeight: 700, letterSpacing: '-0.02em'
section label:   fontSize: 12, fontWeight: 600, color: 'var(--wt-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em'
body:            fontSize: 14, fontWeight: 450
label/meta:      fontSize: 12, fontWeight: 450
semibold:        fontWeight: 550 or 600
bold:            fontWeight: 700
```

## Border radius

```
cards/modals:    borderRadius: 16
row items:       borderRadius: 10
buttons:         borderRadius: 9
small elements:  borderRadius: 6
pills/tags:      borderRadius: 999
```

## Page layout pattern

```tsx
<div style={{ position: 'absolute', inset: 0, background: 'var(--wt-bg)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
  {/* Header */}
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px 14px', borderBottom: '1px solid var(--wt-border)', flexShrink: 0 }}>
    <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: 'var(--wt-text)', letterSpacing: '-0.02em' }}>Title</h1>
    <button style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 9, fontSize: 12, fontWeight: 550, background: 'var(--wt-accent)', color: 'var(--wt-accent-text)', border: 'none', cursor: 'pointer' }}>
      New item
    </button>
  </div>
  {/* Scrollable body */}
  <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
    {/* content */}
  </div>
</div>
```

## Card pattern

```tsx
<div style={{ borderRadius: 16, overflow: 'hidden', border: `1px solid ${hovered ? color + '40' : 'var(--wt-border)'}`, background: 'var(--wt-surface)', transition: 'border-color 0.15s' }}>
  <div style={{ height: 3, background: color }} /> {/* colored top bar */}
  <div style={{ padding: '14px 16px 12px' }}>
    {/* content */}
  </div>
</div>
```

## Row item pattern

```tsx
<div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 10, background: hovered ? 'var(--wt-surface-hover)' : 'transparent', transition: 'background 0.15s', cursor: 'default' }}>
```

## Button patterns

```tsx
// Primary
<button style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 9, fontSize: 12, fontWeight: 550, background: 'var(--wt-accent)', color: 'var(--wt-accent-text)', border: 'none', cursor: 'pointer' }}>

// Outline
<button style={{ padding: '6px 14px', borderRadius: 9, fontSize: 12, fontWeight: 550, border: '1.5px solid var(--wt-border)', background: 'transparent', color: 'var(--wt-text)', cursor: 'pointer' }}>

// Danger
<button style={{ padding: '6px 14px', borderRadius: 9, fontSize: 12, fontWeight: 550, background: 'var(--wt-danger)', color: '#fff', border: 'none', cursor: 'pointer' }}>
```

## Modal/overlay pattern

```tsx
<div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={onClose}>
  <div style={{ borderRadius: 16, background: 'var(--wt-surface)', border: '1px solid var(--wt-border)', padding: '24px 24px 20px', boxShadow: '0 24px 64px rgba(0,0,0,0.25)', width: 480, maxWidth: '90vw' }} onClick={e => e.stopPropagation()}>
    <h2 style={{ margin: '0 0 20px', fontSize: 16, fontWeight: 700, color: 'var(--wt-text)' }}>Title</h2>
    {/* content */}
    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 20 }}>
      <button /* outline cancel */ />
      <button /* accent confirm */ />
    </div>
  </div>
</div>
```

## Progress bar pattern

```tsx
<div style={{ height: 5, borderRadius: 4, background: 'var(--wt-border)', overflow: 'hidden' }}>
  <div style={{ height: '100%', background: pct >= 100 ? 'var(--wt-success)' : color, width: `${Math.min(pct, 100)}%`, transition: 'width 0.4s ease' }} />
</div>
```

## Input pattern

```tsx
<input style={{ width: '100%', padding: '8px 12px', borderRadius: 9, fontSize: 14, border: '1.5px solid var(--wt-border)', background: 'var(--wt-bg)', color: 'var(--wt-text)', outline: 'none', boxSizing: 'border-box' }} />
```

## Reference files

- `src/components/RoutinesBoardView.tsx` — canonical page template
- `src/components/TodoBoardView.tsx` — gold standard reference
- `packages/ui-kit/src/global.css` — all CSS variable definitions
