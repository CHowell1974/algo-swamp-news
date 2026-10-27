export type ModuleSeo = {
  id: string;
  h1: string;
  title: string;
  description: string;
};

export const OPTIONS_201_PATH = "/learn/options-201";

export const MODULE_SEO_201: ModuleSeo[] = [
  {
    id: "m1-what-is-a-vertical",
    h1: "What Is a Vertical Spread?",
    title: "What Is a Vertical Spread? — Options 201",
    description:
      "What a vertical spread is, why traders use one, and how buying one option and selling another defines risk. Free Options 201 lesson.",
  },
  {
    id: "m2-debit-verticals",
    h1: "Debit Verticals: Bull Call and Bear Put Spreads",
    title: "Debit Verticals: Bull Call and Bear Put — Options 201",
    description:
      "Bull call and bear put spreads: how a debit vertical is built, which way it needs the stock to move, and what you pay to open it. Options 201.",
  },
  {
    id: "m3-credit-verticals",
    h1: "Credit Verticals: Bull Put and Bear Call Spreads",
    title: "Credit Verticals: Bull Put and Bear Call — Options 201",
    description:
      "Bull put and bear call spreads: how a credit vertical is built, the credit you collect, and the short strike you defend. Options 201.",
  },
  {
    id: "m4-strikes-width-expiration",
    h1: "Choosing Strikes, Width and Expiration",
    title: "Choosing Strikes, Width and Expiration — Options 201",
    description:
      "How strike choice, spread width, and expiration change a vertical's risk, reward, and probability. Options 201, Module 4.",
  },
  {
    id: "m5-profit-loss-breakeven",
    h1: "Max Profit, Max Loss and Break-Even",
    title: "Max Profit, Max Loss and Break-Even — Options 201",
    description:
      "Max profit, max loss, and break-even for debit and credit verticals, including the 100 share multiplier. Options 201, Module 5.",
  },
  {
    id: "m6-greeks-on-verticals",
    h1: "The Greeks on Vertical Spreads",
    title: "The Greeks on Vertical Spreads — Options 201",
    description:
      "How delta, theta, vega, and gamma behave on debit and credit verticals compared with a single option. Options 201, Module 6.",
  },
  {
    id: "m7-managing-closing-rolling",
    h1: "Managing, Closing and Rolling Verticals",
    title: "Managing, Closing and Rolling Verticals — Options 201",
    description:
      "When to close a vertical, how a closing order works, and what rolling changes about risk. Options 201, Module 7.",
  },
  {
    id: "m8-verticals-in-thinkorswim",
    h1: "Building Verticals in thinkorswim",
    title: "Building Vertical Spreads in thinkorswim — Options 201",
    description:
      "Build and send a vertical in thinkorswim: spread selector, bid and ask, net debit or credit, and confirm and send. Options 201, Module 8.",
  },
];

export function moduleSeo(id: string): ModuleSeo | undefined {
  return MODULE_SEO_201.find((module) => module.id === id);
}

/** Module 1 is the public preview. Later modules are noindex by position, never by the viewer's access. */
export function moduleRobots201(index: number): string | undefined {
  return index === 0 ? undefined : "noindex,follow";
}
