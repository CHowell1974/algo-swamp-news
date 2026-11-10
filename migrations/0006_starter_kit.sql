-- One Checkout session can grant several products (Swamp Starter Kit).
-- desk_bonus is set on the starter-kit row when that checkout is among the
-- first 25 recorded kit purchases. It is not a public counter.

alter table course_purchases drop constraint course_purchases_pkey;

alter table course_purchases
  add primary key (stripe_checkout_session_id, course_id);

alter table course_purchases
  add column desk_bonus boolean not null default false;

alter table course_purchases
  add column desk_bonus_redeemed boolean not null default false;
