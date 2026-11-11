-- Puppet House PostgreSQL schema. The app also applies this idempotently on startup.
CREATE TABLE IF NOT EXISTS puppet_house_games (
  id TEXT PRIMARY KEY,
  room_code TEXT NOT NULL UNIQUE,
  data JSONB NOT NULL,
  updated_at BIGINT NOT NULL,
  created_at BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS puppet_house_updated_idx ON puppet_house_games(updated_at);

CREATE TABLE IF NOT EXISTS puppet_house_rate_limits (
  key TEXT PRIMARY KEY,
  count INTEGER NOT NULL,
  reset_at BIGINT NOT NULL
);
