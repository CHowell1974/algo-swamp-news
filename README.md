# ALGO Swamp Desk

A markets wire. Six headlines stay free. The full desk is $29 a month or $249 a year, billed through Stripe.

## Server settings

Do not commit secrets. On the host, set:

- `STRIPE_SECRET_KEY` — live secret key (`sk_live_…`)
- `STRIPE_WEBHOOK_SECRET` — signing secret for `POST /api/stripe/webhook`
- `STRIPE_FOUNDER_PROMO_ID` — optional promotion code id (`promo_…`) for the first monthly desks at the founding price. Leave it unset to charge the regular monthly price.

Webhook events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid`.

## Options 101

The course is a one-time $39 Stripe Checkout payment (`mode: "payment"`), or it is included while a desk membership is active (monthly or annual, including a trial). Modules 1–2 are free. Purchases and quiz progress are stored in Postgres.

No Dashboard product is required. Checkout uses inline `price_data` at $39. Set `STRIPE_PRICE_OPTIONS_101` (`price_…`) only if you would rather charge a price you already created.

Card payments are fulfilled on `checkout.session.completed` when `payment_status` is not `unpaid`. Also subscribe the existing webhook endpoint to `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`, and `charge.refunded` so delayed payment methods and full refunds stay in sync. If the endpoint already receives all events, there is nothing to change in the Dashboard.

The database and sign-in are provisioned by the host. `DATABASE_URL` must be set in production.

## thinkorswim studies

Mother Bar Levels and Mother Bar Sweep Scan are separate $29 one-time Checkout payments. A desk plan does not include them. Purchases use the same `course_purchases` row and webhook as Options 201 (`checkout.session.completed` / `checkout.session.async_payment_succeeded` when paid, and `charge.refunded` for a full refund).

Live prices:

- Mother Bar Levels — `price_1UVrUkLAdDbAQPuJwSy32dJb`. Override with `STRIPE_PRICE_MOTHER_BAR_LEVELS`.
- Mother Bar Sweep Scan — `price_1UVrXsLAdDbAQPuJZiWi1Wsz`. Override with `STRIPE_PRICE_MOTHER_BAR_SWEEP_SCAN`.

The `.ts` files are served only to the buyer from `GET /api/studies/:productId`. A $39 bundle of the two files is not for sale yet.

## Pre-market wire

Hobby cron calls `GET /api/cron/premarket-wire` during the 12:00 UTC hour and again during the 13:00 UTC hour, on weekdays. Vercel may start each of those any time inside the hour. On standard time that is 7:00–7:59am Eastern and 8:00–8:59am Eastern. During daylight time it is 8:00–8:59am and 9:00–9:59am. The handler sends on the first call between 7:00 and 9:20am Eastern on a trading day, so the noon UTC hour lands before the 9:00am show in both seasons. `wire_sends` keeps it to one campaign a day. Each call also appends a `wire_runs` row with the Eastern clock, action, and reason, and no mail content or secrets. A failed Brevo call is `action=skipped` with `reason=brevo-error` (or `missing-api-key`, `missing-list`, `empty-list`, `over-daily-cap`) and the status and Brevo error code in `detail`. The same line is written to the log as `[premarket-wire] fail`.

The wire is a Brevo email campaign to one list. The sender is **ALGO Swamp** `<chris@algoswamp.com>`. Each campaign includes Brevo's `{{ unsubscribe }}` link. New signups get a double opt-in email before they join the list. The free plan sends 300 emails a day, so the cron refuses to send when the list is larger than that and records `over-daily-cap` instead.

Set these on Vercel for **Production and Preview**. Do not commit them.

- `BREVO_API_KEY` — Brevo SMTP & API key. Brevo → SMTP & API → API keys. The app sends it only as the `api-key` header to `https://api.brevo.com/v3`.
- `BREVO_LIST_ID` — numeric id of the contact list that receives the wire. Create the list in Brevo → Contacts → Lists, name it `Pre-market wire`, and copy the id from the list URL. If this is unset, the app looks up a list named `Pre-market wire` (override the name with `BREVO_LIST_NAME`) and creates it when it is missing. Set the id once you know it so a rename cannot create a second list.
- `BREVO_SEND_ENABLED` — `true` sends the campaign. Any other value, including leaving it unset, logs a dry run and does not record the day, so a real send can still go out later that morning. Leave it unset until the list is imported and the domain is authenticated.
- `CRON_SECRET` — long random string. Vercel sends it as `Authorization: Bearer`. The preview at `GET /api/wire/preview` and the test send below use the same header.

Optional:

- `BREVO_DOI_TEMPLATE_ID` — id of the double opt-in template. If unset, the app finds or creates an active template named `ALGO Swamp free wire confirm` whose link is `{{ params.DOIurl }}`. The link lands on `https://news.algoswamp.com/`.
- `BREVO_SENDER_EMAIL` — defaults to `chris@algoswamp.com`.
- `BREVO_SENDER_NAME` — defaults to `ALGO Swamp`.

`KIT_API_KEY` and `KIT_SEND_ENABLED` are not read by the site anymore. Remove them from Vercel when you no longer need the import script below.

### Brevo dashboard

1. Confirm the sender `chris@algoswamp.com` with the name ALGO Swamp (Senders & IP).
2. Create the list `Pre-market wire` and set `BREVO_LIST_ID`.
3. Authenticate `algoswamp.com` (Brevo → Settings → Senders, domains & dedicated IPs → Domains). Add the DKIM and SPF records Brevo shows, and a DMARC record if the domain does not have one. The domain is not authenticated yet. Until it is, Brevo can reject the campaign when DMARC is strict. That failure shows up in `wire_runs` as `brevo-error`; it does not fail silently. Authentication is what gets the mail out of spam.
4. Put a postal address on the Brevo account profile so the campaign footer can satisfy CAN-SPAM. The unsubscribe link itself is Brevo's.

### One test address

This does not write `wire_sends`, so it does not use up the day's list send. It still needs `BREVO_API_KEY` and the list id. It does not need `BREVO_SEND_ENABLED`.

```
curl -H "Authorization: Bearer $CRON_SECRET" \
  "https://news.algoswamp.com/api/wire/test?to=chris@algoswamp.com"
```

Brevo sends that draft to the one address, then the app deletes the draft so it cannot go to the list. One `to` value only.

### Move the existing Kit list

`scripts/import-kit-to-brevo.mjs` reads active Kit subscribers, or a CSV export, and imports them into `BREVO_LIST_ID`. It does not send mail. Without `--apply` it only prints a count. Do not run it from CI. Run it locally when the list id is set:

```
node scripts/import-kit-to-brevo.mjs --csv ./subscribers.csv
BREVO_API_KEY=… BREVO_LIST_ID=… node scripts/import-kit-to-brevo.mjs --csv ./subscribers.csv --apply
```

A Kit v4 key in `KIT_API_KEY` can read forms `10083135` (the old wire) and `10084236` (Road Map) instead of a CSV. If Kit answers 401 or 403, export the CSV from Kit and use `--csv`. The header at the top of the script has the rest of the flags.

The free Road Map study on `/tools` still posts to Kit, because that form is what emails the study file. After Kit accepts the address, the same form also starts the Brevo double opt-in so the wire list stays on Brevo. The free-wire form on the desk does not call Kit.

The public feed of the same six lines is `GET /wire.xml`.
