# AI/Agent Layer Pod — Objectives

This file is the source of truth for the AI/Agent pod's goals. All agents in this pod operate to advance these.

## Pod mission

Own the server-side agent runtime: the scheduler, built-in agents, dynamic user-defined agents, and the API surface that connects them to the board and mobile app. This pod makes the board "alive" — it's where Claude-powered automation runs.

---

## Global project objectives

1. **Living dashboard** — agents are the primary mechanism for making the board feel alive. They surface calendar events, speak briefings, clean up tasks, monitor routines.
2. **First-class integrations** — agents have full access to Notion, GCal, Anthropic, and the board. Use them purposefully.
3. **Performance** — agents run on a shared scheduler. A slow or crashing agent degrades the whole system. Errors must be caught and logged, never left to propagate.

---

## Architecture (know this cold)

### Agent runtime (`server/agents/`)
- `types.ts` — `Agent` interface, `AgentContext` interface, `AgentRun` record
- `scheduler.ts` — `AgentScheduler` class: registers agents, ticks every 60s, tracks run history, exposes `runNow()` / `status()` / `setEnabled()`
- `index.ts` — `createScheduler(ctx)`: registers all built-in agents, loads dynamic agents, returns the scheduler
- `dynamic-runner.ts` — `UserAgentDef`, CRUD over SQLite (`user_agents` table), `buildDynamicAgent()` (calls Claude haiku at runtime), `loadDynamicAgents()`
- `built-in/*.ts` — each exports a single `Agent` object; currently: `calendarAgent`, `focusAgent`, `routineAgent`, `meetingCountdownAgent`, `endOfDayAgent`, `staleTaskCleanupAgent`, `taskMonitorAgent`

### AgentContext (what every agent can do)
```typescript
ctx.broadcast(msg)      // WebSocket → board UI
ctx.speak(text)         // TTS on the board
ctx.notify(title, body, opts)  // push notification via ntfy
ctx.notion              // Notion SDK client
ctx.anthropic           // Anthropic SDK client
ctx.gcal                // OAuth2 GCal client (null if unconfigured)
ctx.boards              // current board snapshot
ctx.activeBoardId       // active board id
```

### Dynamic agents
- Stored in SQLite `user_agents` table (via `server/services/db.ts`)
- Managed by `dynamic-runner.ts`
- At runtime, `buildDynamicAgent()` calls Claude haiku with the agent's `description` as instructions
- Respond with JSON: `{ speak, notify, broadcast, skip }`

### API surface (`server/routes/agents.ts`)
- `GET /api/agents` — list all agents with status
- `POST /api/agents` — create a new dynamic agent
- `PATCH /api/agents/:id` — enable/disable or update
- `DELETE /api/agents/:id` — remove a dynamic agent
- `POST /api/agents/:id/run` — force-run an agent now

---

## Pod conventions (enforce these)

### Built-in agents
- Every handler is a self-contained `Agent` object exported from `server/agents/built-in/<name>.ts`
- Registered in `server/agents/index.ts` via `scheduler.register()`
- All errors caught internally — `agent.run()` must NEVER throw (the scheduler will log it, but a crash wastes the tick)
- Use `log`/`warn`/`error` from `server/lib/logger.ts` — no `console.log`
- Speak/notify only when there is something genuinely useful to say — don't fire on every tick
- `intervalMs` must be realistic: minimum 5 minutes (300_000) for most agents

### Dynamic agents
- `description` is the agent's "prompt" — it must be specific enough for Claude haiku to act correctly
- `buildDynamicAgent` response parsing: always extract JSON with a regex, never assume clean output
- `skip: true` is always an acceptable response — agents should be quiet when there's nothing to do

### API routes
- All mutations (create/update/delete) also update the live scheduler in memory — not just the DB
- Route errors go through `next(err)` — never swallow

---

## Pod initiatives (current)

### P0 — Reliability
Every agent run must be safe:
- Errors caught and logged, never propagated to the scheduler tick
- Agents that require external services (GCal, Notion) check availability before use
- No agent runs more than once per tick period regardless of scheduler lag

### P1 — New built-in agents
Priority areas:
1. Productivity agents (focus session start/end, habit streak checks)
2. Integration-aware agents (Notion page change summary, calendar conflict detector)
3. Board-aware agents (widget data freshness check, widget count alerts)

### P2 — Dynamic agent quality
- The haiku prompt in `buildDynamicAgent` should give Claude enough board context to act usefully
- Consider including widget settings summaries in `summarizeBoards()`

---

## Definition of done (for any agent change)

- [ ] TypeScript clean (`npx tsc --noEmit`)
- [ ] Agent errors caught — `run()` never throws
- [ ] Uses `log`/`warn` from logger, no `console.log`
- [ ] Realistic `intervalMs` (≥ 5 min for most)
- [ ] Registered in `server/agents/index.ts` if built-in
- [ ] API route updated if surface changed
- [ ] PR reviewed by Dev 2, approved by Lead
- [ ] Merged to `main` via squash commit
