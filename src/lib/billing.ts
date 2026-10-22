import { formatMoney, MONTHLY_TRIAL_DAYS, type PlanId } from "./plans.ts";

/** How long a founder-promo lookup can be reused before Stripe is asked again. */
export const FOUNDER_CACHE_MS = 60_000;

export type FounderOffer = {
  price: number;
  spotsLeft: number;
  spotsTotal: number;
};

export type PromoSnapshot = {
  active: boolean;
  timesRedeemed: number;
  maxRedemptions: number | null;
  expiresAt: number | null;
  coupon: {
    valid: boolean;
    duration: string;
    amountOff: number | null;
    percentOff: number | null;
    currency: string | null;
  } | null;
};

/**
 * A trialing subscription is a member. Access lasts until the trial ends, including
 * when they cancel at period end, so the first invoice is never collected.
 */
export function grantsDesk(stripeStatus: string): boolean {
  return stripeStatus === "active" || stripeStatus === "trialing" || stripeStatus === "past_due";
}

export function subscriptionAccessEnd(sub: {
  status: string;
  trial_end: number | null;
  items?: { data?: { current_period_end?: number | null }[] };
}): string | null {
  if (sub.status === "trialing" && typeof sub.trial_end === "number" && sub.trial_end > 0) {
    return new Date(sub.trial_end * 1000).toISOString();
  }
  const ends = (sub.items?.data ?? [])
    .map((item) => item.current_period_end)
    .filter((value): value is number => typeof value === "number" && value > 0);
  if (!ends.length) return null;
  return new Date(Math.max(...ends) * 1000).toISOString();
}

export function founderOfferFromPromo(
  promo: PromoSnapshot,
  listPrice: number,
  nowSeconds: number,
): FounderOffer | null {
  if (!promo.active || !promo.coupon?.valid) return null;
  if (promo.coupon.duration !== "forever") return null;
  if (promo.expiresAt != null && promo.expiresAt <= nowSeconds) return null;
  if (promo.maxRedemptions == null || promo.timesRedeemed >= promo.maxRedemptions) return null;
  const price = discountedPrice(promo.coupon, listPrice);
  if (price == null) return null;
  return {
    price,
    spotsLeft: promo.maxRedemptions - promo.timesRedeemed,
    spotsTotal: promo.maxRedemptions,
  };
}

function discountedPrice(
  coupon: NonNullable<PromoSnapshot["coupon"]>,
  listPrice: number,
): number | null {
  if (coupon.amountOff != null) {
    if (coupon.currency && coupon.currency.toLowerCase() !== "usd") return null;
    if (coupon.amountOff % 100 !== 0) return null;
    const price = listPrice - coupon.amountOff / 100;
    return price > 0 && price < listPrice ? price : null;
  }
  if (coupon.percentOff != null && coupon.percentOff > 0 && coupon.percentOff < 100) {
    const price = Math.round(listPrice * (1 - coupon.percentOff / 100));
    return price > 0 && price < listPrice ? price : null;
  }
  return null;
}

export function founderLine(offer: FounderOffer): string {
  return `Founding member price: ${formatMoney(offer.price)}/mo for life. ${offer.spotsLeft} of ${offer.spotsTotal} spots left.`;
}

export type CheckoutCommercials = {
  trialPeriodDays: number | null;
  paymentMethodCollection: "always" | null;
  /** Set only when the founder code is applied. Stripe rejects this together with allow_promotion_codes. */
  promotionCode: string | null;
  allowPromotionCodes: boolean;
};

/**
 * Monthly checkout auto-applies the founder code when one is available.
 * Every other session lets the customer type a code. Stripe allows one of those, not both.
 */
export function checkoutCommercials(
  plan: PlanId,
  founderPromoId: string | null,
): CheckoutCommercials {
  const founder = plan === "monthly" && Boolean(founderPromoId);
  return {
    trialPeriodDays: plan === "monthly" ? MONTHLY_TRIAL_DAYS : null,
    paymentMethodCollection: plan === "monthly" ? "always" : null,
    promotionCode: founder ? founderPromoId : null,
    allowPromotionCodes: !founder,
  };
}

export function checkoutIntegrationId(random: () => number = Math.random): string {
  const alphabet = "abcdefghijklmnopqrstuvwxyz";
  let suffix = "";
  for (let i = 0; i < 8; i += 1) suffix += alphabet[Math.floor(random() * alphabet.length)] ?? "a";
  return `algo_swamp_desk_${suffix}`;
}
