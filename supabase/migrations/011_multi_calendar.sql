-- ============================================================================
-- 011 — Multi-calendar support
-- • oauth_tokens: add account_id + account_email, change PK to (user_id, service, account_id)
-- • ical_feeds: new table for stored iCal / Apple Calendar feed URLs
-- ============================================================================

-- ── oauth_tokens: add new columns before changing PK ─────────────────────────

alter table oauth_tokens
  add column if not exists account_id    text not null default 'primary',
  add column if not exists account_email text;

-- Drop old PK and add the new composite one
alter table oauth_tokens drop constraint if exists oauth_tokens_pkey;
alter table oauth_tokens add primary key (user_id, service, account_id);

-- ── ical_feeds ────────────────────────────────────────────────────────────────

create table if not exists ical_feeds (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users not null,
  name       text not null,
  url        text not null,
  color      text,
  created_at timestamptz not null default now()
);

create index if not exists ical_feeds_user_id_idx on ical_feeds (user_id);

alter table ical_feeds enable row level security;

create policy "Users manage own ical_feeds"
  on ical_feeds for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);
