# Routes

## CRUD Resources

- **`/agents`** GET | POST | GET/:id | PATCH/:id | DELETE/:id → Agent
- **`/canvas/board`** POST | PATCH/:id | DELETE/:id → Board
- **`/canvas/widget`** POST | PATCH/:id | DELETE/:id → Widget
- **`/credentials`** POST | GET/:id | DELETE/:id → Credential
- **`/databases`** GET | GET/:id | DELETE/:id → Database

## Other Routes

- `GET` `*` [auth, ai]
- `GET` `/test` params() [auth] ✓
- `GET` `/health` params() [auth] ✓
- `GET` `/gcal/callback` params() [auth] ✓
- `GET` `/spotify/callback` params() [auth] ✓
- `GET` `/api/test` params() [auth] ✓
- `GET` `/api/health` params() [auth] ✓
- `GET` `/api/gcal/callback` params() [auth] ✓
- `GET` `/api/spotify/callback` params() [auth] ✓
- `GET` `/boom` params() [auth] ✓
- `GET` `/sync-boom` params() [auth] ✓
- `GET` `/ok` params() [auth] ✓
- `POST` `/agents/:id/run` params(id) [db]
- `GET` `/canvas/boards` params() [db]
- `POST` `/canvas/board/:id/activate` params(id) [db]
- `GET` `/briefing` params() [auth]
- `POST` `/briefing/settings` params() [auth]
- `GET` `/briefing/settings` params() [auth]
- `GET` `/canvas/widgets` params() [auth, db, ai]
- `POST` `/canvas/clear-widgets` params() [auth, db, ai]
- `POST` `/canvas/layout` params() [auth, db, ai]
- `POST` `/canvas/focus-widget` params() [auth, db, ai]
- `POST` `/canvas/theme` params() [auth, db, ai]
- `POST` `/canvas/custom-theme` params() [auth, db, ai]
- `POST` `/theme/generate` params() [auth, db, ai]
- `GET` `/gcal/status` params() [auth, db]
- `POST` `/gcal/connect` params() [auth, db]
- `POST` `/gcal/disconnect` params() [auth, db]
- `GET` `/gcal/calendars` params() [auth, db]
- `GET` `/gcal/events` params() [auth, db]
- `POST` `/gcal/events` params() [auth, db]
- `DELETE` `/gcal/events/:calendarId/:eventId` params(calendarId, eventId) [auth, db]
- `GET` `/gtasks/status` params() [auth, db]
- `GET` `/gtasks/lists` params() [auth, db]
- `GET` `/gtasks/tasks` params() [auth, db]
- `POST` `/gtasks/tasks` params() [auth, db]
- `PATCH` `/gtasks/tasks/:taskListId/:taskId` params(taskListId, taskId) [auth, db]
- `DELETE` `/gtasks/tasks/:taskListId/:taskId` params(taskListId, taskId) [auth, db]
- `GET` `/quote` params() [auth]
- `GET` `/notifications` params()
- `GET` `/timers` params()
- `GET` `/reminders` params()
- `POST` `/databases/:id/query` params(id) [auth, db, ai]
- `POST` `/databases/:id/pages` params(id) [auth, db, ai]
- `POST` `/databases/:id/smart-entry` params(id) [auth, db, ai]
- `PATCH` `/pages/:id` params(id) [auth, db, ai]
- `DELETE` `/pages/:id` params(id) [auth, db, ai]
- `GET` `/notion/workspace-page` params() [auth, db, ai]
- `POST` `/notion/workspace-page` params() [auth, db, ai]
- `POST` `/notion/databases` params() [auth, db, ai]
- `GET` `/pages/:id/blocks` params(id) [auth, db, ai]
- `PATCH` `/blocks/:id` params(id) [auth, db, ai]
- `POST` `/doc` params() [auth, db, ai]
- `GET` `/standings/:league` params(league)
- `GET` `/sports/:league` params(league)
- `GET` `/spotify/status` params() [auth, db]
- `POST` `/spotify/start-auth` params() [auth, db]
- `GET` `/spotify/now-playing` params() [auth, db]
- `POST` `/spotify/play` params() [auth, db]
- `POST` `/spotify/pause` params() [auth, db]
- `POST` `/spotify/next` params() [auth, db]
- `POST` `/spotify/previous` params() [auth, db]
- `POST` `/spotify/volume` params() [auth, db]
- `POST` `/voice` params() [auth, ai]
- `POST` `/tts` params() [auth, ai]
- `POST` `/walli/widget` params()
- `POST` `/walli/layout` params()
- `GET` `/walli/widgets` params()
- `GET` `/youtube/search` params()

## WebSocket Events

- `WS` `message` — `server/ws.ts`
- `WS` `close` — `server/ws.ts`
