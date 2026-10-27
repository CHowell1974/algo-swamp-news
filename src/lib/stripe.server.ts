import Stripe from "stripe";
import { getRequest } from "@tanstack/react-start/server";
import {
  checkoutCommercials,
  checkoutIntegrationId,
  courseCheckoutIntegrationId,
  FOUNDER_CACHE_MS,
  founderOfferFromPromo,
  grantsDesk,
  subscriptionAccessEnd,
  type FounderOffer,
} from "@/lib/billing";
import {
  courseCheckoutOwner,
  courseCheckoutParams,
  courseFulfillmentDecision,
  courseOffer,
  resolveCoursePriceId,
} from "@/lib/course/access";
import {
  hasPaidCourse,
  markCourseRefunded,
  savePaidCoursePurchase,
  stripeCustomerForUser,
} from "@/lib/course/store.server";
import { getSql } from "@/lib/db";
import { isPlanId, PLANS, type PlanId } from "@/lib/plans";

const PRICE_MONTHLY = process.env.STRIPE_PRICE_MONTHLY?.trim() || "price_1USm3aLAdDbAQPuJMuMnMSnw";
const PRICE_ANNUAL = process.env.STRIPE_PRICE_ANNUAL?.trim() || "price_1USm3aLAdDbAQPuJCgvaQgUw";
const PORTAL_CONFIGURATION = "bpc_1USm3gLAdDbAQPuJJVicakTd";

const NOT_READY =
  "Stripe checkout is not switched on for this server yet. The $29 and $249 prices are ready, but a card cannot be charged until the server has its Stripe secret.";

let client: Stripe | null = null;

function stripeClient(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) throw new Error(NOT_READY);
  if (!client) client = new Stripe(key, { appInfo: { name: "ALGO Swamp Desk" } });
  return client;
}

export function requestOrigin(): string {
  const request = getRequest();
  const forwardedHost = request.headers.get("x-forwarded-host");
  const host = (
    forwardedHost?.split(",")[0] ??
    request.headers.get("host") ??
    "localhost:8080"
  ).trim();
  const forwardedProto = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const proto =
    forwardedProto ||
    (host.startsWith("localhost") || host.startsWith("127.0.0.1") ? "http" : "https");
  return `${proto}://${host}`;
}

function stripeId(value: string | { id: string } | null | undefined): string | null {
  if (!value) return null;
  return typeof value === "string" ? value : value.id;
}

function planForPrice(
  priceId: string | undefined,
  metadataPlan: string | undefined,
): PlanId | null {
  if (isPlanId(metadataPlan)) return metadataPlan;
  if (priceId === PRICE_MONTHLY || priceId === "price_1USm3aLAdDbAQPuJMuMnMSnw") return "monthly";
  if (priceId === PRICE_ANNUAL || priceId === "price_1USm3aLAdDbAQPuJCgvaQgUw") return "annual";
  return null;
}

function periodEndIso(sub: Stripe.Subscription): string | null {
  return subscriptionAccessEnd(sub);
}

function membershipStatus(stripeStatus: Stripe.Subscription.Status): "active" | "canceled" {
  return grantsDesk(stripeStatus) ? "active" : "canceled";
}

let founderCache: { at: number; promoId: string; offer: FounderOffer | null } | null = null;

