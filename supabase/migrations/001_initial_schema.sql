-- ============================================================================
-- Smart Whiteboard — Initial Schema
-- Run with: supabase db reset  (or apply via Supabase dashboard SQL editor)
-- ============================================================================

-- ── Helper: auto-update updated_at ──────────────────────────────────────────

create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- ── boards ──────────────────────────────────────────────────────────────────

create table boards (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references auth.users not null,
  name          text not null,
  layout_id     text not null default 'dashboard',
  board_type    text,                          -- 'calendar','settings','connectors','today','todo', or null
  calendar_id   text,                          -- for calendar boards
  slot_gap      int  not null default 12,
  slot_pad      int  not null default 16,
  custom_slots  jsonb not null default '[]',
  background    jsonb not null default '{}',
  widget_style  text,                          -- 'solid','glass','borderless', or null
  ord           int  not null default 0,
  is_public     boolean not null default false,
  share_code    text unique,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create trigger boards_updated_at
  before update on boards
  for each row execute function update_updated_at();

-- ── widgets ─────────────────────────────────────────────────────────────────

create table widgets (
  id              uuid primary key default gen_random_uuid(),
  board_id        uuid references boards on delete cascade not null,
  user_id         uuid references auth.users not null,
  type            text,
  variant_id      text,
  settings        jsonb not null default '{}',
  database_id     text,
  database_title  text not null default '',
  calendar_id     text,
  x               int not null default 0,
  y               int not null default 0,
  width           int not null default 300,
  height          int not null default 200,
  slot_id         text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create trigger widgets_updated_at
  before update on widgets
  for each row execute function update_updated_at();

-- ── board_drawings ──────────────────────────────────────────────────────────

create table board_drawings (
  board_id    uuid references boards on delete cascade primary key,
  user_id     uuid references auth.users not null,
  data_url    text,
  updated_at  timestamptz not null default now()
);

create trigger board_drawings_updated_at
  before update on board_drawings
  for each row execute function update_updated_at();

-- ── user_theme ──────────────────────────────────────────────────────────────

create table user_theme (
  user_id           uuid references auth.users primary key,
  active_theme_id   text not null default 'minimal',
  custom_overrides  jsonb not null default '{}',
  custom_theme      jsonb,
  background        jsonb not null default '{}',
  pets_enabled      boolean not null default false,
  updated_at        timestamptz not null default now()
);

create trigger user_theme_updated_at
  before update on user_theme
  for each row execute function update_updated_at();

-- ── user_credentials ────────────────────────────────────────────────────────

create table user_credentials (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references auth.users not null,
  service       text not null,
  api_key       text,            -- AES-256-GCM encrypted at app layer
  client_id     text,
  client_secret text,            -- AES-256-GCM encrypted at app layer
  redirect_uri  text,
  unique (user_id, service)
);

-- ── oauth_tokens ────────────────────────────────────────────────────────────

create table oauth_tokens (
  user_id       uuid references auth.users not null,
  service       text not null,
  access_token  text,            -- AES-256-GCM encrypted at app layer
  refresh_token text,            -- AES-256-GCM encrypted at app layer
  expires_at    timestamptz,
  updated_at    timestamptz not null default now(),
  primary key (user_id, service)
);

create trigger oauth_tokens_updated_at
  before update on oauth_tokens
  for each row execute function update_updated_at();

-- ── board_shares ────────────────────────────────────────────────────────────

create table board_shares (
  id          uuid primary key default gen_random_uuid(),
  board_id    uuid references boards on delete cascade not null,
  user_id     uuid references auth.users not null,
  role        text not null default 'viewer',  -- 'viewer','editor','admin'
  created_at  timestamptz not null default now(),
  unique (board_id, user_id)
);

-- ============================================================================
-- Row Level Security
-- ============================================================================

-- ── boards RLS ──────────────────────────────────────────────────────────────

alter table boards enable row level security;

create policy "owner full access"
  on boards for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- NOTE: Sharing/public policies will be added later via a SECURITY DEFINER
-- function to avoid infinite recursion between boards ↔ board_shares.
-- For now, only owner access is enforced.

-- ── widgets RLS ─────────────────────────────────────────────────────────────

alter table widgets enable row level security;

create policy "owner full access"
  on widgets for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── board_drawings RLS ──────────────────────────────────────────────────────

alter table board_drawings enable row level security;

create policy "owner full access"
  on board_drawings for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── user_theme RLS ──────────────────────────────────────────────────────────

alter table user_theme enable row level security;

create policy "owner full access"
  on user_theme for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── user_credentials RLS ────────────────────────────────────────────────────

alter table user_credentials enable row level security;

create policy "owner full access"
  on user_credentials for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── oauth_tokens RLS ────────────────────────────────────────────────────────

alter table oauth_tokens enable row level security;

create policy "owner full access"
  on oauth_tokens for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── board_shares RLS ────────────────────────────────────────────────────────

alter table board_shares enable row level security;

-- Simple owner-only for now. Sharing policies will use SECURITY DEFINER
-- functions to avoid recursion with boards table.
create policy "owner manages own shares"
  on board_shares for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================================================
-- Indexes
-- ============================================================================

create index idx_boards_user_id on boards (user_id);
create index idx_widgets_board_id on widgets (board_id);
create index idx_widgets_user_id on widgets (user_id);
create index idx_board_shares_board_id on board_shares (board_id);
create index idx_board_shares_user_id on board_shares (user_id);
create index idx_oauth_tokens_user_id on oauth_tokens (user_id);
create index idx_user_credentials_user_id on user_credentials (user_id);

-- ============================================================================
-- Enable Realtime for boards and widgets
-- ============================================================================

alter publication supabase_realtime add table boards;
alter publication supabase_realtime add table widgets;
