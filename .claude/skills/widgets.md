---
name: widgets
description: Work on the Widgets & Integrations pillar — new widgets, server integrations, connectors, widget quality. Use when building new widgets or improving existing ones.
---

# Widgets & Integrations Pillar

You are working on the Widgets & Integrations pillar. Currently 34 widgets, 8 connectors, 17 API routes.

## Architecture

### Frontend widget pattern
- Widget: `src/components/widgets/{Name}Widget.tsx` — component receiving `{ widgetId: string }`
- Settings: `src/components/widgets/{Name}Settings.tsx` — optional settings panel
- Registry: `src/components/widgets/registry.tsx` — central registration of all widgets
- Hooks: `useWidgetSettings<T>(widgetId, defaults)` from `@whiteboard/sdk`
- UI kit: `Container`, `Center`, `FlexCol`, `FlexRow`, `Text`, `Icon`, `Toggle`, `SegmentedControl`, `SettingsSection` from `@whiteboard/ui-kit`
- Icons: Phosphor Icons via `<Icon icon="IconName" />` (NOT Lucide)
- Size context: `useWidgetSizeContext()` for responsive rendering

### Server route pattern
- Routes: `server/routes/{service}.ts` — Express Router with `asyncRoute()` wrapper
- Services: `server/services/{service}.ts` — API client logic
- Registration: mount in `server/index.ts` as `app.use('/api', router())`
- Auth: all routes behind `requireAuth`, user ID via `req.userId!`
- Errors: throw `AppError(statusCode, message)` from `server/middleware/error.ts`

### Widget registry entry
```typescript
{
  typeId:      '@whiteboard/{name}',
  label:       'Display Name',
  Icon:        'PhosphorIconName',
  iconColor:   '#hex',
  keywords:    ['search', 'terms'],
  description: 'User-facing description',
  variants: [{
    variantId:         'default',
    label:             'Variant Name',
    description:       'Description',
    shape:             WIDGET_SHAPES['medium-square'], // small-square, small-wide, medium-square, medium-wide, tall-rect, large-wide, extra-wide
    scalable:          true,
    constraints:       { minWidth, minHeight, maxWidth, maxHeight },
    component:         WidgetComponent,
    settingsComponent: SettingsComponent,
  }]
}
```

## Current state (6/10)

**34 widgets**: Clock (3), Countdown, Quote, Weather, Sports (11 leagues x 3 variants), Note, Pomodoro, HTML, YouTube, Notion View, Website, Routines, Spotify, Timers, World Cup, Calendar, Database, Walli Agent, Split Container, Google Photos, RSS/News

**8 connectors**: Google Calendar, Google Tasks, Spotify, Notion, Walli AI, ElevenLabs, YouTube, Bing Search

**Quality issues**:
- Settings panels: 22 of 34 (65%) — Calendar, Database, HTML, Timers, World Cup missing
- Error/loading states inconsistent across widgets
- Most integrations read-only; only Notion has full CRUD

**Missing widget categories**:
- Stocks / crypto
- Traffic / commute (Google Maps)
- Smart home (Home Assistant)
- Social media feeds
- iCal feed support
- Todoist / other task managers

## Key files

- `src/components/widgets/registry.tsx` — Widget registry (alphabetically sorted)
- `src/components/widgets/types.ts` — WidgetTypeDef, WidgetVariantDef interfaces
- `src/sdk/useWidgetSettings.ts` — Settings hook
- `packages/ui-kit/src/` — UI component library
- `packages/ui-kit/src/widgetTokens.ts` — WIDGET_SHAPES
- `packages/ui-kit/src/theme/typography.ts` — Text variants: display|heading|title|body|label|caption, sizes: large|medium|small
- `server/routes/` — All API routes
- `server/services/` — Service layer
- `server/middleware/error.ts` — AppError, asyncRoute
- `src/components/ConnectorsBoardView.tsx` — Connectors page

## Conventions

- Widget registry is auto-sorted alphabetically — just add entries anywhere
- Text component: `variant` = display|heading|title|body|label|caption, `size` = large|medium|small (NO xsmall)
- Icon component: `icon` prop (string), NOT `name` — uses Phosphor Icons
- Icon `style` prop for colors, NOT `color` prop directly
- OAuth integrations: reuse existing Google OAuth in `server/services/gcal.ts`
- Credential storage: encrypted via `server/services/credentials.ts`
- Server-side caching: simple in-memory Map with TTL for external API calls
- RSS parser: custom built-in parser in `server/routes/rss.ts` (no rss-parser dependency)

## When working on this pillar

1. Read an existing similar widget before building a new one
2. Every widget MUST handle: loading state, error state, empty/unconfigured state
3. Use `@whiteboard/ui-kit` components — don't reinvent
4. Dark theme compliance — use CSS vars (`var(--wt-text)`, `var(--wt-bg)`, etc.), never hardcode colors
5. Server routes must use `asyncRoute()` wrapper and throw `AppError` for errors
6. Add rate limiting for new OAuth endpoints in `server/index.ts`
7. Register new routes in `server/index.ts` and new widgets in `registry.tsx`
8. Test widgets at multiple sizes — use `useWidgetSizeContext()` for responsive behavior
