import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  checkoutCommercials,
  checkoutIntegrationId,
  courseCheckoutIntegrationId,
  founderLine,
  founderOfferFromPromo,
  grantsDesk,
  subscriptionAccessEnd,
  type PromoSnapshot,
} from "./billing.ts";

const now = Math.floor(Date.parse("2026-10-22T12:00:00Z") / 1000);

function promo(partial: Partial<PromoSnapshot> = {}): PromoSnapshot {
  return {
    active: true,
    timesRedeemed: 3,
    maxRedemptions: 10,
    expiresAt: null,
    coupon: {
      valid: true,
      duration: "forever",
      amountOff: 1000,
      percentOff: null,
      currency: "usd",
    },
    ...partial,
  };
}

describe("trial access", () => {
  it("treats trialing as a member and ends access at the trial, not a later invoice", () => {
    assert.equal(grantsDesk("trialing"), true);
    assert.equal(grantsDesk("active"), true);
    assert.equal(grantsDesk("canceled"), false);
    assert.equal(grantsDesk("incomplete"), false);
    const end = subscriptionAccessEnd({
      status: "trialing",
      trial_end: now + 7 * 24 * 60 * 60,
      items: { data: [{ current_period_end: now + 37 * 24 * 60 * 60 }] },
    });
    assert.equal(end, new Date((now + 7 * 24 * 60 * 60) * 1000).toISOString());
  });

  it("uses the paid period once the trial is over", () => {
    const period = now + 30 * 24 * 60 * 60;
    assert.equal(
      subscriptionAccessEnd({
        status: "active",
        trial_end: now - 1000,
        items: { data: [{ current_period_end: period }] },
      }),
      new Date(period * 1000).toISOString(),
    );
  });
});

describe("founder offer", () => {
  it("prices ten dollars off forever and counts the spots still open", () => {
    const offer = founderOfferFromPromo(promo(), 29, now);
    assert.deepEqual(offer, { price: 19, spotsLeft: 7, spotsTotal: 10 });
    assert.equal(
      founderLine(offer!),
      "Founding member price: $19/mo for life. 7 of 10 spots left.",
    );
  });

  it("hides the deal when the code is off, used up, expiring, or not forever", () => {
    assert.equal(founderOfferFromPromo(promo({ active: false }), 29, now), null);
    assert.equal(founderOfferFromPromo(promo({ timesRedeemed: 10 }), 29, now), null);
    assert.equal(founderOfferFromPromo(promo({ maxRedemptions: null }), 29, now), null);
    assert.equal(founderOfferFromPromo(promo({ expiresAt: now - 1 }), 29, now), null);
    assert.equal(
      founderOfferFromPromo(promo({ coupon: { ...promo().coupon!, duration: "once" } }), 29, now),
      null,
    );
    assert.equal(founderOfferFromPromo(promo({ coupon: null }), 29, now), null);
  });
});

describe("checkout commercials", () => {
  it("gives monthly a 7-day card trial and auto-applies the founder code without a typed-code field", () => {
    const monthly = checkoutCommercials("monthly", "promo_founder");
    assert.equal(monthly.trialPeriodDays, 7);
    assert.equal(monthly.paymentMethodCollection, "always");
    assert.equal(monthly.promotionCode, "promo_founder");
    assert.equal(monthly.allowPromotionCodes, false);
  });

  it("lets the customer type a code when the founder deal is absent, and never trials annual", () => {
    const monthly = checkoutCommercials("monthly", null);
    assert.equal(monthly.trialPeriodDays, 7);
    assert.equal(monthly.promotionCode, null);
    assert.equal(monthly.allowPromotionCodes, true);
    const annual = checkoutCommercials("annual", "promo_founder");
    assert.equal(annual.trialPeriodDays, null);
    assert.equal(annual.paymentMethodCollection, null);
    assert.equal(annual.promotionCode, null);
    assert.equal(annual.allowPromotionCodes, true);
  });

  it("tags the session with an eight-letter suffix", () => {
    assert.equal(
      checkoutIntegrationId(() => 0),
      "algo_swamp_desk_aaaaaaaa",
    );
    assert.equal(
      courseCheckoutIntegrationId(() => 0),
      "algo_swamp_course_aaaaaaaa",
    );
    assert.equal(
      courseCheckoutIntegrationId(() => 0, "algo_swamp_c201_"),
      "algo_swamp_c201_aaaaaaaa",
    );
  });
});
