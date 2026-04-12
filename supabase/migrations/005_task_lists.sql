-- Explicit task lists so users can create empty lists before adding tasks
create table task_lists (
  id        uuid primary key default gen_random_uuid(),
  user_id   uuid references auth.users not null,
  name      text not null,
  color     text,
  created_at timestamptz not null default now(),
  unique(user_id, name)
);

alter table task_lists enable row level security;

create policy "Users manage own task lists"
  on task_lists for all
  using (user_id = auth.uid());

-- Seed a default list for every user that already has tasks
insert into task_lists (user_id, name)
select distinct user_id, list_name from tasks
on conflict do nothing;