/** Active founder price, or null when the code is unset, used up, or Stripe cannot be read. */
export async function readFounderOffer(now = Date.now()): Promise<FounderOffer | null> {
  const promoId = process.env.STRIPE_FOUNDER_PROMO_ID?.trim() ?? "";
  if (!promoId || !process.env.STRIPE_SECRET_KEY?.trim()) return null;
  if (
    founderCache &&
    founderCache.promoId === promoId &&
    now - founderCache.at < FOUNDER_CACHE_MS
  ) {
    return founderCache.offer;
  }
  let offer: FounderOffer | null = null;
  try {
    const promo = await stripeClient().promotionCodes.retrieve(promoId, {
      expand: ["promotion.coupon"],
    });
    const coupon = promo.promotion?.coupon;
    offer = founderOfferFromPromo(
      {
        active: promo.active,
        timesRedeemed: promo.times_redeemed,
        maxRedemptions: promo.max_redemptions,
        expiresAt: promo.expires_at,
        coupon:
          coupon && typeof coupon !== "string"
            ? {
                valid: coupon.valid,
                duration: coupon.duration,
                amountOff: coupon.amount_off,
                percentOff: coupon.percent_off,
                currency: coupon.currency,
              }
            : null,
      },
      PLANS.monthly.price,
      Math.floor(now / 1000),
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "lookup failed";
    console.log(`[checkout] founding member lookup skipped: ${message}`);
    offer = null;
  }
  founderCache = { at: now, promoId, offer };
  return offer;
}

export async function upsertSubscription(
  userId: string,
  sub: Stripe.Subscription,
  customerId: string | null,
): Promise<void> {
  const price = sub.items?.data?.[0]?.price;
  const priceId = typeof price === "string" ? price : price?.id;
  const plan = planForPrice(priceId, sub.metadata?.plan);
  const periodEnd = periodEndIso(sub);
  if (!plan || !periodEnd) return;
  const sql = await getSql();
  const status = membershipStatus(sub.status);
  await sql`
    insert into memberships (
      user_id, plan, status, current_period_end, cancel_at_period_end,
      stripe_customer_id, stripe_subscription_id, updated_at
    )
    values (
      ${userId}, ${plan}, ${status}, ${periodEnd}, ${sub.cancel_at_period_end},
      ${customerId}, ${sub.id}, now()
    )
    on conflict (user_id) do update set
      plan = excluded.plan,
      status = excluded.status,
      current_period_end = excluded.current_period_end,
      cancel_at_period_end = excluded.cancel_at_period_end,
      stripe_customer_id = coalesce(excluded.stripe_customer_id, memberships.stripe_customer_id),
      stripe_subscription_id = excluded.stripe_subscription_id,
      updated_at = now()
  `;
}

async function resolveUserId(sub: Stripe.Subscription): Promise<string | null> {
  const fromMeta = sub.metadata?.user_id?.trim();
  if (fromMeta) return fromMeta;
  const sql = await getSql();
  const bySub = await sql<{ user_id: string }>`
    select user_id from memberships where stripe_subscription_id = ${sub.id} limit 1
  `;
  if (bySub[0]?.user_id) return bySub[0].user_id;
  const customerId = stripeId(sub.customer);
  if (!customerId) return null;
  const byCustomer = await sql<{ user_id: string }>`
    select user_id from memberships where stripe_customer_id = ${customerId} limit 1
  `;
  return byCustomer[0]?.user_id ?? null;
}

async function syncSubscription(
  sub: Stripe.Subscription,
  userId?: string | null,
  customerId?: string | null,
) {
  const owner = userId ?? (await resolveUserId(sub));
  if (!owner) return;
  await upsertSubscription(
    owner,
    sub,
    customerId === undefined ? stripeId(sub.customer) : customerId,
  );
}

export async function createCheckoutUrl(userId: string, plan: PlanId): Promise<string> {
  const stripe = stripeClient();
  const origin = requestOrigin();
  const sql = await getSql();
  const rows = await sql<{ stripe_customer_id: string | null }>`
    select stripe_customer_id from memberships where user_id = ${userId}
  `;
  const customer = rows[0]?.stripe_customer_id || undefined;
  const founder = plan === "monthly" ? await readFounderOffer() : null;

  async function openCheckoutSession(applyFounder: boolean): Promise<string> {
    const promoId = applyFounder ? (process.env.STRIPE_FOUNDER_PROMO_ID?.trim() ?? "") : "";
    const commercials = checkoutCommercials(plan, promoId || null);
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: plan === "monthly" ? PRICE_MONTHLY : PRICE_ANNUAL, quantity: 1 }],
      success_url: `${origin}/desk?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/join?plan=${plan}`,
      client_reference_id: userId,
      ...(customer ? { customer } : {}),
      metadata: { user_id: userId, plan },
      integration_identifier: checkoutIntegrationId(),
      ...(commercials.paymentMethodCollection
        ? { payment_method_collection: commercials.paymentMethodCollection }
        : {}),
      ...(commercials.promotionCode
        ? { discounts: [{ promotion_code: commercials.promotionCode }] }
        : commercials.allowPromotionCodes
          ? { allow_promotion_codes: true }
          : {}),
      subscription_data: {
        metadata: { user_id: userId, plan },
        ...(commercials.trialPeriodDays
          ? {
              trial_period_days: commercials.trialPeriodDays,
              trial_settings: { end_behavior: { missing_payment_method: "cancel" as const } },
            }
          : {}),
      },
    });
    if (!session.url) throw new Error("Stripe did not return a checkout link.");
    return session.url;
  }

  try {
    return await openCheckoutSession(Boolean(founder));
  } catch (error) {
    if (!founder) throw error;
    console.log(
      "[checkout] founding member code was not applied; opening the regular monthly price",
    );
    return await openCheckoutSession(false);
  }
}

