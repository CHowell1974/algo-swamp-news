# ALGO Swamp Desk

A markets wire. Six headlines stay free. The full desk is $29 a month or $249 a year, billed through Stripe.

## Server settings

Do not commit secrets. On the host, set:

- `STRIPE_SECRET_KEY` — live secret key (`sk_live_…`)
- `STRIPE_WEBHOOK_SECRET` — signing secret for `POST /api/stripe/webhook`

Webhook events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid`.

The database and sign-in are provisioned by the host. `DATABASE_URL` must be set in production.

## Pre-market wire

Weekday cron hits `GET /api/cron/premarket-wire` at 12:00 and 13:00 UTC. The handler sends on the first call that lands between 8:00 and 9:20am America/New_York on a trading day. Set:

- `KIT_API_KEY` — Kit v4 API key. Developer settings → V4 Keys → Add a new key. Copy it once.
- `KIT_SEND_ENABLED` — `true` sends the broadcast. Any other value logs a dry run and does not record the day, so a real send can still go out later that morning.
- `CRON_SECRET` — long random string. Vercel sends it as `Authorization: Bearer`. The preview at `GET /api/wire/preview` uses the same header.

Do not commit these. The public feed of the same six lines is `GET /wire.xml`.
