# Database Schema

All tables live in Supabase (Postgres). Every table has Row Level Security (RLS) enabled. The `auth.users` table is managed by Supabase Auth.

---

## boards

Stores each user's boards (workspaces).

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| `id` | `uuid` | `gen_random_uuid()` | Primary key |
| `user_id` | `uuid` | — | References `auth.users`, not null |
| `name` | `text` | — | Not null |
| `layout_id` | `text` | `'dashboard'` | Not null |
| `board_type` | `text` | `null` | `'calendar'`, `'settings'`, `'connectors'`, `'today'`, `'todo'`, or null (user board) |
| `calendar_id` | `text` | `null` | For calendar boards (e.g. `'primary'`) |
| `slot_gap` | `int` | `12` | Not null |
| `slot_pad` | `int` | `16` | Not null |
| `custom_slots` | `jsonb` | `'[]'` | Array of `{id, x, y, width, height}` for custom layouts |
| `background` | `jsonb` | `'{}'` | `{label, bg, dot}` or empty |
| `widget_style` | `text` | `null` | `'solid'`, `'glass'`, `'borderless'`, or null |
| `ord` | `int` | `0` | Not null, controls sidebar order |
| `is_public` | `boolean` | `false` | Whether the board is viewable by anyone with the link |
| `share_code` | `text` | `null` | Unique short code for invite links |
| `created_at` | `timestamptz` | `now()` | |
| `updated_at` | `timestamptz` | `now()` | Auto-updated via trigger |

**RLS policies:**
- Owner: `auth.uid() = user_id` (full CRUD)
- Shared: `exists (select 1 from board_shares where board_id = id and user_id = auth.uid())` (SELECT + UPDATE based on role)
- Public: `is_public = true` (SELECT only)

---

## widgets

Stores widgets placed on boards.

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| `id` | `uuid` | `gen_random_uuid()` | Primary key |
| `board_id` | `uuid` | — | References `boards` on delete cascade, not null |
| `user_id` | `uuid` | — | References `auth.users`, not null |
| `type` | `text` | `null` | Widget type key (e.g. `'@whiteboard/clock'`) |
| `variant_id` | `text` | `null` | Widget variant |
| `settings` | `jsonb` | `'{}'` | Widget-specific settings |
| `database_id` | `text` | `null` | Notion database ID (if applicable) |
| `database_title` | `text` | `''` | Display name for the database |
| `calendar_id` | `text` | `null` | Calendar ID (if applicable) |
| `x` | `int` | `0` | Not null |
| `y` | `int` | `0` | Not null |
| `width` | `int` | `300` | Not null |
| `height` | `int` | `200` | Not null |
| `slot_id` | `text` | `null` | Layout slot assignment |
| `created_at` | `timestamptz` | `now()` | |
| `updated_at` | `timestamptz` | `now()` | Auto-updated via trigger |

**RLS policies:** Follows board access — user can CRUD widgets on boards they own or have editor/admin access to via `board_shares`.

---

## board_drawings

Stores canvas drawing data per board (one drawing per board).

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| `board_id` | `uuid` | — | Primary key, references `boards` on delete cascade |
| `user_id` | `uuid` | — | References `auth.users`, not null |
| `data_url` | `text` | `null` | Base64 data URL from canvas `toDataURL()` |
| `updated_at` | `timestamptz` | `now()` | Auto-updated via trigger |

**RLS policies:** Same as boards — follows board ownership/sharing.

---

## user_theme

Stores per-user theme preferences. One row per user.

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| `user_id` | `uuid` | — | Primary key, references `auth.users` |
| `active_theme_id` | `text` | `'minimal'` | Not null |
| `custom_overrides` | `jsonb` | `'{}'` | Partial theme variable overrides |
| `custom_theme` | `jsonb` | `null` | Full custom theme definition |
| `background` | `jsonb` | `'{}'` | Global background `{label, bg, dot}` |
| `pets_enabled` | `boolean` | `false` | Whether companion pets are shown |
| `updated_at` | `timestamptz` | `now()` | Auto-updated via trigger |

**RLS policies:** `auth.uid() = user_id` (owner only).

---

## user_credentials

Stores API keys and OAuth client credentials per user per service.

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| `id` | `uuid` | `gen_random_uuid()` | Primary key |
| `user_id` | `uuid` | — | References `auth.users`, not null |
| `service` | `text` | — | Not null. `'notion'`, `'spotify'`, etc. |
| `api_key` | `text` | `null` | AES-256-GCM encrypted |
| `client_id` | `text` | `null` | |
| `client_secret` | `text` | `null` | AES-256-GCM encrypted |
| `redirect_uri` | `text` | `null` | |

**Unique constraint:** `(user_id, service)`

**RLS policies:** `auth.uid() = user_id` (owner only). Sensitive fields are encrypted at the application layer before storage.

---

## oauth_tokens

Stores OAuth access/refresh tokens per user per service.

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| `user_id` | `uuid` | — | References `auth.users`, not null |
| `service` | `text` | — | Not null. `'gcal'`, `'spotify'`, etc. |
| `access_token` | `text` | `null` | AES-256-GCM encrypted |
| `refresh_token` | `text` | `null` | AES-256-GCM encrypted |
| `expires_at` | `timestamptz` | `null` | When the access token expires |
| `updated_at` | `timestamptz` | `now()` | Auto-updated via trigger |

**Primary key:** `(user_id, service)`

**RLS policies:** `auth.uid() = user_id` (owner only). Note: server uses the service-role key to bypass RLS when loading tokens on behalf of the user during API calls.

---

## board_shares

Controls shared access to boards. Enables multi-user collaboration.

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| `id` | `uuid` | `gen_random_uuid()` | Primary key |
| `board_id` | `uuid` | — | References `boards` on delete cascade, not null |
| `user_id` | `uuid` | — | References `auth.users`, not null |
| `role` | `text` | `'viewer'` | Not null. `'viewer'`, `'editor'`, or `'admin'` |
| `created_at` | `timestamptz` | `now()` | |

**Unique constraint:** `(board_id, user_id)`

**RLS policies:**
- Board owner can CRUD shares on their boards
- Shared users can SELECT their own share row
- Admins on a board can manage shares for that board

---

## Shared Infrastructure

### updated_at trigger

Applied to all tables with an `updated_at` column:

```sql
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;
```

### Encryption

`user_credentials.api_key`, `user_credentials.client_secret`, `oauth_tokens.access_token`, and `oauth_tokens.refresh_token` are encrypted at the application layer using AES-256-GCM before being stored. The encryption key is in the server's `ENCRYPTION_KEY` environment variable. Supabase stores only ciphertext.

### Row Level Security

All tables have RLS enabled. The frontend Supabase client uses the **anon key** and respects RLS. The Express server uses the **service-role key** to bypass RLS when performing operations on behalf of authenticated users (after JWT verification).
