import {
  MOTHER_BAR_LEVELS_ID,
  MOTHER_BAR_LEVELS_PRICE_CENTS,
  MOTHER_BAR_SWEEP_SCAN_ID,
  MOTHER_BAR_SWEEP_SCAN_PRICE_CENTS,
  courseOffer,
} from "@/lib/course/access";

/**
 * Later one-time bundle: Mother Bar Levels plus Mother Bar Sweep Scan, $39.
 * Not for sale. Do not add this id to the Checkout catalog or open a session for it.
 */
export const MOTHER_BAR_BUNDLE = {
  id: "mother-bar-bundle",
  priceUsd: 39,
  forSale: false,
  includes: [MOTHER_BAR_LEVELS_ID, MOTHER_BAR_SWEEP_SCAN_ID] as const,
} as const;

export const STUDY_DISCLAIMER =
  "Educational tool only. Not financial advice. No performance or profit claims. Past patterns do not predict future results. Not affiliated with or endorsed by Charles Schwab or thinkorswim.";

export const MOTHER_BAR_LEVELS_DAILY_IMAGE = "/mother-bar-levels-daily.webp";
export const MOTHER_BAR_LEVELS_INTRADAY_IMAGE = "/mother-bar-levels-15m.webp";
export const MOTHER_BAR_LEVELS_OG_PATH = "/og-mother-bar-levels.jpg";
export const MOTHER_BAR_SWEEP_SCAN_OG_PATH = "/og-mother-bar-sweep-scan.jpg";

/**
 * Public path for a scan screenshot. Null keeps the on-page placeholder.
 * Swap this for a path under public/ when a real scan image exists.
 */
export const MOTHER_BAR_SWEEP_SCAN_IMAGE: string | null = null;

export const STUDY_FAQ = [
  {
    question: "Does Mother Bar Levels work on any timeframe?",
    answer:
      "Yes. Add it to any chart. It uses the bars on that chart, so it follows whatever timeframe the chart is set to.",
  },
  {
    question: "Is Mother Bar Levels included with the desk?",
    answer:
      "No. A monthly desk, an annual desk, and the 7-day trial do not include it. It is a separate $29 purchase, the same way Options 201 is sold.",
  },
  {
    question: "What is the refund policy?",
    answer:
      "Refunds follow the same handling as Options 201. A full refund issued in Stripe removes access to the download.",
  },
  {
    question: "Does it work on thinkorswim?",
    answer:
      "Yes. It is a study file for the Charles Schwab thinkorswim desktop platform on Windows. ALGO Swamp is not affiliated with or endorsed by Charles Schwab or thinkorswim.",
  },
] as const;

export const SCAN_FAQ = [
  {
    question: "What does the sweep scan find?",
    answer:
      "It finds symbols where a later bar sweeps the mother bar and closes back through that level. With Bullish left on yes, the bar's low is below the mother bar's low and the close is back above that low. Set Bullish to no and it looks for a bar whose high is above the mother bar's high and whose close is back below that high. The mother bar is the bar immediately before an inside bar. The match has to land after that inside bar, and no later than the Lookback (10 bars by default).",
  },
  {
    question: "Does the scan work on any timeframe?",
    answer:
      "The script does not lock a timeframe. Stock Hacker runs it on the aggregation you pick for the scan.",
  },
  {
    question: "Is the sweep scan included with the desk?",
    answer:
      "No. A monthly desk, an annual desk, and the 7-day trial do not include it. It is a separate $29 purchase, the same way Options 201 is sold.",
  },
  {
    question: "What is the refund policy?",
    answer:
      "Refunds follow the same handling as Options 201. A full refund issued in Stripe removes access to the download.",
  },
  {
    question: "Does it work on thinkorswim?",
    answer:
      "Yes. It is a Stock Hacker scan query for the Charles Schwab thinkorswim desktop platform on Windows. ALGO Swamp is not affiliated with or endorsed by Charles Schwab or thinkorswim.",
  },
] as const;

const LEVELS_INSTALL = [
  "On the thinkorswim desktop for Windows, open Charts.",
  "Open Studies, then Edit Studies.",
  "Choose Import, select MotherBarLevels.ts, then add Mother Bar Levels to the chart.",
] as const;

const SCAN_INSTALL = [
  "On the thinkorswim desktop for Windows, open the Scan tab and choose Stock Hacker.",
  "Open the scan query menu (the menu on the scan setup) and choose Load Scan Query.",
  "Select MotherBarSweepScan.ts. This file is a scan query, with plot scan, so it loads here rather than through Charts, Studies, Import.",
] as const;

export type StudyImage = {
  src: string;
  alt: string;
  width: number;
  height: number;
};

export type StudyPageCopy = {
  id: typeof MOTHER_BAR_LEVELS_ID | typeof MOTHER_BAR_SWEEP_SCAN_ID;
  pathname: "/tools/mother-bar-levels" | "/tools/mother-bar-sweep-scan";
  eyebrow: string;
  title: string;
  description: string;
  h1: string;
  hook: string;
  lede: string;
  detailTitle: string;
  details: readonly string[];
  installTitle: string;
  install: readonly string[];
  faqs: readonly { question: string; answer: string }[];
  downloadLabel: string;
  images: readonly StudyImage[];
  placeholder: string | null;
  ogPath: string;
  relatedHref: "/tools/mother-bar-levels" | "/tools/mother-bar-sweep-scan";
  relatedLabel: string;
};

