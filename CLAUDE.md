# CLAUDE.md

## What this is

A **personal life OS** displayed as an ambient smart whiteboard. It runs on a wall-mounted display (Chrome kiosk mode) and is controlled via voice, the Walli AI assistant, or Claude via MCP tools. It is a personal project — not a SaaS product, not multi-tenant.

The core daily loop: check routines, track goals, manage tasks, glance at the calendar. The whiteboard is the ambient display layer on top of that data.

## Commands

```bash
npm run dev        # Start client (port 5173) + server (port 3001) concurrently
npm run client     # Vite dev server only
npm run server     # Express server only (tsx watch)
npm run build      # Production build
npm run mcp        # Run the MCP server (for Claude tool access)
npm run start:kiosk  # Dev + open Chrome kiosk window
npm run test       # Run all tests
```

## Stack

- **Frontend**: React 18, Zustand, TanStack Query, Tailwind CSS, react-rnd
- **Backend**: Express + TypeScript (tsx watch in dev), WebSocket (ws)
- **Database**: Supabase (Postgres) — all persistence goes here
- **Auth**: Supabase JWT in production; `DEV_USER_ID` env var bypasses auth in development
- **Deploy**: Railway (backend + static) at `smart-whiteboard-production.up.railway.app`
- **AI**: Anthropic Claude (claude-sonnet-4-6) via `@anthropic-ai/sdk`
- **MCP**: Single server at `mcp/server.ts` — all Claude tool access goes through here

## Core Data Model

Four first-class entities backed by Supabase (see `supabase/migrations/`):

| Entity | Table(s) | Route prefix |
|--------|----------|--------------|
| **Routines** | `routines`, `routine_completions` | `/api/routines` |
| **Goals** | `goals`, `goal_milestones`, `goal_progress_logs`, `goal_links` | `/api/goals` |
| **Tasks** | `tasks`, `task_lists` | `/api/tasks`, `/api/task-lists` |
| **Events** | `events` | `/api/events` |

Goals support four types: `numeric`, `habit`, `time_based`, `milestone`. Progress is logged separately and `current_value` is updated on each log.

Routines have a period (morning/evening/etc.) and a daily flag. The widget splits them into period and daily sections.

## Architecture

```
src/                    React frontend
  components/
    widgets/            One file per widget type + registry.tsx
      registry.tsx      Master widget registry — all types defined here
    board/              Board canvas, layout, drag/resize
  store/                Zustand stores
  hooks/                TanStack Query hooks (useGoals, useRoutines, etc.)

server/
  index.ts              Express entry point — registers all routers
  routes/               One file per domain (goals.ts, routines.ts, canvas.ts, ...)
  agents/               Scheduler + built-in agents + dynamic user agents
    built-in/           calendarAgent, taskMonitor, routineAgent, focusAgent, ...
    scheduler.ts        Cron-based agent runner
    dynamic-runner.ts   User-defined agents stored in Supabase
  middleware/
    auth.ts             requireAuth — bypassed in dev via DEV_USER_ID
    error.ts            AppError + asyncRoute helpers
  services/             Thin wrappers: gcal, spotify, notify, voice-tools, ...

mcp/
  server.ts             The single MCP server — ALL Claude tools live here

packages/
  ui-kit/               Internal design system (components, tokens, WIDGET_SHAPES)
  sdk/                  Widget SDK (useWidgetSettings hook, etc.)

supabase/
  migrations/           SQL migrations 001–007, applied in order
```

## Widget System

Widgets are defined in `src/components/widgets/registry.tsx` using a **type + variant** model:

```ts
// Each widget type can have multiple variants
{ typeId: '@whiteboard/clock', variants: [{ variantId: 'digital', component: DigitalClockWidget }, ...] }
```

To add a new widget type:
1. Create `src/components/widgets/XxxWidget.tsx` — export `XxxWidget` and optionally `XxxSettings`, both accepting `{ widgetId: string }`
2. Use `useWidgetSettings<T>(widgetId, defaults)` from `@whiteboard/sdk` for persistent settings
3. Register in `registry.tsx` under `BUILTIN_WIDGET_TYPES`
4. Add defaults to `WIDGET_DEFAULTS` and schema to `WIDGET_SETTINGS_SCHEMAS` in `mcp/server.ts`

Widget sizes use `WIDGET_SHAPES` from `@whiteboard/ui-kit`: `small-square` (200×200), `small-wide` (320×200), `medium-square` (320×320), `medium-wide` (480×320), `tall-rect` (300×420), `large-wide` (600×400), `extra-wide` (800×540).

Settings are deep-merged and persisted to Supabase on every change via the `useWidgetSettings` hook.

## MCP Layer

`mcp/server.ts` is the single source of truth for all Claude tool access. It calls the running Express server via `http://localhost:3001` (configurable via `WHITEBOARD_URL` env var).

Key tool groups:
- **Board/widgets**: `list_boards`, `get_board_state`, `create_widget`, `update_widget`, `delete_widget`, `create_html_widget`, `show_gif`
- **Routines**: `list_routines`, `complete_routine`, `create_routine`, `get_routine_streak`
- **Goals**: `list_goals`, `create_goal`, `update_goal`, `log_goal_progress`, `delete_goal`
- **Tasks**: `list_tasks`, `create_task`, `complete_task`, `list_task_lists`
- **Notion**: `list_notion_databases`, `query_notion_database`, `create_notion_page`, etc.
- **Calendar**: `list_events`, `create_event`, `list_calendars`
- **Theme/layout**: `set_theme`, `create_custom_theme`, `create_layout`, `apply_layout`

The `.mcp.json` at the root configures this for Claude Code. The MCP server must be started separately from the web server.

## Agent System

Built-in agents live in `server/agents/built-in/` and run on a cron schedule via `scheduler.ts`. They have access to: `broadcast` (WebSocket to frontend), `speak` (TTS via ElevenLabs), `notify` (ntfy push), `notion`, `anthropic`, `gcal`.

Active built-in agents:
- `calendarAgent` — upcoming meeting alerts
- `taskMonitor` — Notion task deadline alerts
- `routineAgent` — routine completion reminders
- `focusAgent` — focus session management
- `meetingCountdown` — countdown to next meeting
- `endOfDay` — daily wrap-up
- `staleTaskCleanup` — archive old completed tasks

User-defined agents are stored in Supabase and built dynamically via `dynamic-runner.ts`. They use Claude to decide what actions to take given the current board state.

## Key Conventions

- All server errors use `AppError(statusCode, message)` from `server/middleware/error.ts`
- All route handlers are wrapped in `asyncRoute()` to catch async errors
- Auth is `req.userId` — set by `requireAuth` middleware, bypassed in dev
- Widget settings are always deep-merged, never replaced wholesale
- The frontend never hardcodes `localhost:3001` — always uses `/api/...` (proxied by Vite in dev)
- New routes go in `server/routes/`, must be registered in `server/index.ts`

## Environment

Key env vars (see `.env.example` for full list):

```
SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY   — server-side DB access
VITE_PUBLIC_SUPABASE_URL / VITE_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY  — client-side
DEV_USER_ID          — your Supabase user UUID, used instead of JWT in dev
ANTHROPIC_API_KEY    — required for Walli AI and voice commands
NOTION_API_KEY       — global fallback if user hasn't done OAuth
GOOGLE_CLIENT_ID/SECRET  — Google Calendar + Photos OAuth
TENOR_API_KEY        — GIF search widget
YOUTUBE_API_KEY      — YouTube widget voice commands
DEEPGRAM_API_KEY     — speech-to-text
ELEVENLABS_API_KEY   — TTS responses (falls back to browser TTS)
```