export async function confirmCheckoutSession(userId: string, sessionId: string): Promise<void> {
  const stripe = stripeClient();
  const session = await stripe.checkout.sessions.retrieve(sessionId, { expand: ["subscription"] });
  const owner = session.client_reference_id ?? session.metadata?.user_id ?? null;
  if (!owner || owner !== userId) throw new Error("This checkout belongs to a different account.");
  if (session.status !== "complete") throw new Error("Checkout is not complete yet.");
  const subscription = session.subscription;
  const sub =
    subscription && typeof subscription !== "string"
      ? subscription
      : subscription
        ? await stripe.subscriptions.retrieve(subscription)
        : null;
  if (!sub) throw new Error("Stripe did not return a subscription.");
  await upsertSubscription(userId, sub, stripeId(session.customer));
  if (membershipStatus(sub.status) !== "active") {
    throw new Error(
      "Payment is still processing. The desk opens when Stripe marks the subscription active.",
    );
  }
}

export async function createPortalUrl(userId: string): Promise<string> {
  const stripe = stripeClient();
  const sql = await getSql();
  const rows = await sql<{ stripe_customer_id: string | null }>`
    select stripe_customer_id from memberships where user_id = ${userId}
  `;
  const customer = rows[0]?.stripe_customer_id;
  if (!customer) throw new Error("Start a paid desk before managing billing.");
  const session = await stripe.billingPortal.sessions.create({
    customer,
    configuration: PORTAL_CONFIGURATION,
    return_url: `${requestOrigin()}/account`,
  });
  if (!session.url) throw new Error("Stripe did not return a billing link.");
  return session.url;
}

export async function assertLocalBilling(userId: string): Promise<void> {
  const sql = await getSql();
  const rows = await sql<{ stripe_customer_id: string | null }>`
    select stripe_customer_id from memberships where user_id = ${userId}
  `;
  if (rows[0]?.stripe_customer_id) {
    throw new Error(
      "This desk is billed in Stripe. Use Manage billing to cancel, resume, or switch.",
    );
  }
}

const COURSE_NOT_READY =
  "Stripe checkout is not switched on for this server yet. A card cannot be charged until the server has its Stripe secret.";

function purchaseFromSession(session: Stripe.Checkout.Session, userId: string) {
  const offer = courseOffer(session.metadata?.course_id ?? null);
  if (!offer) throw new Error("That course is not available.");
  return {
    stripeCheckoutSessionId: session.id,
    userId,
    courseId: offer.id,
    stripePaymentIntentId: stripeId(session.payment_intent),
    stripeCustomerId: stripeId(session.customer),
    amountCents: session.amount_total ?? offer.priceCents,
    currency: session.currency ?? "usd",
  };
}

function coursePriceId(courseId: string): string | null {
  const raw =
    courseId === "options-201"
      ? process.env.STRIPE_PRICE_OPTIONS_201
      : process.env.STRIPE_PRICE_OPTIONS_101;
  return resolveCoursePriceId(courseId, raw);
}

async function fulfillCourseFromSession(session: Stripe.Checkout.Session): Promise<void> {
  const decision = courseFulfillmentDecision({
    mode: session.mode,
    paymentStatus: session.payment_status,
    courseId: session.metadata?.course_id ?? null,
  });
  if (decision !== "grant") return;
  const owner = courseCheckoutOwner({
    clientReferenceId: session.client_reference_id,
    metadataUserId: session.metadata?.user_id ?? null,
  });
  if (!owner) return;
  await savePaidCoursePurchase(purchaseFromSession(session, owner));
}

