# Aggregation Layer — Unified Tasks & Calendar

## Context

The app currently has siloed integrations: Google Tasks powers the Todo board, Google Calendar powers the Calendar board, and Todoist/iCal exist only as standalone widgets. Users want ONE view that merges all their task/calendar sources — plus a built-in system that works without connecting anything.

## Architecture: Client-Side Aggregation with Provider Pattern

**Why client-side?** External data is pass-through (not stored). Each source has different auth, caching, and error handling. `Promise.allSettled` lets us fetch all sources in parallel — if one fails, the rest still show.

## What We're Building

### New Supabase Tables
- **`tasks`** — built-in todos (title, notes, status, priority 1-4, due, list_name)
- **`events`** — built-in calendar events (title, description, location, start_at, end_at, all_day, calendar_name)
- **`ical_feeds`** column on `user_theme` — account-level iCal feed URLs for the calendar aggregator

### New Server Routes
- **`/api/tasks`** — CRUD for built-in tasks
- **`/api/events`** — CRUD for built-in events

### Normalized Types (`src/types/unified.ts`)
- **`UnifiedTask`** — common shape: title, notes, completed, priority, due, groupName, source (discriminated union: builtin | gtasks | todoist)
- **`UnifiedEvent`** — common shape: title, description, location, start, end, allDay, groupName, source (builtin | gcal | ical)

### Provider Pattern (`src/providers/`)
Each source implements a simple interface:
```
TaskProvider: { isConnected, fetchGroups, fetchTasks, createTask?, toggleTask?, deleteTask? }
EventProvider: { isConnected, fetchGroups, fetchEvents, createEvent?, deleteEvent? }
```

**Task providers**: builtin, gtasks, todoist
**Event providers**: builtin, gcal, ical

New providers = one file + one line in the registry.

### Aggregation Hooks
- **`useUnifiedTasks`** — fetches from all connected task providers in parallel, returns `UnifiedTask[]`
- **`useUnifiedEvents`** — same for events with timeMin/timeMax
- **`useTaskGroups`** / **`useEventGroups`** — for sidebar source picker

### Mutation Routing
`toggleUnifiedTask(task)` → looks at `task.source.provider` → routes to the right provider's toggle method. Same for create/delete. Read-only providers (iCal) have no mutation methods.

### UI Changes

**TodoBoardView** — refactored:
- No more "Connect Google Tasks" blocker — built-in tasks always available
- Sidebar shows sources grouped by provider (My Tasks, Google Tasks, Todoist) with toggle visibility
- Add task input routes to the selected provider
- Read-only providers hide delete button
- Footer link to Connectors to add more sources

**CalendarBoardView** — refactored:
- No more "Connect Google" blocker — built-in events always available
- Sidebar shows all calendar sources (My Calendar, Google Calendar, iCal feeds)
- Create event picker: choose which calendar to create in
- Week/Day/Month views unchanged, just fed unified data

## Implementation Order

1. Migration (`004_builtin_tasks_events.sql`) — additive, no breaking changes
2. Server routes (`tasks.ts`, `events.ts`) — additive
3. Unified types (`src/types/unified.ts`) — additive
4. Providers (`src/providers/tasks/*.ts`, `src/providers/events/*.ts`) — additive
5. Aggregation hooks (`useUnifiedTasks.ts`, `useUnifiedEvents.ts`) — additive
6. Mutation routing hooks — additive
7. **TodoBoardView refactor** — breaking change (isolated to one file)
8. **CalendarBoardView refactor** — breaking change (isolated to one file)

Steps 1-6 are purely additive. Steps 7-8 are the only files that change behavior.

## Files to Create
- `supabase/migrations/004_builtin_tasks_events.sql`
- `server/routes/tasks.ts`
- `server/routes/events.ts`
- `src/types/unified.ts`
- `src/providers/types.ts`
- `src/providers/index.ts`
- `src/providers/tasks/builtin.ts`
- `src/providers/tasks/gtasks.ts`
- `src/providers/tasks/todoist.ts`
- `src/providers/events/builtin.ts`
- `src/providers/events/gcal.ts`
- `src/providers/events/ical.ts`
- `src/hooks/useUnifiedTasks.ts`
- `src/hooks/useUnifiedEvents.ts`
- `src/hooks/useTaskMutations.ts`
- `src/hooks/useEventMutations.ts`

## Files to Modify
- `server/index.ts` — register new routes
- `src/components/TodoBoardView.tsx` — refactor to unified hooks
- `src/components/CalendarBoardView.tsx` — refactor to unified hooks

## NOT in v1
- Drag-and-drop tasks between providers
- Offline caching of external data
- Server-side aggregation endpoint
- Real-time sync for built-in tasks via WebSockets

## Verification
1. Run migration in Supabase
2. Create built-in tasks via the Todo board (no external connections)
3. Connect Google Tasks — verify they appear alongside built-in tasks
4. Connect Todoist — verify all three sources show in sidebar
5. Toggle/complete/delete tasks from each source
6. Same flow for Calendar board with built-in events + Google Calendar + iCal
7. Disconnect a provider — verify other sources still work
8. `npx vitest run` — existing tests still pass
