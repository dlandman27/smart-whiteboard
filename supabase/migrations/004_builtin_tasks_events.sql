-- ============================================================================
-- Built-in Tasks & Events tables for the aggregation layer
-- ============================================================================

-- ── tasks ──────────────────────────────────────────────────────────────────

create table tasks (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references auth.users not null,
  title        text not null,
  notes        text,
  status       text not null default 'needsAction' check (status in ('needsAction', 'completed')),
  priority     int not null default 4 check (priority between 1 and 4),
  due          timestamptz,
  list_name    text not null default 'My Tasks',
  completed_at timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create trigger tasks_updated_at
  before update on tasks
  for each row execute function update_updated_at();

-- ── events ─────────────────────────────────────────────────────────────────

create table events (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references auth.users not null,
  title         text not null,
  description   text,
  location      text,
  start_at      timestamptz not null,
  end_at        timestamptz,
  all_day       boolean not null default false,
  color         text,
  calendar_name text not null default 'My Calendar',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create trigger events_updated_at
  before update on events
  for each row execute function update_updated_at();

-- ── user_theme: add ical_feeds column ──────────────────────────────────────

alter table user_theme add column if not exists ical_feeds jsonb not null default '[]';

-- ============================================================================
-- Row Level Security
-- ============================================================================

alter table tasks enable row level security;

create policy "owner full access"
  on tasks for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

alter table events enable row level security;

create policy "owner full access"
  on events for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================================================
-- Indexes
-- ============================================================================

create index idx_tasks_user_id on tasks (user_id);
create index idx_tasks_user_status on tasks (user_id, status);
create index idx_tasks_user_list on tasks (user_id, list_name);

create index idx_events_user_id on events (user_id);
create index idx_events_user_start on events (user_id, start_at);
create index idx_events_user_calendar on events (user_id, calendar_name);