export const MOTHER_BAR_LEVELS_PAGE_COPY: StudyPageCopy = {
  id: MOTHER_BAR_LEVELS_ID,
  pathname: "/tools/mother-bar-levels",
  eyebrow: "thinkorswim mother bar indicator",
  title: "Mother Bar Levels: thinkorswim Mother Bar Indicator — $29",
  description:
    "A thinkorswim mother bar indicator. Marks the bar before an inside bar with high, low, open, and close lines, and alerts when the close crosses. $29 once.",
  h1: "Mother Bar Levels",
  hook: "Mark the mother bar. Watch the break.",
  lede: "The study marks the most recent mother bar, a bar followed by an inside bar. The next bar's high is below this bar's high, and the next bar's low is above this bar's low.",
  detailTitle: "What it plots",
  details: [
    "The high and the low are solid dark orange lines.",
    "The open and the close are dashed dark orange lines.",
    "The lines start at that bar and extend to the right.",
    "After the mother bar, it alerts when the close crosses the mother high or the mother low.",
    "It uses the bars on the chart you add it to, on any timeframe.",
  ],
  installTitle: "Install on Windows",
  install: LEVELS_INSTALL,
  faqs: STUDY_FAQ,
  downloadLabel: "Download MotherBarLevels.ts",
  images: [
    {
      src: MOTHER_BAR_LEVELS_DAILY_IMAGE,
      alt: "SPY daily chart with Mother Bar Levels. Dark orange lines mark the mother bar high, low, open, and close. A later bar trades below the mother low.",
      width: 1920,
      height: 988,
    },
    {
      src: MOTHER_BAR_LEVELS_INTRADAY_IMAGE,
      alt: "SPY 15-minute chart on October 29, 2026, with Mother Bar Levels drawing dark orange high, low, open, and close lines out to the right.",
      width: 1920,
      height: 988,
    },
  ],
  placeholder: null,
  ogPath: MOTHER_BAR_LEVELS_OG_PATH,
  relatedHref: "/tools/mother-bar-sweep-scan",
  relatedLabel: "Mother Bar Sweep Scan — an inside bar scan for thinkorswim Stock Hacker",
};

export const MOTHER_BAR_SWEEP_SCAN_PAGE_COPY: StudyPageCopy = {
  id: MOTHER_BAR_SWEEP_SCAN_ID,
  pathname: "/tools/mother-bar-sweep-scan",
  eyebrow: "inside bar scan for thinkorswim",
  title: "Mother Bar Sweep Scan: Inside Bar Scan for thinkorswim — $29",
  description:
    "An inside bar scan for thinkorswim Stock Hacker. Finds a bar that sweeps the mother bar low or high and closes back through it within 10 bars. $29 once.",
  h1: "Mother Bar Sweep Scan",
  hook: "Find a sweep of the mother bar.",
  lede: "This is a Stock Hacker scan query. It does not draw lines. A symbol passes when a later bar trades through the mother bar and closes back through that same level.",
  detailTitle: "What it finds",
  details: [
    "An inside bar is one whose high is below the prior high and whose low is above the prior low. The mother bar is the bar just before that inside bar.",
    "Bullish is yes by default. That looks for a bar whose low is below the mother low and whose close is back above the mother low.",
    "Set Bullish to no and it looks for a bar whose high is above the mother high and whose close is back below the mother high.",
    "The inside bar itself is not a match. The sweep has to print on a later bar, at most Lookback bars after the inside bar. Lookback defaults to 10.",
    "The script does not filter by volume and it does not send an alert. Stock Hacker uses the symbol list and aggregation you set.",
  ],
  installTitle: "Install the scan on Windows",
  install: SCAN_INSTALL,
  faqs: SCAN_FAQ,
  downloadLabel: "Download MotherBarSweepScan.ts",
  images: [],
  placeholder: "Scan example coming soon",
  ogPath: MOTHER_BAR_SWEEP_SCAN_OG_PATH,
  relatedHref: "/tools/mother-bar-levels",
  relatedLabel: "Mother Bar Levels — the thinkorswim mother bar indicator",
};

export function studyPageCopy(id: string): StudyPageCopy | null {
  if (id === MOTHER_BAR_LEVELS_ID) return MOTHER_BAR_LEVELS_PAGE_COPY;
  if (id === MOTHER_BAR_SWEEP_SCAN_ID) return MOTHER_BAR_SWEEP_SCAN_PAGE_COPY;
  return null;
}

export function studyPriceUsd(id: string): number {
  const offer = courseOffer(id);
  if (offer?.kind === "download") return offer.priceUsd;
  if (id === MOTHER_BAR_LEVELS_ID) return MOTHER_BAR_LEVELS_PRICE_CENTS / 100;
  return MOTHER_BAR_SWEEP_SCAN_PRICE_CENTS / 100;
}

export const BUNDLE_LINE =
  "A $39 bundle with Mother Bar Levels and the Mother Bar Sweep Scan is coming soon. Each file is $29 on its own until then.";

export function studyFileHeader(kind: "study" | "scan"): string {
  const noun = kind === "study" ? "study" : "scan";
  return [
    "# Educational tool only. Not financial advice.",
    `# This ${noun} makes no performance or profit claims.`,
    "# Past patterns do not predict future results.",
    "# Not affiliated with or endorsed by Charles Schwab or thinkorswim.",
    "",
    "",
  ].join("\n");
}

/** Header plus the shipped thinkScript. The source body is left unchanged. */
export function deliverableThinkscript(header: string, source: string): string {
  const body = source.endsWith("\n") ? source : `${source}\n`;
  return `${header}${body}`;
}

export function studyDownloadStatus(input: { signedIn: boolean; owned: boolean }): 200 | 401 | 403 {
  if (!input.signedIn) return 401;
  if (!input.owned) return 403;
  return 200;
}
