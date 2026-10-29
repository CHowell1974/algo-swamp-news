import type { CourseQuestion } from "./schema.ts";

export const COURSE_ID = "options-101";
export const OPTIONS_201_ID = "options-201";
export const OPTIONS_101_PRICE_CENTS = 3900;
export const OPTIONS_101_PRICE_USD = OPTIONS_101_PRICE_CENTS / 100;
export const OPTIONS_201_PRICE_CENTS = 3900;
export const OPTIONS_201_PRICE_USD = OPTIONS_201_PRICE_CENTS / 100;
/** Live one-time price for Options 201. STRIPE_PRICE_OPTIONS_201 overrides it. */
export const OPTIONS_201_STRIPE_PRICE_ID = "price_1UV9vCLAdDbAQPuJWWlzGRUu";
/** Live one-time price for Mother Bar Levels. STRIPE_PRICE_MOTHER_BAR_LEVELS overrides it. */
export const MOTHER_BAR_LEVELS_STRIPE_PRICE_ID = "price_1UVrUkLAdDbAQPuJwSy32dJb";
/** Live one-time price for Mother Bar Sweep Scan. STRIPE_PRICE_MOTHER_BAR_SWEEP_SCAN overrides it. */
export const MOTHER_BAR_SWEEP_SCAN_STRIPE_PRICE_ID = "price_1UVrXsLAdDbAQPuJZiWi1Wsz";
export const MOTHER_BAR_LEVELS_ID = "mother-bar-levels";
export const MOTHER_BAR_SWEEP_SCAN_ID = "mother-bar-sweep-scan";
export const MOTHER_BAR_LEVELS_PRICE_CENTS = 2900;
export const MOTHER_BAR_SWEEP_SCAN_PRICE_CENTS = 2900;
/**
 * Chris, 2026-10-27. Modules 1 and 2 are the free Options 201 preview.
 * Change this together with the landing copy, robots, sitemap, and JSON-LD.
 */
export const OPTIONS_201_FREE_MODULE_COUNT = 2;
/** Options 201 is a separate $39 purchase. The desk and the 7-day trial do not cover it. */
export const OPTIONS_201_INCLUDED_WITH_DESK = false;
/**
 * Options 101 is recommended before Options 201 and is not required.
 * Set this to "options-101" to lock paid 201 modules until that exam is passed.
 */
export const OPTIONS_201_PREREQUISITE_COURSE_ID: string | null = null;

/** Desk trial checkout. Used when the course JSON leaves that CTA url blank. */
export const DESK_TRIAL_PATH = "/join?plan=monthly";

export type CourseOffer = {
  id: string;
  shortName: string;
  priceCents: number;
  priceUsd: number;
  /**
   * Last free module index, inclusive. Options 101 and Options 201 are both 1 (modules 1–2).
   * Downloads have no free preview, so this is -1.
   */
  freeThroughIndex: number;
  includedWithDesk: boolean;
  /** Null means the earlier course is recommended, not required. */
  prerequisiteCourseId: string | null;
  homePath:
    | "/learn/options-101"
    | "/learn/options-201"
    | "/tools/mother-bar-levels"
    | "/tools/mother-bar-sweep-scan";
  productName: string;
  productDescription: string;
  integrationPrefix:
    "algo_swamp_course_" | "algo_swamp_c201_" | "algo_swamp_mbl_" | "algo_swamp_mbscan_";
  /** Courses have lessons. Downloads are a gated thinkorswim file. */
  kind: "course" | "download";
  /** Env var that overrides the Dashboard price. Empty falls through to defaultStripePriceId. */
  stripePriceEnv: string;
  /** Null uses inline price_data at priceCents. */
  defaultStripePriceId: string | null;
  downloadFilename: string | null;
};

