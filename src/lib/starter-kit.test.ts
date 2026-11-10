import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";
import {
  STARTER_KIT_ID,
  STARTER_KIT_STRIPE_PRICE_ID,
  STARTER_KIT_STRIPE_PRODUCT_ID,
  courseCheckoutParams,
  courseFulfillmentDecision,
  courseOffer,
  resolveCoursePriceId,
} from "./course/access.ts";
import { refundPaidPurchases } from "./course/refund.ts";
import type { Sql } from "./db.ts";
import { MONTHLY_TRIAL_DAYS } from "./plans.ts";
import { STARTER_KIT_PAGE, routeHead } from "./seo.ts";
import {
  countStarterKitPurchases,
  saveStarterKitPurchaseRows,
  type StarterKitPurchaseInput,
} from "./starter-kit.purchase.ts";
import {
  STARTER_KIT_BONUS_COPY,
  STARTER_KIT_BONUS_SPOTS,
  STARTER_KIT_DESK_TRIAL_DAYS,
  STARTER_KIT_INCLUDES,
  STARTER_KIT_LIST_USD,
  deskTrialDays,
  entitlementsForCheckout,
  purchaseIdsRevokedByRefund,
  starterKitBonusOpen,
  starterKitDeskTrial,
  starterKitPageState,
  starterKitPriceUsd,
  starterKitPublicBonusLine,
} from "./starter-kit.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

function purchase(index: number, userId = `user_${index}`): StarterKitPurchaseInput {
  return {
    stripeCheckoutSessionId: `cs_kit_${index}`,
    userId,
    stripePaymentIntentId: `pi_kit_${index}`,
    stripeCustomerId: null,
    amountCents: 4900,
    currency: "usd",
  };
}

function toSql(pg: PGlite): Sql {
  const run = async <T>(text: string, params: unknown[]): Promise<T[]> => {
    const result = await pg.query<T>(text, params);
    return result.rows;
  };
  const sql = (async <T = Record<string, unknown>>(
    strings: TemplateStringsArray,
    ...values: unknown[]
  ): Promise<T[]> => {
    let text = strings[0] ?? "";
    for (let i = 0; i < values.length; i += 1) text += `$${i + 1}${strings[i + 1] ?? ""}`;
    return run<T>(text, values);
  }) as Sql;
  sql.query = (text, params = []) => run(text, params);
  return sql;
}

async function kitDb(): Promise<Sql> {
  const pg = new PGlite();
  await pg.waitReady;
  await pg.exec(readFileSync(join(root, "migrations/0005_options_101.sql"), "utf8"));
  await pg.exec(readFileSync(join(root, "migrations/0006_starter_kit.sql"), "utf8"));
  return toSql(pg);
}

describe("starter kit offer", () => {
  it("sells the live $49 price and grants every included product", () => {
    assert.equal(starterKitPriceUsd(), 49);
    assert.equal(STARTER_KIT_LIST_USD, 136);
    assert.equal(STARTER_KIT_STRIPE_PRODUCT_ID, "prod_VbUKC5p7JdywzJ");
    assert.equal(courseOffer(STARTER_KIT_ID)?.kind, "bundle");
    assert.equal(courseOffer(STARTER_KIT_ID)?.includedWithDesk, false);
    assert.equal(resolveCoursePriceId(STARTER_KIT_ID, undefined), STARTER_KIT_STRIPE_PRICE_ID);
    assert.equal(resolveCoursePriceId(STARTER_KIT_ID, "  price_override  "), "price_override");
    assert.deepEqual(
      [...entitlementsForCheckout(STARTER_KIT_ID)].sort(),
      [STARTER_KIT_ID, ...STARTER_KIT_INCLUDES].sort(),
    );
    assert.deepEqual(entitlementsForCheckout("options-201"), ["options-201"]);
    assert.deepEqual(entitlementsForCheckout("options-101"), ["options-101"]);
    assert.deepEqual(entitlementsForCheckout("mother-bar-levels"), ["mother-bar-levels"]);
    assert.deepEqual(entitlementsForCheckout("mother-bar-sweep-scan"), ["mother-bar-sweep-scan"]);
    assert.deepEqual(entitlementsForCheckout("mother-bar-bundle"), []);
    assert.equal(
      courseFulfillmentDecision({
        mode: "payment",
        paymentStatus: "paid",
        courseId: STARTER_KIT_ID,
      }),
      "grant",
    );
    assert.equal(
      courseFulfillmentDecision({
        mode: "payment",
        paymentStatus: "unpaid",
        courseId: STARTER_KIT_ID,
      }),
      "skip",
    );
    assert.equal(
      courseFulfillmentDecision({
        mode: "payment",
        paymentStatus: "paid",
        courseId: "mother-bar-bundle",
      }),
      "skip",
    );

    const params = courseCheckoutParams({
      userId: "user_1",
      origin: "https://news.algoswamp.com",
      priceId: resolveCoursePriceId(STARTER_KIT_ID, null),
      customerId: null,
      integrationId: "algo_swamp_kit_aaaaaaaa",
      courseId: STARTER_KIT_ID,
    });
    assert.equal(params.mode, "payment");
    assert.equal("payment_method_types" in params, false);
    assert.deepEqual(params.line_items[0], {
      price: "price_1UaHLoLAdDbAQPuJ3Hhbov0V",
      quantity: 1,
    });
    assert.equal(params.metadata.course_id, STARTER_KIT_ID);
    assert.equal(params.payment_intent_data.metadata.course_id, STARTER_KIT_ID);
    assert.equal(
      params.success_url,
      "https://news.algoswamp.com/starter-kit?session_id={CHECKOUT_SESSION_ID}",
    );
    assert.equal(params.cancel_url, "https://news.algoswamp.com/starter-kit");
  });

  it("revokes every row from the refunded charge and leaves a separate purchase paid", () => {
    const rows = [
      ...entitlementsForCheckout(STARTER_KIT_ID).map((courseId) => ({
        paymentIntentId: "pi_kit",
        courseId,
        status: "paid" as const,
      })),
      { paymentIntentId: "pi_own", courseId: "options-101", status: "paid" as const },
    ];
    assert.deepEqual(
      [...purchaseIdsRevokedByRefund(rows, "pi_kit")].sort(),
      [...entitlementsForCheckout(STARTER_KIT_ID)].sort(),
    );
    assert.deepEqual(purchaseIdsRevokedByRefund(rows, "pi_own"), ["options-101"]);
    assert.deepEqual(
      purchaseIdsRevokedByRefund(
        rows.map((row) =>
          row.paymentIntentId === "pi_kit" ? { ...row, status: "refunded" } : row,
        ),
        "pi_kit",
      ),
      [],
    );
  });
});

