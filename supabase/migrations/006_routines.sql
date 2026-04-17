CREATE TABLE IF NOT EXISTS routines (
  id         TEXT        PRIMARY KEY,
  title      TEXT        NOT NULL,
  category   TEXT        NOT NULL DEFAULT 'daily',
  emoji      TEXT        NOT NULL DEFAULT '✅',
  sort_order INTEGER     NOT NULL DEFAULT 0,
  enabled    BOOLEAN     NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS routine_completions (
  id         BIGSERIAL PRIMARY KEY,
  routine_id TEXT      NOT NULL REFERENCES routines(id) ON DELETE CASCADE,
  date       DATE      NOT NULL,
  UNIQUE(routine_id, date)
);