const COURSE_OFFERS: Record<string, CourseOffer> = {
  [COURSE_ID]: {
    id: COURSE_ID,
    shortName: "Options 101",
    priceCents: OPTIONS_101_PRICE_CENTS,
    priceUsd: OPTIONS_101_PRICE_USD,
    freeThroughIndex: 1,
    includedWithDesk: true,
    prerequisiteCourseId: null,
    homePath: "/learn/options-101",
    productName: "Options 101",
    productDescription: "ALGO Swamp beginner options course. One-time purchase.",
    integrationPrefix: "algo_swamp_course_",
    kind: "course",
    stripePriceEnv: "STRIPE_PRICE_OPTIONS_101",
    defaultStripePriceId: null,
    downloadFilename: null,
  },
  [OPTIONS_201_ID]: {
    id: OPTIONS_201_ID,
    shortName: "Options 201",
    priceCents: OPTIONS_201_PRICE_CENTS,
    priceUsd: OPTIONS_201_PRICE_USD,
    freeThroughIndex: OPTIONS_201_FREE_MODULE_COUNT - 1,
    includedWithDesk: OPTIONS_201_INCLUDED_WITH_DESK,
    prerequisiteCourseId: OPTIONS_201_PREREQUISITE_COURSE_ID,
    homePath: "/learn/options-201",
    productName: "Options 201: Vertical Spreads",
    productDescription: "ALGO Swamp vertical spreads course. One-time purchase.",
    integrationPrefix: "algo_swamp_c201_",
    kind: "course",
    stripePriceEnv: "STRIPE_PRICE_OPTIONS_201",
    defaultStripePriceId: OPTIONS_201_STRIPE_PRICE_ID,
    downloadFilename: null,
  },
  /**
   * Same Checkout, webhook, and course_purchases row as Options 201.
   * Desk membership does not include these. The $39 study + scan bundle
   * is not an offer yet — see MOTHER_BAR_BUNDLE in studies/catalog.ts.
   */
  [MOTHER_BAR_LEVELS_ID]: {
    id: MOTHER_BAR_LEVELS_ID,
    shortName: "Mother Bar Levels",
    priceCents: MOTHER_BAR_LEVELS_PRICE_CENTS,
    priceUsd: MOTHER_BAR_LEVELS_PRICE_CENTS / 100,
    freeThroughIndex: -1,
    includedWithDesk: false,
    prerequisiteCourseId: null,
    homePath: "/tools/mother-bar-levels",
    productName: "Mother Bar Levels",
    productDescription:
      "ALGO Swamp thinkorswim study. Marks the latest mother bar. One-time purchase. Educational tool, not financial advice.",
    integrationPrefix: "algo_swamp_mbl_",
    kind: "download",
    stripePriceEnv: "STRIPE_PRICE_MOTHER_BAR_LEVELS",
    defaultStripePriceId: MOTHER_BAR_LEVELS_STRIPE_PRICE_ID,
    downloadFilename: "MotherBarLevels.ts",
  },
  [MOTHER_BAR_SWEEP_SCAN_ID]: {
    id: MOTHER_BAR_SWEEP_SCAN_ID,
    shortName: "Mother Bar Sweep Scan",
    priceCents: MOTHER_BAR_SWEEP_SCAN_PRICE_CENTS,
    priceUsd: MOTHER_BAR_SWEEP_SCAN_PRICE_CENTS / 100,
    freeThroughIndex: -1,
    includedWithDesk: false,
    prerequisiteCourseId: null,
    homePath: "/tools/mother-bar-sweep-scan",
    productName: "Mother Bar Sweep Scan",
    productDescription:
      "ALGO Swamp thinkorswim Stock Hacker scan. Finds a sweep of the mother bar. One-time purchase. Educational tool, not financial advice.",
    integrationPrefix: "algo_swamp_mbscan_",
    kind: "download",
    stripePriceEnv: "STRIPE_PRICE_MOTHER_BAR_SWEEP_SCAN",
    defaultStripePriceId: MOTHER_BAR_SWEEP_SCAN_STRIPE_PRICE_ID,
    downloadFilename: "MotherBarSweepScan.ts",
  },
};

export function courseOffer(id: string | null | undefined): CourseOffer | null {
  if (!id) return null;
  return COURSE_OFFERS[id] ?? null;
}

/**
 * A non-empty env price wins. Otherwise the offer's Dashboard price is used.
 * Options 101 has no default price id, so an empty result falls back to inline price_data.
 */
export function resolveCoursePriceId(
  courseId: string,
  envPrice: string | null | undefined,
): string | null {
  const override = envPrice?.trim() || "";
  if (override) return override;
  return courseOffer(courseId)?.defaultStripePriceId ?? null;
}

export function isDownloadOffer(id: string | null | undefined): boolean {
  return courseOffer(id)?.kind === "download";
}

