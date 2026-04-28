-- Walli user profile + observations
-- Gives Walli a persistent mental model of the user

-- ── walli_profile ─────────────────────────────────────────────────────────────
-- One row per user. Seeded via onboarding, updated by Walli over time.

create table if not exists walli_profile (
  id                    uuid        primary key default gen_random_uuid(),
  user_id               uuid        not null references auth.users on delete cascade unique,

  -- Identity (from onboarding)
  preferred_name        text,
  life_focus            text[]      not null default '{}',
  tendencies            text[]      not null default '{}',
  motivation_style      text        check (motivation_style in ('achievement', 'streak', 'social', 'data', 'mixed')),
  about                 text,       -- free-text: "I'm a 26 year old building a startup..."

  -- Coaching preferences
  coaching_style        text        not null default 'balanced'
                                    check (coaching_style in ('gentle', 'balanced', 'direct')),
  checkin_frequency     text        not null default 'normal'
                                    check (checkin_frequency in ('low', 'normal', 'high')),

  -- Walli's synthesized working model — updated by Walli periodically
  -- Written in plain English, injected into Walli's system prompt
  synthesized_context   text,
  context_updated_at    timestamptz,

  -- Onboarding state
  onboarding_completed  boolean     not null default false,
  onboarding_completed_at timestamptz,

  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

alter table walli_profile enable row level security;

create policy "walli_profile: users access own row"
  on walli_profile for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create trigger walli_profile_updated_at
  before update on walli_profile
  for each row execute function update_updated_at();

-- ── walli_observations ────────────────────────────────────────────────────────
-- Individual observations Walli logs over time.
-- These feed into the next synthesized_context refresh.

create table if not exists walli_observations (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        not null references auth.users on delete cascade,

  type        text        not null
              check (type in ('pattern', 'insight', 'behavioral', 'milestone', 'concern')),
  content     text        not null,  -- "Dylan skips evening routines on busy days"
  source      text        not null
              check (source in ('routine', 'goal', 'task', 'interaction', 'calendar', 'system')),
  confidence  real        not null default 0.5 check (confidence between 0 and 1),

  observed_at timestamptz not null default now()
);

alter table walli_observations enable row level security;

create policy "walli_observations: users access own rows"
  on walli_observations for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index walli_observations_user_recent
  on walli_observations (user_id, observed_at desc);
