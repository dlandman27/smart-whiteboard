-- Goals v2: proper type model, start_value, progress sync, habit check-ins
-- Types: numeric | average | habit | milestone  (drops time_based)

-- ── 1. New columns on goals ───────────────────────────────────────────────────

alter table goals
  add column if not exists start_value         numeric,
  add column if not exists progress_mode       text not null default 'snapshot'
    check (progress_mode in ('additive', 'snapshot')),
  add column if not exists milestone_step      numeric,
  add column if not exists frequency           text,
  add column if not exists data_source         text not null default 'manual',
  add column if not exists data_source_metric  text;

alter table goals
  add constraint goals_frequency_check
    check (frequency is null or frequency in ('daily', 'weekdays', 'weekends', '2x_week', '3x_week'));

-- ── 2. Migrate time_based → numeric ──────────────────────────────────────────

update goals set type = 'numeric' where type = 'time_based';

-- ── 3. Swap type constraint (remove time_based, add average) ─────────────────

alter table goals drop constraint if exists goals_type_check;
alter table goals
  add constraint goals_type_check
    check (type in ('numeric', 'average', 'habit', 'milestone'));

-- ── 4. habit_checkins table ───────────────────────────────────────────────────

create table if not exists habit_checkins (
  id          uuid        primary key default gen_random_uuid(),
  goal_id     uuid        not null references goals on delete cascade,
  user_id     uuid        not null references auth.users on delete cascade,
  checked_on  date        not null,
  note        text,
  created_at  timestamptz not null default now(),
  unique (goal_id, user_id, checked_on)
);

alter table habit_checkins enable row level security;

create policy "habit_checkins: users access own rows"
  on habit_checkins for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── 5. Trigger: sync current_value + auto-complete milestone thresholds ───────
--
-- Fires after every progress log insert.
-- For additive goals: current_value = SUM of all logs.
-- For snapshot goals: current_value = most recently logged value.
-- Then checks whether any threshold-based milestones were just crossed.

create or replace function sync_goal_progress()
  returns trigger language plpgsql as $$
declare
  v_type    text;
  v_mode    text;
  v_start   numeric;
  v_target  numeric;
  v_current numeric;
begin
  select type, progress_mode, start_value, target_value
    into v_type, v_mode, v_start, v_target
    from goals
   where id = new.goal_id;

  -- Only runs for numeric and average goals
  if v_type not in ('numeric', 'average') then
    return new;
  end if;

  if v_mode = 'additive' then
    select coalesce(sum(value), 0)
      into v_current
      from goal_progress_logs
     where goal_id = new.goal_id;
  else
    -- snapshot: latest entry wins
    select value
      into v_current
      from goal_progress_logs
     where goal_id = new.goal_id
     order by logged_at desc, created_at desc
     limit 1;
  end if;

  update goals
     set current_value = v_current,
         updated_at    = now()
   where id = new.goal_id;

  -- Auto-complete threshold milestones that were just crossed
  if v_start is not null and v_target is not null then
    if v_start < v_target then
      -- going up: complete milestones where threshold <= current
      update goal_milestones
         set completed_at = now()
       where goal_id     = new.goal_id
         and target_value is not null
         and completed_at is null
         and target_value <= v_current;
    elsif v_start > v_target then
      -- going down: complete milestones where threshold >= current
      update goal_milestones
         set completed_at = now()
       where goal_id     = new.goal_id
         and target_value is not null
         and completed_at is null
         and target_value >= v_current;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists goal_progress_sync on goal_progress_logs;

create trigger goal_progress_sync
  after insert on goal_progress_logs
  for each row execute procedure sync_goal_progress();
