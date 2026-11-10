import {
  COURSE_ID,
  MOTHER_BAR_LEVELS_ID,
  MOTHER_BAR_LEVELS_PRICE_CENTS,
  MOTHER_BAR_SWEEP_SCAN_ID,
  MOTHER_BAR_SWEEP_SCAN_PRICE_CENTS,
  OPTIONS_101_PRICE_USD,
  OPTIONS_201_ID,
  OPTIONS_201_PRICE_USD,
  STARTER_KIT_ID,
  STARTER_KIT_PRICE_USD,
  courseOffer,
} from "@/lib/course/access";
import { MONTHLY_TRIAL_DAYS } from "@/lib/plans";

/** Paid Starter Kit checkouts that still receive the launch desk trial. */
export const STARTER_KIT_BONUS_SPOTS = 25;

/** Monthly desk trial offered to those buyers. The usual desk trial stays 7 days. */
export const STARTER_KIT_DESK_TRIAL_DAYS = 30;

export const STARTER_KIT_BONUS_COPY = "First 25 buyers get 30 days of the desk free.";

export const STARTER_KIT_DESK_TRIAL_COPY =
  "Start 30 days of the desk free. Stripe collects a card now and charges $29 a month after 30 days. Cancel before then and you are not charged. The kit purchase does not start this subscription.";

export const STARTER_KIT_ITEMS = [
  {
    id: COURSE_ID,
    name: "Options 101",
    priceUsd: OPTIONS_101_PRICE_USD,
    href: "/learn/options-101",
  },
  {
    id: OPTIONS_201_ID,
    name: "Options 201: Vertical Spreads",
    priceUsd: OPTIONS_201_PRICE_USD,
    href: "/learn/options-201",
  },
  {
    id: MOTHER_BAR_LEVELS_ID,
    name: "Mother Bar Levels thinkorswim study",
    priceUsd: MOTHER_BAR_LEVELS_PRICE_CENTS / 100,
    href: "/tools/mother-bar-levels",
  },
  {
    id: MOTHER_BAR_SWEEP_SCAN_ID,
    name: "Mother Bar Sweep Scan",
    priceUsd: MOTHER_BAR_SWEEP_SCAN_PRICE_CENTS / 100,
    href: "/tools/mother-bar-sweep-scan",
  },
] as const;

export const STARTER_KIT_INCLUDES = STARTER_KIT_ITEMS.map((item) => item.id);

export const STARTER_KIT_LIST_USD = STARTER_KIT_ITEMS.reduce((sum, item) => sum + item.priceUsd, 0);

export const STARTER_KIT_FAQ = [
  {
    question: "What is in the Swamp Starter Kit?",
    answer:
      "Options 101 ($39), Options 201: Vertical Spreads ($39), the Mother Bar Levels thinkorswim study ($29), and the Mother Bar Sweep Scan ($29). Bought together they are $49 once.",
  },
  {
    question: "Does buying the kit start a desk subscription?",
    answer:
      "No. The $49 charge is one-time. A desk subscription starts only if you choose to start one in Stripe. Nothing else is billed unless you do that.",
  },
  {
    question: "What is the refund policy?",
    answer:
      "A full refund in Stripe removes Options 101, Options 201, Mother Bar Levels, and the Mother Bar Sweep Scan from that purchase. Access you bought separately stays. A desk subscription is a separate Stripe subscription and is not canceled by the kit refund.",
  },
  {
    question: "Is this financial advice?",
    answer:
      "No. The classes are educational. The thinkorswim files are educational tools, not a recommendation to trade. ALGO Swamp is not affiliated with or endorsed by Charles Schwab or thinkorswim.",
  },
] as const;

export type StarterKitDeskTrial = "offer" | "already-open" | "hidden";

export type StarterKitPageState = {
  signedIn: boolean;
  owned: boolean;
  bonusOpen: boolean;
  deskTrial: StarterKitDeskTrial;
};

/**
 * True while fewer than 25 Starter Kit checkouts have been recorded.
 * Refunded checkouts still count, so a refund does not open another bonus spot.
 * The same check decides a new buyer's bonus (pass the count from before the insert)
 * and whether the public page still shows the launch line.
 */
export function starterKitBonusOpen(
  purchaseCount: number,
  spots = STARTER_KIT_BONUS_SPOTS,
): boolean {
  return Number.isInteger(purchaseCount) && purchaseCount >= 0 && purchaseCount < spots;
}

/** The public sentence, or null once the bonus is closed or this visitor already owns the kit. */
export function starterKitPublicBonusLine(input: {
  owned: boolean;
  bonusOpen: boolean;
}): string | null {
  if (input.owned || !input.bonusOpen) return null;
  return STARTER_KIT_BONUS_COPY;
}

export function starterKitDeskTrial(input: {
  owned: boolean;
  bonus: boolean;
  redeemed: boolean;
  membershipActive: boolean;
}): StarterKitDeskTrial {
  if (!input.owned || !input.bonus || input.redeemed) return "hidden";
  if (input.membershipActive) return "already-open";
  return "offer";
}

export function starterKitPageState(input: {
  userId: string | null;
  purchaseCount: number;
  paid: boolean;
  deskBonus: boolean;
  redeemed: boolean;
  membershipActive: boolean;
}): StarterKitPageState {
  const owned = Boolean(input.userId) && input.paid;
  return {
    signedIn: Boolean(input.userId),
    owned,
    bonusOpen: starterKitBonusOpen(input.purchaseCount),
    deskTrial: input.userId
      ? starterKitDeskTrial({
          owned,
          bonus: input.deskBonus,
          redeemed: input.redeemed,
          membershipActive: input.membershipActive,
        })
      : "hidden",
  };
}

export function deskTrialDays(starterKitTrial: boolean): number {
  return starterKitTrial ? STARTER_KIT_DESK_TRIAL_DAYS : MONTHLY_TRIAL_DAYS;
}

/** Course ids written for a paid checkout. A kit writes itself plus each included product. */
export function entitlementsForCheckout(courseId: string): readonly string[] {
  if (!courseOffer(courseId)) return [];
  if (courseId === STARTER_KIT_ID) return [STARTER_KIT_ID, ...STARTER_KIT_INCLUDES];
  return [courseId];
}

export type PurchaseRow = {
  paymentIntentId: string | null;
  courseId: string;
  status: string;
};

/** Rows a full refund of this charge removes. Other payment intents stay paid. */
export function purchaseIdsRevokedByRefund(
  rows: readonly PurchaseRow[],
  refundedPaymentIntentId: string,
): string[] {
  return rows
    .filter((row) => row.status === "paid" && row.paymentIntentId === refundedPaymentIntentId)
    .map((row) => row.courseId);
}

export function starterKitPriceUsd(): number {
  return courseOffer(STARTER_KIT_ID)?.priceUsd ?? STARTER_KIT_PRICE_USD;
}
