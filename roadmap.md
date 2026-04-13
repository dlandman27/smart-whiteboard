# Roadmap

## Product Phase Plan

From developer self-hosted tool → shippable SaaS product.

| # | Phase | Estimate |
|---|---|---|
| 1 | Auth (Clerk or Supabase Auth) | ~1 week |
| 2 | Board state → server | ~1 week |
| 3 | Deploy (Railway + domain) | ~2 days |
| 4 | Integration OAuth flip | ~1 week |
| 5 | Billing (Stripe) | ~1 week |
| 6 | Onboarding wizard | ~1 week |
| 7 | Mobile app rebuild | ~3–4 weeks |
| 8 | App Store submission | ~1 week + review |

**Total: ~10–12 weeks**

### Key Product Decisions

- **No Connectors complexity** — wiigit owns all OAuth apps (Google, Spotify, Notion). Users click "Connect", never see API keys or `.env` files.
- **Walli AI is Pro-only** — gated behind billing since we pay Anthropic per call.
- **Free tier:** boards + widgets only. **Pro (~$10/mo):** Walli, voice, all integrations, unlimited boards.
- **Web app is the wall display** — Chrome kiosk mode (`--kiosk`) works today; Electron is the next step for a proper installable experience.
- **Mobile app is a companion** — live board preview, push notifications from Walli, remote control. Not a standalone product.

---

## Tech Stack

| Layer | Current | Target |
|---|---|---|
| Frontend | React + Vite + Zustand localStorage | React + Vite + Zustand + Supabase client |
| Backend | Express (local) | Express on Railway |
| Database | localStorage + tokens.json | Supabase (Postgres) |
| Auth | None | Supabase Auth |
| Realtime | None | Supabase Realtime |
| Hosting | Local | Vercel (frontend) + Railway (Express) |

---

## Database Schema

### `boards`
```sql
create table boards (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users not null,
  name        text not null,
  layout_id   text not null default 'dashboard',
  slot_gap    int  not null default 12,
  slot_pad    int  not null default 16,
  ord         int  not null default 0,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);
```

### `widgets`
```sql
create table widgets (
  id              uuid primary key default gen_random_uuid(),
  board_id        uuid references boards on delete cascade not null,
  user_id         uuid references auth.users not null,
  type            text,
  settings        jsonb default '{}',
  database_id     text,
  database_title  text default '',
  calendar_id     text,
  x               int  not null default 0,
  y               int  not null default 0,
  width           int  not null default 300,
  height          int  not null default 200,
  slot_id         text,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);
```

### `board_drawings`
```sql
create table board_drawings (
  board_id    uuid references boards on delete cascade primary key,
  user_id     uuid references auth.users not null,
  data_url    text,
  updated_at  timestamptz default now()
);
```

### `user_theme`
```sql
create table user_theme (
  user_id          uuid references auth.users primary key,
  active_theme_id  text not null default 'minimal',
  custom_overrides jsonb default '{}',
  background       jsonb default '{}',
  updated_at       timestamptz default now()
);
```

### `user_credentials`
```sql
create table user_credentials (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references auth.users not null,
  service       text not null,   -- 'notion', 'gcal', 'spotify'
  api_key       text,            -- AES encrypted via Supabase Vault
  client_id     text,
  client_secret text,            -- AES encrypted
  redirect_uri  text,
  unique (user_id, service)
);
```

### `oauth_tokens`
```sql
create table oauth_tokens (
  user_id       uuid references auth.users not null,
  service       text not null,   -- 'gcal', 'spotify'
  access_token  text,            -- encrypted
  refresh_token text,            -- encrypted
  expires_at    timestamptz,
  updated_at    timestamptz default now(),
  primary key (user_id, service)
);
```

### RLS Policies (same pattern for all tables)
```sql
alter table boards enable row level security;
create policy "users own their boards"
  on boards using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
-- repeat for widgets, drawings, theme, credentials, tokens
```

---

## API Layer

### What changes in Express

Right now Express uses a single `.env` `NOTION_API_KEY`. That becomes per-user —
Express pulls the user's Notion key from `user_credentials` using their JWT.

```
Every request:
  Browser → sends Supabase JWT in Authorization header
  Express → verifies JWT with Supabase JWT secret
  Express → extracts user_id from JWT
  Express → fetches that user's Notion key from user_credentials
  Express → makes Notion API call with their key
```

New Express middleware:
```ts
async function requireAuth(req, res, next) {
  const jwt = req.headers.authorization?.replace('Bearer ', '')
  const { data: { user } } = await supabase.auth.getUser(jwt)
  if (!user) return res.status(401).json({ error: 'Unauthorized' })
  req.userId = user.id
  next()
}
```