export function courseEntitled(input: { membershipActive: boolean; purchased: boolean }): boolean {
  return input.purchased || input.membershipActive;
}

/**
 * Desk membership only opens a course when that course is included with the desk.
 * A purchase always opens it. Options 101 is included. Options 201 is not.
 */
export function resolveCourseAccess(input: {
  includedWithDesk: boolean;
  membershipActive: boolean;
  purchased: boolean;
  prerequisiteMet?: boolean;
}): { entitled: boolean; accessVia: "purchase" | "desk" | null } {
  const prerequisiteMet = input.prerequisiteMet !== false;
  const desk = input.includedWithDesk && input.membershipActive;
  const entitled =
    prerequisiteMet && courseEntitled({ membershipActive: desk, purchased: input.purchased });
  return {
    entitled,
    accessVia: entitled ? (input.purchased ? "purchase" : "desk") : null,
  };
}

/** True when checkout should refuse because the desk already covers this course. */
export function deskCoversCourse(includedWithDesk: boolean, membershipActive: boolean): boolean {
  return includedWithDesk && membershipActive;
}

/**
 * Free preview is per course. `freeThroughIndex` is inclusive.
 * Options 101 and Options 201 both open indexes 0 and 1.
 */
export function canReadModule(index: number, entitled: boolean, freeThroughIndex = 1): boolean {
  return index <= freeThroughIndex || entitled;
}

export function freePreviewLabel(freeThroughIndex: number): string {
  const count = freeThroughIndex + 1;
  if (count <= 1) return "Module 1 is free.";
  return `Modules 1–${count} are free.`;
}

export type PublicQuestion = {
  id: string;
  question: string;
  options: string[];
};

export function toPublicQuestion(question: CourseQuestion): PublicQuestion {
  return {
    id: question.id,
    question: question.question,
    options: [...question.options],
  };
}

export type GradeResult = {
  correct: number;
  total: number;
  percent: number;
  results: {
    id: string;
    selected: number;
    correct: boolean;
    answerIndex: number;
    explanation: string;
  }[];
};

export function gradeSubmission(questions: CourseQuestion[], selected: number[]): GradeResult {
  if (selected.length !== questions.length) {
    throw new Error("Answer every question.");
  }
  const results = questions.map((question, index) => {
    const choice = selected[index];
    if (!Number.isInteger(choice) || choice < 0 || choice >= question.options.length) {
      throw new Error("Answer every question.");
    }
    return {
      id: question.id,
      selected: choice,
      correct: choice === question.answerIndex,
      answerIndex: question.answerIndex,
      explanation: question.explanation,
    };
  });
  const correct = results.filter((result) => result.correct).length;
  return {
    correct,
    total: questions.length,
    percent: Math.round((correct / questions.length) * 100),
    results,
  };
}

export function examPassed(correct: number, passingScoreCount: number): boolean {
  return correct >= passingScoreCount;
}

export function nextBestCorrect(previous: number | null, correct: number): number {
  if (previous == null) return correct;
  return Math.max(previous, correct);
}

export function progressPercent(completed: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((completed / total) * 100);
}

export type CourseCtaLink =
  | { label: string; kind: "tools" }
  | { label: string; kind: "desk-trial" }
  | { label: string; kind: "external"; href: string };

/**
 * Blank CTA urls are the desk 7-day trial placeholder from the course file.
 * The Road Map link stays on this site instead of leaving a preview host.
 */
export function resolveCourseCta(cta: { label: string; url: string }): CourseCtaLink {
  const url = cta.url.trim();
  if (!url || url === DESK_TRIAL_PATH || url === "https://news.algoswamp.com/join?plan=monthly") {
    return { label: cta.label, kind: "desk-trial" };
  }
  if (url === "/tools" || url === "https://news.algoswamp.com/tools") {
    return { label: cta.label, kind: "tools" };
  }
  return { label: cta.label, kind: "external", href: url };
}

