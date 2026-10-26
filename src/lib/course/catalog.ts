import { SITE_ORIGIN } from "@/lib/seo";

export type ModuleSeo = {
  id: string;
  /** On-page H1 (keyword-forward). The JSON `title` stays the outline label. */
  h1: string;
  title: string; // <= 60 chars
  description: string; // <= 155 chars
};

export const COURSE_PATH = "/learn";
export const COURSE_URL = `${SITE_ORIGIN}${COURSE_PATH}`;

export const MODULE_SEO: ModuleSeo[] = [
  {
    id: "m1-what-is-an-option",
    h1: "What Is an Option?",
    title: "What Is an Option? How Options Work — Options 101",
    description:
      "Options explained for beginners: what an option contract is, why one contract covers 100 shares, and buyer vs. seller roles. Free lesson and quiz.",
  },
  {
    id: "m2-calls-and-puts",
    h1: "Calls and Puts Explained",
    title: "Calls and Puts Explained for Beginners — Options 101",
    description:
      "Calls and puts explained: what each gives the buyer, which way the stock must move, and how to find break-even at expiration. Options 101, Module 2.",
  },
  {
    id: "m3-strike-expiration-premium",
    h1: "Strike Price, Expiration and Premium",
    title: "Strike Price, Expiration and Premium — Options 101",
    description:
      "What strike price, expiration, and premium mean, how to tell ITM, ATM, and OTM options apart, and what drives premium. Options 101, Module 3.",
  },
  {
    id: "m4-intrinsic-extrinsic",
    h1: "Intrinsic vs. Extrinsic Value",
    title: "Intrinsic vs. Extrinsic Value Explained — Options 101",
    description:
      "Calculate intrinsic and extrinsic (time) value for calls and puts, and see why time value decays to zero at expiration. Options 101, Module 4.",
  },
  {
    id: "m5-buying-vs-selling",
    h1: "Buying vs. Selling Options and the Risk of Each",
    title: "Buying vs. Selling Options: Risk Explained — Options 101",
    description:
      "Max loss and max gain for long vs. short options, why a naked call has unlimited risk, and the max loss of a credit spread. Options 101, Module 5.",
  },
  {
    id: "m6-greeks-basics",
    h1: "The Option Greeks at a Basic Level",
    title: "Option Greeks for Beginners: Delta & Theta — Options 101",
    description:
      "Delta, theta, vega, and gamma in plain English, typical delta ranges for calls and puts, and how to turn a Greek into dollars. Options 101, Module 6.",
  },
  {
    id: "m7-reading-option-chain-tos",
    h1: "How to Read an Option Chain in thinkorswim",
    title: "How to Read an Option Chain in thinkorswim — Options 101",
    description:
      "Read a thinkorswim option chain: bid, ask, mark, volume, open interest, delta, and Probability OTM, and judge liquidity. Options 101, Module 7.",
  },
  {
    id: "m8-risk-and-position-sizing",
    h1: "Basic Options Risk and Position Sizing",
    title: "Options Position Sizing and Risk Basics — Options 101",
    description:
      "Size an options trade from max risk per trade, why defined max loss drives sizing, plus assignment, liquidity, and event risk. Options 101, Module 8.",
  },
];

export function moduleSeo(id: string): ModuleSeo | undefined {
  return MODULE_SEO.find((m) => m.id === id);
}

/** Only Module 1 (index 0) is a public preview. Decide by index, never by the viewer's access. */
export function moduleRobots(index: number): string | undefined {
  return index === 0 ? undefined : "noindex,follow";
}