describe("starter kit bonus counter", () => {
  it("opens the bonus for the first 25 checkouts and hides the public line after that", () => {
    for (let count = 0; count < STARTER_KIT_BONUS_SPOTS; count += 1) {
      assert.equal(starterKitBonusOpen(count), true);
    }
    assert.equal(starterKitBonusOpen(STARTER_KIT_BONUS_SPOTS), false);
    assert.equal(starterKitBonusOpen(STARTER_KIT_BONUS_SPOTS + 1), false);
    assert.equal(starterKitBonusOpen(-1), false);
    assert.equal(starterKitBonusOpen(1.5), false);
    assert.equal(STARTER_KIT_BONUS_COPY, "First 25 buyers get 30 days of the desk free.");
    assert.doesNotMatch(STARTER_KIT_BONUS_COPY, /spots left|remaining|of 25/i);

    const open = starterKitPageState({
      userId: null,
      purchaseCount: 24,
      paid: false,
      deskBonus: false,
      redeemed: false,
      membershipActive: false,
    });
    assert.deepEqual(Object.keys(open).sort(), ["bonusOpen", "deskTrial", "owned", "signedIn"]);
    assert.equal(open.bonusOpen, true);
    assert.equal(starterKitPublicBonusLine(open), STARTER_KIT_BONUS_COPY);

    const closed = starterKitPageState({
      userId: null,
      purchaseCount: 25,
      paid: false,
      deskBonus: false,
      redeemed: false,
      membershipActive: false,
    });
    assert.equal(closed.bonusOpen, false);
    assert.equal(starterKitPublicBonusLine(closed), null);
    assert.equal(starterKitPublicBonusLine({ owned: true, bonusOpen: true }), null);

    assert.equal(deskTrialDays(false), MONTHLY_TRIAL_DAYS);
    assert.equal(deskTrialDays(true), STARTER_KIT_DESK_TRIAL_DAYS);
    assert.equal(STARTER_KIT_DESK_TRIAL_DAYS, 30);
    assert.equal(
      starterKitDeskTrial({
        owned: true,
        bonus: true,
        redeemed: false,
        membershipActive: false,
      }),
      "offer",
    );
    assert.equal(
      starterKitDeskTrial({
        owned: true,
        bonus: true,
        redeemed: false,
        membershipActive: true,
      }),
      "already-open",
    );
    assert.equal(
      starterKitDeskTrial({
        owned: true,
        bonus: true,
        redeemed: true,
        membershipActive: false,
      }),
      "hidden",
    );
    assert.equal(
      starterKitDeskTrial({
        owned: true,
        bonus: false,
        redeemed: false,
        membershipActive: false,
      }),
      "hidden",
    );
  });

  it("records the bonus from the database count and a refund does not reopen it", async () => {
    const sql = await kitDb();
    for (let index = 0; index < STARTER_KIT_BONUS_SPOTS; index += 1) {
      const saved = await saveStarterKitPurchaseRows(sql, purchase(index));
      assert.equal(saved.deskBonus, true);
    }
    const afterCap = await saveStarterKitPurchaseRows(sql, purchase(STARTER_KIT_BONUS_SPOTS));
    assert.equal(afterCap.deskBonus, false);
    assert.equal(await countStarterKitPurchases(sql), STARTER_KIT_BONUS_SPOTS + 1);

    await refundPaidPurchases(sql, "pi_kit_0");
    const reopened = await saveStarterKitPurchaseRows(sql, purchase(STARTER_KIT_BONUS_SPOTS + 1));
    assert.equal(reopened.deskBonus, false);
    assert.equal(await countStarterKitPurchases(sql), STARTER_KIT_BONUS_SPOTS + 2);

    const replay = await saveStarterKitPurchaseRows(sql, purchase(1));
    assert.equal(replay.deskBonus, true);
    assert.equal(await countStarterKitPurchases(sql), STARTER_KIT_BONUS_SPOTS + 2);

    const granted = await sql<{ course_id: string; amount_cents: number; status: string }>`
      select course_id, amount_cents, status
      from course_purchases
      where stripe_checkout_session_id = 'cs_kit_1'
    `;
    assert.deepEqual(
      granted.map((row) => row.course_id).sort(),
      [STARTER_KIT_ID, ...STARTER_KIT_INCLUDES].sort(),
    );
    for (const row of granted) {
      assert.equal(row.status, "paid");
      assert.equal(row.amount_cents, row.course_id === STARTER_KIT_ID ? 4900 : 0);
    }

    await sql`
      insert into course_purchases (
        stripe_checkout_session_id, user_id, course_id, stripe_payment_intent_id,
        stripe_customer_id, amount_cents, currency, status
      )
      values ('cs_own', 'user_1', 'options-101', 'pi_own', null, 3900, 'usd', 'paid')
    `;
    await refundPaidPurchases(sql, "pi_kit_1");
    const afterRefund = await sql<{ course_id: string; status: string; payment: string }>`
      select course_id, status, stripe_payment_intent_id as payment
      from course_purchases
      where user_id = 'user_1' and course_id = 'options-101'
    `;
    const kitRow = afterRefund.find((row) => row.payment === "pi_kit_1");
    const ownRow = afterRefund.find((row) => row.payment === "pi_own");
    assert.equal(kitRow?.status, "refunded");
    assert.equal(ownRow?.status, "paid");

    const replayRefund = await saveStarterKitPurchaseRows(sql, purchase(1));
    assert.equal(replayRefund.deskBonus, false);
    const stillRefunded = await sql<{ status: string }>`
      select status from course_purchases
      where stripe_checkout_session_id = 'cs_kit_1'
    `;
    assert.ok(stillRefunded.every((row) => row.status === "refunded"));
  });
});

