-- Append-only record of each pre-market wire attempt.
-- This does not dedupe sends. wire_sends does that.
-- Rows store the Eastern clock, action, and reason. No mail body, no secrets.
create table if not exists wire_runs (
  id bigserial primary key,
  created_at timestamptz not null default now(),
  trading_day date,
  et_clock text,
  action text not null,
  reason text not null,
  detail text
);
