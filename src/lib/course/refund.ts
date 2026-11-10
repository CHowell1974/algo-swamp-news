import type { Sql } from "@/lib/db";

/** Full refund of one charge. Every product row that shares the payment intent is revoked. */
export async function refundPaidPurchases(sql: Sql, paymentIntentId: string): Promise<void> {
  await sql`
    update course_purchases
    set status = 'refunded', updated_at = now()
    where stripe_payment_intent_id = ${paymentIntentId} and status = 'paid'
  `;
}
