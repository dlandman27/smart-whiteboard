# Data/Integration Pod — Objectives

This file is the source of truth for the Data/Integration pod's goals. All agents in this pod operate to advance these.

## Pod mission

Own the full data layer: Express routes, frontend hooks, and integration adapters that connect the board to external sources (Notion, Google Calendar, Spotify, sports, weather, YouTube, etc.).

---

## Global project objectives

These come from the top-level vision of the smart-whiteboard project. Every pod must align to them.

1. **First-class integrations** — Notion, Google Calendar, weather, sports, Spotify are core. The data layer must surface them reliably and efficiently.
2. **Living dashboard** — widgets need fresh, real data. Hooks must have sensible refetch intervals and cache invalidation.
3. **Cohesive API contract** — all routes follow the same Express patterns. All hooks follow the same TanStack Query patterns.
4. **Performance** — no over-fetching. Use `enabled` guards, appropriate `refetchInterval`, and optimistic updates for mutations.

---

## Stack

- **Backend:** Express routes in `server/routes/*.ts`, registered in `server/index.ts`
- **Frontend:** TanStack Query hooks in `src/hooks/use<Source>.ts`
- **Adapters:** thin wrappers over external SDKs; normalization happens in the route or hook, not in the widget
- **Auth/tokens:** OAuth tokens stored via `server/services/tokens.ts`; Notion API key from env

## API conventions (enforce these)

- Routes: `GET /api/<resource>`, `POST /api/<resource>`, `PATCH /api/<resource>/:id`, `DELETE /api/<resource>/:id`
- All routes pass through `server/index.ts` via `app.use('/api', xRouter(client))`
- Error handling: all errors go through `server/middleware/error.ts` — throw or call `next(err)`
- Logging: use `log`/`warn` from `server/lib/logger.ts`, never `console.log`

## Hook conventions (enforce these)

- File: `src/hooks/use<Source>.ts`
- Use `useQuery` for reads, `useMutation` for writes
- All fetches via `apiFetch<T>(path, options?)` helper (defined inline in each hook file or imported)
- `queryKey` format: `[resource, ...discriminators]` e.g. `['gcal-events', calendarId]`
- `refetchInterval`: 30s for live data (calendar, tasks), 60s for slower data (weather, weight), none for static
- Mutations must `invalidateQueries` on success
- Optimistic updates for list mutations (add/remove/update) following `useNotion.ts` pattern

---

## Pod initiatives (current)

### P0 — Correctness and reliability (non-negotiable)
Every route and hook must be correct before shipping:
- Routes return the right shape, handle errors, never leak credentials
- Hooks have correct `enabled` guards (no fetch with empty string IDs)
- Mutations invalidate the right query keys
- TypeScript clean — no `any` in route handlers or hook return types where avoidable

### P1 — Pattern consistency
All integrations follow the same structure. A dev picking up a new integration should be able to copy the Notion pattern and fill in the blanks.

### P1 — New integration coverage
Priority order for new integrations:
1. Todoist (task management — natural complement to Notion tasks)
2. GitHub (issues/PRs widget)
3. Any additional Notion views needed by the widget pod

### P2 — Type safety
Normalize external API responses to typed interfaces. Notion's API returns `any` throughout; route handlers should map to local types before returning.

---

## Definition of done (for any integration)

An integration is done when:
- [ ] Express route(s) implemented in `server/routes/<source>.ts`
- [ ] Router registered in `server/index.ts`
- [ ] Frontend hook(s) implemented in `src/hooks/use<Source>.ts`
- [ ] TypeScript clean (`npx tsc --noEmit` passes)
- [ ] No hardcoded credentials — env vars only
- [ ] Optimistic updates for any write mutations
- [ ] PR reviewed by Dev 2, approved by Lead
- [ ] Merged to `main` via squash commit
