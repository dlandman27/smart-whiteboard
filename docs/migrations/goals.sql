-- Goals feature migration
-- Run this in the Supabase SQL editor or via supabase db push

-- ── goals ────────────────────────────────────────────────────────────────────

create table if not exists goals (
  id            uuid        primary key default gen_random_uuid(),
  user_id       uuid        not null references auth.users on delete cascade,
  title         text        not null,
  description   text,
  type          text        not null check (type in ('numeric', 'habit', 'time_based', 'milestone')),
  status        text        not null default 'active' check (status in ('active', 'completed', 'archived')),
  target_value  numeric,
  current_value numeric      not null default 0,
  unit          text,
  start_date    date,
  target_date   date,
  color         text,
  emoji         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

alter table goals enable row level security;

create policy "goals: users access own rows"
  on goals for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- updated_at trigger for goals
create or replace function set_updated_at()
  returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger goals_updated_at
  before update on goals
  for each row execute procedure set_updated_at();

-- ── goal_milestones ───────────────────────────────────────────────────────────

create table if not exists goal_milestones (
  id           uuid        primary key default gen_random_uuid(),
  goal_id      uuid        not null references goals on delete cascade,
  user_id      uuid        not null references auth.users on delete cascade,
  title        text        not null,
  target_value numeric,
  completed_at timestamptz,
  sort_order   int         not null default 0,
  created_at   timestamptz not null default now()
);

alter table goal_milestones enable row level security;

create policy "goal_milestones: users access own rows"
  on goal_milestones for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── goal_progress_logs ────────────────────────────────────────────────────────

create table if not exists goal_progress_logs (
  id        uuid        primary key default gen_random_uuid(),
  goal_id   uuid        not null references goals on delete cascade,
  user_id   uuid        not null references auth.users on delete cascade,
  value     numeric     not null,
  note      text,
  logged_at timestamptz not null default now()
);

alter table goal_progress_logs enable row level security;

create policy "goal_progress_logs: users access own rows"
  on goal_progress_logs for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── goal_links ────────────────────────────────────────────────────────────────

create table if not exists goal_links (
  id          uuid        primary key default gen_random_uuid(),
  goal_id     uuid        not null references goals on delete cascade,
  user_id     uuid        not null references auth.users on delete cascade,
  linked_type text        not null check (linked_type in ('routine', 'task_list')),
  linked_id   text        not null,
  created_at  timestamptz not null default now()
);

alter table goal_links enable row level security;

create policy "goal_links: users access own rows"
  on goal_links for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);
