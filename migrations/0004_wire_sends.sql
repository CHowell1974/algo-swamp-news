create table if not exists wire_sends (
  trading_day date primary key,
  status text not null,
  subject text,
  broadcast_id text,
  detail text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
