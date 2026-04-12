-- ============================================================================
-- Feedback System
-- ============================================================================

-- Feedback posts
create table feedback_posts (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users not null,
  title       text not null,
  body        text,
  category    text not null default 'idea',       -- idea, bug, integration, ux
  status      text not null default 'open',       -- open, planned, in-progress, shipped, declined
  vote_count  int not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Feedback votes (one per user per post)
create table feedback_votes (
  post_id   uuid references feedback_posts on delete cascade,
  user_id   uuid references auth.users,
  primary key (post_id, user_id)
);

-- Feedback comments
create table feedback_comments (
  id         uuid primary key default gen_random_uuid(),
  post_id    uuid references feedback_posts on delete cascade not null,
  user_id    uuid references auth.users not null,
  body       text not null,
  created_at timestamptz not null default now()
);

-- RLS
alter table feedback_posts enable row level security;
alter table feedback_votes enable row level security;
alter table feedback_comments enable row level security;

-- Everyone can read all feedback
create policy "anyone can read posts" on feedback_posts for select using (true);
create policy "anyone can read votes" on feedback_votes for select using (true);
create policy "anyone can read comments" on feedback_comments for select using (true);

-- Users can create their own
create policy "users create posts" on feedback_posts for insert with check (auth.uid() = user_id);
create policy "users vote" on feedback_votes for insert with check (auth.uid() = user_id);
create policy "users comment" on feedback_comments for insert with check (auth.uid() = user_id);

-- Users can delete their own votes
create policy "users unvote" on feedback_votes for delete using (auth.uid() = user_id);

-- Indexes
create index idx_feedback_posts_vote_count on feedback_posts (vote_count desc);
create index idx_feedback_posts_created_at on feedback_posts (created_at desc);
create index idx_feedback_comments_post_id on feedback_comments (post_id);
create index idx_feedback_votes_user_id on feedback_votes (user_id);

-- Triggers
create trigger feedback_posts_updated_at
  before update on feedback_posts
  for each row execute function update_updated_at();
