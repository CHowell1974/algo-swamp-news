create table if not exists memberships (
  user_id text primary key,
  plan text not null,
  status text not null,
  current_period_end timestamptz not null,
  cancel_at_period_end boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
