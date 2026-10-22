# ALGO Swamp Desk

A markets wire. Six headlines stay free. The full desk is $29 a month or $249 a year, billed through Stripe.

## Server settings

Do not commit secrets. On the host, set:

- `STRIPE_SECRET_KEY` — live secret key (`sk_live_…`)
- `STRIPE_WEBHOOK_SECRET` — signing secret for `POST /api/stripe/webhook`

Webhook events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid`.

The database and sign-in are provisioned by the host. `DATABASE_URL` must be set in production.

## Pre-market wire

Weekday cron hits `GET /api/cron/premarket-wire` at 12:30 and 13:30 UTC and sends only when that instant is 8:30am America/New_York. Set:

- `KIT_API_KEY` — Kit v4 API key. Developer settings → V4 Keys → Add a new key. Copy it once.
- `KIT_SEND_ENABLED` — `true` sends the broadcast. Any other value dry-runs and writes a row so the day is not sent twice.
- `CRON_SECRET` — long random string. Vercel sends it as `Authorization: Bearer`. The preview at `GET /api/wire/preview` uses the same header.

Do not commit these. The public feed of the same six lines is `GET /wire.xml`.