describe("starter kit page", () => {
  it("keeps the share card and does not publish a sales count", () => {
    assert.ok(STARTER_KIT_PAGE.title.length <= 60, STARTER_KIT_PAGE.title);
    assert.ok(STARTER_KIT_PAGE.description.length <= 155, STARTER_KIT_PAGE.description);
    assert.doesNotMatch(STARTER_KIT_PAGE.description, /'/);
    assert.doesNotMatch(STARTER_KIT_PAGE.description, /spots left|first 25/i);
    const image = routeHead(STARTER_KIT_PAGE).meta.find(
      (item) => "property" in item && item.property === "og:image",
    );
    assert.equal(
      image && "content" in image ? image.content : "",
      "https://news.algoswamp.com/og-starter-kit.jpg",
    );
    const product = JSON.parse(routeHead(STARTER_KIT_PAGE).scripts?.[0]?.children ?? "{}") as {
      "@graph": Array<{ "@type": string; offers?: { price?: string } }>;
    };
    assert.equal(
      product["@graph"].find((node) => node["@type"] === "Product")?.offers?.price,
      "49.00",
    );
    const card = readFileSync(join(root, "public/og-starter-kit.jpg"));
    assert.equal(card[0], 0xff);
    assert.equal(card[1], 0xd8);
    const page = readFileSync(join(root, "src/components/starter-kit-page.tsx"), "utf8");
    const route = readFileSync(join(root, "src/routes/starter-kit.tsx"), "utf8");
    assert.doesNotMatch(`${page}\n${route}`, /spots left|bonus spots|of 25/i);
    assert.match(page, /starterKitPublicBonusLine/);
    assert.match(readFileSync(join(root, "public/sitemap.xml"), "utf8"), /\/starter-kit</);
  });
});
