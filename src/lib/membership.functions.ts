import { createServerFn } from "@tanstack/react-start";
import { getSql } from "@/lib/db";
import { authMiddleware } from "@/lib/auth/middleware";
import { isPlanId, type PlanId } from "@/lib/plans";

export type Membership = {
  plan: PlanId | null;
  active: boolean;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  managedByStripe: boolean;
};

const NONE: Membership = {
  plan: null,
  active: false,
  currentPeriodEnd: null,
  cancelAtPeriodEnd: false,
  managedByStripe: false,
};

type MembershipRow = {
  plan: string;
  status: string;
  current_period_end: string | Date;
  cancel_at_period_end: boolean | string | number;
  stripe_customer_id: string | null;
};

function asIso(value: string | Date): string {
  if (value instanceof Date) return value.toISOString();
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toISOString();
}

function asBool(value: boolean | string | number): boolean {
  return value === true || value === "t" || value === "true" || value === 1;
}

function checkoutError(cause: unknown, fallback: string): Error {
  if (cause instanceof Error && cause.message.startsWith("Stripe checkout is not switched on")) return cause;
  if (cause instanceof Error && cause.message.startsWith("This checkout")) return cause;
  if (cause instanceof Error && cause.message.startsWith("Checkout is not")) return cause;
  if (cause instanceof Error && cause.message.startsWith("Payment is still")) return cause;
  if (cause instanceof Error && cause.message.startsWith("This desk is billed")) return cause;
  if (cause instanceof Error && cause.message.startsWith("Start a paid desk")) return cause;
  return new Error(fallback);
}

export async function readMembership(userId: string): Promise<Membership> {
  const sql = await getSql();
  const rows = await sql<MembershipRow>`
    select plan, status, current_period_end, cancel_at_period_end, stripe_customer_id
    from memberships
    where user_id = ${userId}
  `;
  const row = rows[0];
  if (!row || !isPlanId(row.plan)) return NONE;
  const currentPeriodEnd = asIso(row.current_period_end);
  const inPeriod = new Date(currentPeriodEnd).getTime() > Date.now();
  const active = row.status === "active" && inPeriod;
  return {
    plan: row.plan,
    active,
    currentPeriodEnd,
    cancelAtPeriodEnd: active && asBool(row.cancel_at_period_end),
    managedByStripe: Boolean(row.stripe_customer_id),
  };
}

export const getMembership = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => readMembership(context.userId));

export const beginCheckout = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { plan?: string }) => {
    if (!isPlanId(input?.plan)) throw new Error("Pick a monthly or annual desk.");
    return { plan: input.plan };
  })
  .handler(async ({ context, data }) => {
    try {
      const { createCheckoutUrl } = await import("./stripe.server");
      const url = await createCheckoutUrl(context.userId, data.plan);
      return { url };
    } catch (cause) {
      throw checkoutError(cause, "Could not open Stripe checkout.");
    }
  });

export const confirmCheckout = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { sessionId?: string }) => {
    const sessionId = input?.sessionId?.trim() ?? "";
    if (!sessionId.startsWith("cs_")) throw new Error("Missing checkout session.");
    return { sessionId };
  })
  .handler(async ({ context, data }) => {
    try {
      const { confirmCheckoutSession } = await import("./stripe.server");
      await confirmCheckoutSession(context.userId, data.sessionId);
      return readMembership(context.userId);
    } catch (cause) {
      throw checkoutError(cause, "Could not confirm checkout.");
    }
  });

export const openBillingPortal = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    try {
      const { createPortalUrl } = await import("./stripe.server");
      const url = await createPortalUrl(context.userId);
      return { url };
    } catch (cause) {
      throw checkoutError(cause, "Could not open billing.");
    }
  });

export const cancelMembership = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const { assertLocalBilling } = await import("./stripe.server");
    await assertLocalBilling(context.userId);
    const sql = await getSql();
    await sql`
      update memberships
      set cancel_at_period_end = true, updated_at = now()
      where user_id = ${context.userId} and status = 'active'
    `;
    return readMembership(context.userId);
  });

export const resumeMembership = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const { assertLocalBilling } = await import("./stripe.server");
    await assertLocalBilling(context.userId);
    const sql = await getSql();
    await sql`
      update memberships
      set cancel_at_period_end = false, updated_at = now()
      where user_id = ${context.userId} and status = 'active' and current_period_end > now()
    `;
    return readMembership(context.userId);
  });
