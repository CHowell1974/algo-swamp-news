import type { Sql } from "@/lib/db";
import {
  COURSE_ID,
  MOTHER_BAR_LEVELS_ID,
  MOTHER_BAR_SWEEP_SCAN_ID,
  OPTIONS_201_ID,
  STARTER_KIT_ID,
} from "@/lib/course/access";
import { STARTER_KIT_BONUS_SPOTS, starterKitBonusOpen } from "@/lib/starter-kit";

const STARTER_KIT_LOCK = 83427591;

export type StarterKitPurchaseInput = {
  stripeCheckoutSessionId: string;
  userId: string;
  stripePaymentIntentId: string | null;
  stripeCustomerId: string | null;
  amountCents: number;
  currency: string;
};

function asInt(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "bigint") return Number(value);
  if (typeof value === "string" && value.trim()) return Number(value);
  return 0;
}

function asBool(value: unknown): boolean {
  return value === true || value === "t" || value === "true" || value === 1;
}

/** Every recorded Starter Kit checkout, including refunds. Refunds do not free a bonus spot. */
async function liveSql(): Promise<Sql> {
  const { getSql } = await import("@/lib/db");
  return getSql();
}

export async function countStarterKitPurchases(sql?: Sql): Promise<number> {
  const db = sql ?? (await liveSql());
  const rows = await db<{ n: number | string }>`
    select count(*)::int as n
    from course_purchases
    where course_id = ${STARTER_KIT_ID}
  `;
  return asInt(rows[0]?.n);
}

export async function readStarterKitOwnership(
  sql: Sql,
  userId: string,
): Promise<{ paid: boolean; deskBonus: boolean; redeemed: boolean }> {
  const rows = await sql<{
    status: string;
    desk_bonus: boolean | string | number;
    desk_bonus_redeemed: boolean | string | number;
  }>`
    select status, desk_bonus, desk_bonus_redeemed
    from course_purchases
    where user_id = ${userId} and course_id = ${STARTER_KIT_ID}
  `;
  const paidRows = rows.filter((row) => row.status === "paid");
  if (!paidRows.length) return { paid: false, deskBonus: false, redeemed: false };
  const unredeemed = paidRows.some(
    (row) => asBool(row.desk_bonus) && !asBool(row.desk_bonus_redeemed),
  );
  const anyBonus = paidRows.some((row) => asBool(row.desk_bonus));
  return { paid: true, deskBonus: anyBonus, redeemed: anyBonus && !unredeemed };
}

/**
 * Writes the kit row and one paid row per included product.
 * The bonus flag uses starterKitBonusOpen on the count of kit rows that already exist.
 * A replay keeps that flag; it does not recompute it.
 */
export async function saveStarterKitPurchaseRows(
  sql: Sql,
  input: StarterKitPurchaseInput,
): Promise<{ deskBonus: boolean }> {
  const spots = STARTER_KIT_BONUS_SPOTS;
  if (!starterKitBonusOpen(0, spots)) {
    throw new Error("Starter Kit bonus rule is inconsistent.");
  }
  const rows = await sql<{
    course_id: string;
    status: string;
    desk_bonus: boolean | string | number;
  }>`
    with locked as (
      select pg_advisory_xact_lock(${STARTER_KIT_LOCK}::bigint) as ok
    ),
    prior as (
      select count(*)::int as n
      from course_purchases
      where course_id = ${STARTER_KIT_ID}
        and exists (select 1 from locked)
    ),
    incoming(course_id, amount_cents, kit) as (
      values
        (${STARTER_KIT_ID}::text, ${input.amountCents}::int, 1),
        (${COURSE_ID}::text, 0, 0),
        (${OPTIONS_201_ID}::text, 0, 0),
        (${MOTHER_BAR_LEVELS_ID}::text, 0, 0),
        (${MOTHER_BAR_SWEEP_SCAN_ID}::text, 0, 0)
    )
    insert into course_purchases (
      stripe_checkout_session_id, user_id, course_id, stripe_payment_intent_id,
      stripe_customer_id, amount_cents, currency, status, desk_bonus
    )
    select
      ${input.stripeCheckoutSessionId},
      ${input.userId},
      incoming.course_id,
      ${input.stripePaymentIntentId},
      ${input.stripeCustomerId},
      incoming.amount_cents,
      ${input.currency},
      'paid',
      case
        when incoming.kit = 1 and prior.n < ${spots} then true
        else false
      end
    from incoming
    cross join prior
    on conflict (stripe_checkout_session_id, course_id) do update set
      status = case
        when course_purchases.status = 'refunded' then course_purchases.status
        else 'paid'
      end,
      stripe_payment_intent_id = coalesce(
        excluded.stripe_payment_intent_id,
        course_purchases.stripe_payment_intent_id
      ),
      stripe_customer_id = coalesce(
        excluded.stripe_customer_id,
        course_purchases.stripe_customer_id
      ),
      amount_cents = excluded.amount_cents,
      updated_at = now()
    returning course_id, status, desk_bonus
  `;
  const kit = rows.find((row) => row.course_id === STARTER_KIT_ID);
  return { deskBonus: asBool(kit?.desk_bonus) && kit?.status === "paid" };
}

export async function saveStarterKitPurchase(
  input: StarterKitPurchaseInput,
): Promise<{ deskBonus: boolean }> {
  return saveStarterKitPurchaseRows(await liveSql(), input);
}

export async function markStarterKitDeskBonusRedeemed(userId: string): Promise<void> {
  const sql = await liveSql();
  await sql`
    update course_purchases
    set desk_bonus_redeemed = true, updated_at = now()
    where user_id = ${userId}
      and course_id = ${STARTER_KIT_ID}
      and status = 'paid'
      and desk_bonus = true
  `;
}
