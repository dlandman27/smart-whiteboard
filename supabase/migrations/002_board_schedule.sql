-- ============================================================================
-- Board Schedule — per-user scheduling config stored as JSONB
-- ============================================================================

create table board_schedule (
  user_id     uuid references auth.users primary key,
  schedule    jsonb not null default '{"enabled": false, "slots": []}',
  updated_at  timestamptz not null default now()
);

create trigger board_schedule_updated_at
  before update on board_schedule
  for each row execute function update_updated_at();

-- ── RLS ─────────────────────────────────────────────────────────────────────

alter table board_schedule enable row level security;

create policy "owner full access"
  on board_schedule for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