export function youtubeId(url: string): string | null {
  const trimmed = url.trim();
  if (!trimmed) return null;
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return null;
  }
  const host = parsed.hostname.replace(/^www\./, "");
  const idPattern = /^[\w-]{11}$/;
  if (host === "youtu.be") {
    const id = parsed.pathname.split("/").filter(Boolean)[0] ?? "";
    return idPattern.test(id) ? id : null;
  }
  if (host === "youtube.com" || host === "m.youtube.com" || host === "youtube-nocookie.com") {
    if (parsed.pathname === "/watch") {
      const id = parsed.searchParams.get("v") ?? "";
      return idPattern.test(id) ? id : null;
    }
    const match = parsed.pathname.match(/^\/(?:embed|shorts)\/([\w-]{11})/);
    return match?.[1] ?? null;
  }
  return null;
}

export function lessonVideo(link: {
  url: string;
  title: string;
}): { embedUrl: string; title: string } | null {
  const id = youtubeId(link.url);
  if (!id) return null;
  return {
    embedUrl: `https://www.youtube-nocookie.com/embed/${id}`,
    title: link.title.trim() || "Lesson video",
  };
}

export type CheckoutFulfillmentInput = {
  mode: string | null;
  paymentStatus: string | null;
  courseId: string | null;
};

/** Grant only a paid (or no-payment-required) one-time Checkout for a known course. */
export function courseFulfillmentDecision(input: CheckoutFulfillmentInput): "grant" | "skip" {
  if (input.mode !== "payment") return "skip";
  if (!courseOffer(input.courseId)) return "skip";
  if (input.paymentStatus == null || input.paymentStatus === "unpaid") return "skip";
  return "grant";
}

export function courseCheckoutOwner(input: {
  clientReferenceId: string | null;
  metadataUserId: string | null;
}): string | null {
  const ref = input.clientReferenceId?.trim() || null;
  const meta = input.metadataUserId?.trim() || null;
  if (ref && meta && ref !== meta) return null;
  return ref ?? meta;
}

export type CourseLineItem =
  | { price: string; quantity: 1 }
  | {
      quantity: 1;
      price_data: {
        currency: "usd";
        unit_amount: number;
        product_data: { name: string; description: string };
      };
    };

export function courseCheckoutParams(input: {
  userId: string;
  origin: string;
  priceId: string | null;
  customerId: string | null;
  integrationId: string;
  courseId?: string;
}): {
  mode: "payment";
  line_items: CourseLineItem[];
  success_url: string;
  cancel_url: string;
  client_reference_id: string;
  customer?: string;
  customer_creation?: "always";
  metadata: { user_id: string; course_id: string };
  integration_identifier: string;
  payment_intent_data: { metadata: { user_id: string; course_id: string } };
} {
  const offer = courseOffer(input.courseId ?? COURSE_ID);
  if (!offer) throw new Error("That course is not available.");
  const lineItem: CourseLineItem = input.priceId
    ? { price: input.priceId, quantity: 1 }
    : {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: offer.priceCents,
          product_data: {
            name: offer.productName,
            description: offer.productDescription,
          },
        },
      };
  return {
    mode: "payment",
    line_items: [lineItem],
    success_url: `${input.origin}${offer.homePath}?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${input.origin}${offer.homePath}`,
    client_reference_id: input.userId,
    ...(input.customerId
      ? { customer: input.customerId }
      : { customer_creation: "always" as const }),
    metadata: { user_id: input.userId, course_id: offer.id },
    integration_identifier: input.integrationId,
    payment_intent_data: {
      metadata: { user_id: input.userId, course_id: offer.id },
    },
  };
}

export function certificateName(raw: string | null | undefined): string {
  const name = (raw ?? "").replace(/\s+/g, " ").trim();
  if (!name) return "Student";
  return name.slice(0, 80);
}

export function formatCertificateDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "America/New_York",
  }).format(date);
}

export function continueTarget(
  modules: { id: string; completed: boolean; locked: boolean }[],
  examPassedFlag: boolean,
):
  | { kind: "module"; id: string; label: "start" | "continue" }
  | { kind: "exam" }
  | { kind: "certificate" }
  | { kind: "locked" } {
  const open = modules.filter((module) => !module.locked);
  const next = open.find((module) => !module.completed);
  if (next) {
    const started = modules.some((module) => module.completed);
    return {
      kind: "module",
      id: next.id,
      label: started ? "continue" : "start",
    };
  }
  if (modules.some((module) => module.locked)) return { kind: "locked" };
  if (!examPassedFlag) return { kind: "exam" };
  return { kind: "certificate" };
}