export async function createCourseCheckoutUrl(userId: string, courseId: string): Promise<string> {
  const offer = courseOffer(courseId);
  if (!offer) throw new Error("That course is not available.");
  if (!process.env.STRIPE_SECRET_KEY?.trim()) throw new Error(COURSE_NOT_READY);
  if (await hasPaidCourse(userId, offer.id)) {
    throw new Error(`You already own ${offer.shortName}.`);
  }
  const { readMembership } = await import("@/lib/membership.functions");
  const membership = await readMembership(userId);
  if (offer.includedWithDesk && membership.active) {
    throw new Error(`${offer.shortName} is included with your desk.`);
  }
  const stripe = stripeClient();
  const customerId = await stripeCustomerForUser(userId);
  const session = await stripe.checkout.sessions.create(
    courseCheckoutParams({
      userId,
      origin: requestOrigin(),
      priceId: coursePriceId(offer.id),
      customerId,
      integrationId: courseCheckoutIntegrationId(Math.random, offer.integrationPrefix),
      courseId: offer.id,
    }),
  );
  if (!session.url) throw new Error("Stripe did not return a checkout link.");
  return session.url;
}

export async function confirmCourseCheckoutSession(
  userId: string,
  sessionId: string,
): Promise<string> {
  const stripe = stripeClient();
  const session = await stripe.checkout.sessions.retrieve(sessionId);
  const offer = courseOffer(session.metadata?.course_id ?? null);
  const owner = courseCheckoutOwner({
    clientReferenceId: session.client_reference_id,
    metadataUserId: session.metadata?.user_id ?? null,
  });
  if (!owner || owner !== userId) throw new Error("This checkout belongs to a different account.");
  if (session.status !== "complete") throw new Error("Checkout is not complete yet.");
  const decision = courseFulfillmentDecision({
    mode: session.mode,
    paymentStatus: session.payment_status,
    courseId: session.metadata?.course_id ?? null,
  });
  if (decision !== "grant" || !offer) {
    const name = offer?.shortName ?? "The course";
    throw new Error(
      `Payment is still processing. ${name} opens when Stripe marks the payment paid.`,
    );
  }
  await savePaidCoursePurchase(purchaseFromSession(session, userId));
  return offer.id;
}

export async function handleStripeWebhook(request: Request): Promise<Response> {
  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!secret || !process.env.STRIPE_SECRET_KEY?.trim()) {
    return new Response("Stripe webhooks are not configured.", { status: 503 });
  }
  const signature = request.headers.get("stripe-signature");
  if (!signature) return new Response("Missing signature.", { status: 400 });
  const payload = await request.text();
  let event: Stripe.Event;
  try {
    event = stripeClient().webhooks.constructEvent(payload, signature, secret);
  } catch {
    return new Response("Invalid signature.", { status: 400 });
  }

  try {
    if (
      event.type === "checkout.session.completed" ||
      event.type === "checkout.session.async_payment_succeeded"
    ) {
      const session = event.data.object;
      if (
        event.type === "checkout.session.completed" &&
        session.mode === "subscription" &&
        session.status === "complete"
      ) {
        const userId = session.client_reference_id ?? session.metadata?.user_id ?? null;
        const subId = stripeId(session.subscription);
        if (userId && subId) {
          const sub = await stripeClient().subscriptions.retrieve(subId);
          await syncSubscription(sub, userId, stripeId(session.customer));
        }
      }
      if (session.mode === "payment") await fulfillCourseFromSession(session);
    } else if (event.type === "checkout.session.async_payment_failed") {
      // A delayed method can fail after checkout.session.completed with
      // payment_status unpaid. Course access is not granted in that case.
    } else if (
      event.type === "customer.subscription.updated" ||
      event.type === "customer.subscription.deleted"
    ) {
      await syncSubscription(event.data.object);
    } else if (event.type === "charge.refunded") {
      const charge = event.data.object;
      const paymentIntentId = stripeId(charge.payment_intent);
      if (charge.refunded && paymentIntentId) await markCourseRefunded(paymentIntentId);
    } else if (event.type === "invoice.paid") {
      const subscription = event.data.object.parent?.subscription_details?.subscription;
      const subId = stripeId(subscription);
      if (subId) {
        const sub =
          subscription && typeof subscription !== "string"
            ? subscription
            : await stripeClient().subscriptions.retrieve(subId);
        await syncSubscription(sub);
      }
    }
  } catch {
    return new Response("Webhook handler failed.", { status: 500 });
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}