### New Express endpoints needed
```
POST   /api/credentials/notion   -- save Notion API key (encrypted)
GET    /api/credentials/notion   -- check if key exists (don't return key)
DELETE /api/credentials/notion   -- remove key

POST /api/gcal/start-auth        -- same as now but tied to user_id
POST /api/spotify/start-auth     -- same as now but tied to user_id
```

OAuth token storage moves from `tokens.json` → `oauth_tokens` table (per user).

---

## Auth Flow

```
1. App loads → check Supabase session
2. No session → show login screen (email/password + Google OAuth)
3. Session exists → load user's boards from Supabase
4. All API calls → include JWT in Authorization header
5. Logout → clear session, redirect to login
```

Supabase provides `@supabase/auth-ui-react` so the login UI doesn't need to be built from scratch.

---

## State / Persistence Flow

Replace Zustand `persist` middleware with:

```
App boot:
  1. Supabase auth check
  2. Fetch boards + widgets from Supabase → hydrate Zustand store
  3. Subscribe to Supabase Realtime on boards + widgets tables

On store mutation (add/move/resize/remove widget, rename board, etc.):
  1. Update Zustand immediately (optimistic)
  2. Write to Supabase in background (debounced ~300ms for position changes)

Realtime event received (another tab/device):
  1. Update Zustand store from the incoming payload
  2. No re-fetch needed — payload has the full new row
```

The Zustand store shape stays identical. `useWidgetSettings`, all widget components,
all hooks — untouched. Only the persistence layer underneath changes.

---

## Credential Storage Flow

```
User enters Notion API key in Settings panel:
  1. Frontend POST /api/credentials/notion { key }
  2. Express encrypts key using AES (crypto module, server-side secret)
  3. Stores encrypted key in user_credentials via Supabase service client
  4. Returns { ok: true }

User makes Notion API call:
  1. Frontend calls /api/databases (with JWT)
  2. Express verifies JWT → gets user_id
  3. Express fetches encrypted key from user_credentials
  4. Express decrypts key
  5. Express calls Notion API with user's key
  6. Returns result to frontend
```

GCal and Spotify OAuth tokens move from `tokens.json` → `oauth_tokens` table
with the same encryption pattern. The OAuth flow itself stays the same.

---

## Frontend Changes Summary

1. **Add Supabase client** — `src/lib/supabase.ts`
2. **Auth guard** — wrap app in `<AuthGuard>`, redirect to login if no session
3. **Login screen** — simple page using `@supabase/auth-ui-react`
4. **Replace Zustand persist** — remove `persist` middleware, add `initStore()` that loads from Supabase
5. **Realtime hook** — `useRealtimeSync()` subscribes to board/widget changes
6. **JWT on API calls** — `useNotion.ts`, `useGCal.ts` etc. include `Authorization` header
7. **Settings panel** — replace raw key inputs with "Connect Notion" flow that POSTs to Express
8. **Drawing persistence** — save/load from `board_drawings` table instead of localStorage

---

## Deployment

| Service | What | Cost |
|---|---|---|
| Supabase | DB + Auth + Realtime | Free tier |
| Vercel | React frontend | Free tier |
| Railway | Express backend | ~$5/mo |

---

## Build Order

### Phase 1 — Backend (Express + Supabase)
- [ ] Set up Supabase project, run schema migrations
- [ ] Add JWT auth middleware to Express
- [ ] Move token storage from `tokens.json` → `oauth_tokens` table
- [ ] Add credential endpoints (save/fetch Notion key per user)
- [ ] All Notion routes use per-user key

### Phase 2 — Frontend Auth
- [ ] Add Supabase client (`src/lib/supabase.ts`)
- [ ] Add login screen + auth guard
- [ ] JWT included on all `/api/*` calls

### Phase 3 — State Migration
- [ ] Remove Zustand `persist` middleware
- [ ] Add `initStore()` — load from Supabase on login
- [ ] Writes go to Supabase on store mutations
- [ ] Add Realtime subscription for cross-tab sync

### Phase 4 — Remaining localStorage
- [ ] Theme → `user_theme` table
- [ ] Drawings → `board_drawings` table
- [ ] GCal/Spotify credentials → `user_credentials` table

### Phase 5 — Deploy
- [ ] Deploy Express to Railway with env vars
- [ ] Deploy frontend to Vercel
- [ ] Update Supabase auth redirect URLs

---

## Future Considerations

- **Notion OAuth** — replace raw API key entry with proper OAuth flow for better UX
- **Board sharing** — add `board_permissions` table, `is_public` flag
- **Widget marketplace** — the plugin system is already the foundation
- **More data sources** — the Notion integration pattern generalizes to Airtable, Google Sheets, etc.
- **PWA** — add manifest + service worker so it installs cleanly on any screen
- **Teams/orgs** — add `teams` table for workspace sharing
