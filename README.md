# ALGO Swamp Desk

A markets wire. Six headlines stay free. The full desk is $29 a month or $249 a year, billed through Stripe.

## Server settings

Do not commit secrets. On the host, set:

- `STRIPE_SECRET_KEY` — live secret key (`sk_live_…`)
- `STRIPE_WEBHOOK_SECRET` — signing secret for `POST /api/stripe/webhook`

Webhook events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid`.

The database and sign-in are provisioned by the host. `DATABASE_URL` must be set in production.
