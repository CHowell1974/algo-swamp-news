-- Options 101 purchases and per-student progress.
-- Access is a paid row here, or an active desk membership (including trials).
-- Module 1 stays readable without either.

create table if not exists course_purchases (
  stripe_checkout_session_id text primary key,
  user_id text not null,
  course_id text not null,
  stripe_payment_intent_id text,
  stripe_customer_id text,
  amount_cents integer not null,
  currency text not null,
  status text not null check (status in ('paid', 'refunded')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists course_purchases_user_course_idx
  on course_purchases (user_id, course_id);

create index if not exists course_purchases_payment_intent_idx
  on course_purchases (stripe_payment_intent_id);

create table if not exists course_module_progress (
  user_id text not null,
  course_id text not null,
  module_id text not null,
  best_correct integer not null,
  question_count integer not null,
  attempts integer not null,
  completed_at timestamptz not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, course_id, module_id)
);

create table if not exists course_exam_results (
  user_id text not null,
  course_id text not null,
  best_correct integer not null,
  question_count integer not null,
  attempts integer not null,
  passed boolean not null,
  passed_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (user_id, course_id)
);
