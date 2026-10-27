import type { CourseQuestion } from "./schema.ts";

export const COURSE_ID = "options-101";
export const OPTIONS_201_ID = "options-201";
export const OPTIONS_101_PRICE_CENTS = 3900;
export const OPTIONS_101_PRICE_USD = OPTIONS_101_PRICE_CENTS / 100;
export const OPTIONS_201_PRICE_CENTS = 3900;
export const OPTIONS_201_PRICE_USD = OPTIONS_201_PRICE_CENTS / 100;
/**
 * Chris, 2026-10-27. Modules 1–3 are the free Options 201 preview.
 * Change this together with the landing copy, robots, sitemap, and JSON-LD.
 */
export const OPTIONS_201_FREE_MODULE_COUNT = 3;
/** Active desk members get Options 201 the same way they get Options 101. */
export const OPTIONS_201_INCLUDED_WITH_DESK = true;
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
  /** Last free module index, inclusive. Options 101 is 1 (modules 1–2). Options 201 is 2 (modules 1–3). */
  freeThroughIndex: number;
  includedWithDesk: boolean;
  /** Null means the earlier course is recommended, not required. */
  prerequisiteCourseId: string | null;
  homePath: "/learn/options-101" | "/learn/options-201";
  productName: string;
  productDescription: string;
  integrationPrefix: "algo_swamp_course_" | "algo_swamp_c201_";
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
  },
};

export function courseOffer(id: string | null | undefined): CourseOffer | null {
  if (!id) return null;
  return COURSE_OFFERS[id] ?? null;
}

export function courseEntitled(input: { membershipActive: boolean; purchased: boolean }): boolean {
  return input.purchased || input.membershipActive;
}

/**
 * Free preview is per course. `freeThroughIndex` is inclusive.
 * Options 101 opens indexes 0 and 1. Options 201 opens indexes 0, 1, and 2.
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
