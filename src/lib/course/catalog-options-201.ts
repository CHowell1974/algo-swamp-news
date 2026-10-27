import { SITE_ORIGIN } from "@/lib/site";
import type { ModuleSeo } from "@/lib/course/catalog";
import {
  OPTIONS_201_FREE_MODULE_COUNT,
  OPTIONS_201_INCLUDED_WITH_DESK,
  OPTIONS_201_PRICE_USD,
} from "@/lib/course/access";

export const COURSE_201_ID = "options-201";
export const COURSE_201_PATH = "/learn/options-201";
export const COURSE_201_URL = `${SITE_ORIGIN}${COURSE_201_PATH}`;
/** Chris, 2026-10-27: Modules 1 and 2. Module 3 is paid. */
export const FREE_201_MODULE_COUNT = OPTIONS_201_FREE_MODULE_COUNT;
export { OPTIONS_201_PRICE_USD, OPTIONS_201_INCLUDED_WITH_DESK };

export const MODULE_SEO_201: ModuleSeo[] = [
  {
    id: "m1-what-is-a-vertical",
    h1: "What Is a Vertical Spread?",
    title: "What Is a Vertical Spread? Debit vs. Credit — Options 201",
    description:
      "What a vertical spread is, how one long and one short option define risk, and the difference between debit and credit spreads. Free Options 201 lesson.",
  },
  {
    id: "m2-debit-verticals",
    h1: "Bull Call Spread and Bear Put Spread Explained",
    title: "Bull Call Spread & Bear Put Spread Explained — Options 201",
    description:
      "How to build a bull call spread and a bear put spread, with max loss, max profit, and break-even for debit spreads. Free Options 201 lesson.",
  },
  {
    id: "m3-credit-verticals",
    h1: "Credit Spreads: Bull Put Spread and Bear Call Spread",
    title: "Bull Put & Bear Call Credit Spreads Explained — Options 201",
    description:
      "Bull put and bear call credit spreads: max profit, max loss, break-even, and why max loss is often several times the credit. Options 201, Module 3.",
  },
  {
    id: "m4-strikes-width-expiration",
    h1: "How to Choose Strikes, Width and Expiration for a Vertical Spread",
    title: "Vertical Spread Strikes, Width and Expiration — Options 201",
    description:
      "How strike distance, width, and expiration change a vertical spread's debit or credit, max loss, and probability estimates. Options 201, Module 4.",
  },
  {
    id: "m5-profit-loss-breakeven",
    h1: "Vertical Spread Max Profit, Max Loss and Break-Even",
    title: "Vertical Spread Max Loss and Break-Even Math — Options 201",
    description:
      "Max profit, max loss, and break-even formulas for all four vertical spreads, plus P/L at expiration for any price. Options 201, Module 5.",
  },
  {
    id: "m6-greeks-on-verticals",
    h1: "The Greeks on Vertical Spreads",
    title: "Vertical Spread Greeks: Delta, Theta, Vega — Options 201",
    description:
      "Net delta, theta, vega, and gamma of a vertical spread, and why debit and credit spreads have opposite theta and vega. Options 201, Module 6.",
  },
  {
    id: "m7-managing-closing-rolling",
    h1: "Managing, Closing and Rolling Vertical Spreads",
    title: "Managing, Closing & Rolling Vertical Spreads — Options 201",
    description:
      "Close or roll a vertical spread as one order, and understand early assignment, pin risk at expiration, and legging risk. Options 201, Module 7.",
  },
  {
    id: "m8-verticals-in-thinkorswim",
    h1: "How to Place a Vertical Spread in thinkorswim",
    title: "How to Place a Vertical Spread in thinkorswim — Options 201",
    description:
      "Build a vertical spread in the thinkorswim option chain, enter a net debit or credit limit order, and check the Risk Profile. Options 201, Module 8.",
  },
];

export function moduleSeo201(id: string): ModuleSeo | undefined {
  return MODULE_SEO_201.find((module) => module.id === id);
}

/** Free previews are indexable. Decide by index, never by the viewer's access. */
export function moduleRobots201(index: number): string | undefined {
  return index < FREE_201_MODULE_COUNT ? undefined : "noindex,follow";
}

export const OPTIONS_201_PATH = COURSE_201_PATH;
