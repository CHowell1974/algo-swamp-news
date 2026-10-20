alter table memberships add column if not exists stripe_customer_id text;
alter table memberships add column if not exists stripe_subscription_id text;
