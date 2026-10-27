import type { PlanId } from "@/lib/plans";
import { SITE_ORIGIN } from "./site.ts";
import { COURSE_URL, MODULE_SEO, type ModuleSeo } from "@/lib/course/catalog";
import {
  COURSE_201_URL,
  FREE_201_MODULE_COUNT,
  MODULE_SEO_201,
  OPTIONS_201_INCLUDED_WITH_DESK,
  OPTIONS_201_PATH,
  OPTIONS_201_PRICE_USD,
} from "@/lib/course/catalog-options-201";

export { SITE_ORIGIN } from "./site.ts";

type HeadMeta =
  { title: string } | { name: string; content: string } | { property: string; content: string };

export const OG_IMAGE = `${SITE_ORIGIN}/og.jpg`;
export const OG_LEARN_IMAGE = `${SITE_ORIGIN}/og-learn.jpg`;
export const OG_LEARN_201_IMAGE = `${SITE_ORIGIN}/og-learn-201.jpg`;
export const OG_CLASSES_IMAGE = `${SITE_ORIGIN}/og-classes.jpg`;

export type PageSeo = {
  title: string;
  description: string;
  /** Path plus optional query, beginning with `/`. */
  pathname: string;
  robots?: string;
  jsonLd?: unknown;
  ogType?: string;
  ogImage?: string;
};

export function pageUrl(pathname: string): string {
  return `${SITE_ORIGIN}${pathname}`;
}

/** Route `head()` payload. TanStack Start renders this into the SSR document. */
export function routeHead(page: PageSeo): {
  meta: HeadMeta[];
  links: Array<{ rel: string; href: string }>;
  scripts?: Array<{ type: string; children: string }>;
} {
  const url = pageUrl(page.pathname);
  const image = page.ogImage ?? OG_IMAGE;
  const meta: HeadMeta[] = [
    { title: page.title },
    { name: "description", content: page.description },
    { property: "og:title", content: page.title },
    { property: "og:description", content: page.description },
    { property: "og:url", content: url },
    { property: "og:type", content: page.ogType ?? "website" },
    { property: "og:site_name", content: "ALGO Swamp" },
    { property: "og:locale", content: "en_US" },
    { property: "og:image", content: image },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: page.title },
    { name: "twitter:description", content: page.description },
    { name: "twitter:image", content: image },
  ];
  if (page.robots) meta.push({ name: "robots", content: page.robots });
  return {
    meta,
    links: [{ rel: "canonical", href: url }],
    scripts:
      page.jsonLd === undefined
        ? undefined
        : [
            {
              type: "application/ld+json",
              children: JSON.stringify(page.jsonLd).replaceAll("<", "\\u003c"),
            },
          ],
  };
}

export const HOME_PAGE: PageSeo = {
  title: "ALGO Swamp News Desk — Free Tape + Desk from $29/mo",
  description:
    "Pre-market headline desk: heat scores, named tickers, six free lines. Full desk free 7 days, then $29/mo (or $249/yr). A sort, not a signal.",
  pathname: "/",
  jsonLd: {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "SoftwareApplication",
        "@id": "https://news.algoswamp.com/#desk",
        name: "ALGO Swamp News Desk",
        applicationCategory: "FinanceApplication",
        operatingSystem: "Web",
        url: "https://news.algoswamp.com/",
        description:
          "Scores public headlines for freshness, sharp language, and named tickers. Open tape free; full desk from $29/mo.",
        offers: [
          {
            "@type": "Offer",
            name: "Open tape",
            price: "0",
            priceCurrency: "USD",
            description: "Six headlines with heat, tone, and tickers",
          },
          {
            "@type": "Offer",
            name: "Monthly desk",
            price: "29.00",
            priceCurrency: "USD",
            url: "https://news.algoswamp.com/join?plan=monthly",
            description: "7 days free, then $29 per month",
          },
          {
            "@type": "Offer",
            name: "Annual desk",
            price: "249.00",
            priceCurrency: "USD",
            url: "https://news.algoswamp.com/join?plan=annual",
            description: "$249 per year — $99 less than twelve monthly payments",
          },
        ],
      },
      {
        "@type": "FAQPage",
        "@id": "https://news.algoswamp.com/#faq",
        mainEntity: [
          {
            "@type": "Question",
            name: "Is this trading advice?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "No. Heat is a way to sort public headlines. It is not a recommendation, a price target, or a signal to trade.",
            },
          },
          {
            "@type": "Question",
            name: "What stays free?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "The open tape: six headlines with heat, tone, and tickers. Search and lanes work inside that cut.",
            },
          },
          {
            "@type": "Question",
            name: "What happens if I cancel?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "During the 7-day monthly trial, cancel in Stripe and the desk stays open until the trial ends. You are not charged. After a paid period starts, the desk stays open until that period ends.",
            },
          },
        ],
      },
    ],
  },
};

export const DESK_PAGE: PageSeo = {
  title: "Live Headline Desk — Heat, Tickers & Lanes — ALGO Swamp",
  description:
    "Live wires scored for heat, tone, and named tickers across markets, macro, tech, crypto, energy, and earnings. Free open tape; full desk $29/mo.",
  pathname: "/desk",
};

/** Visible FAQ on /learn. The FAQPage node is built from this same list. */
export const COURSE_FAQ: { question: string; answer: string }[] = [
  {
    question: "Is Options 101 free?",
    answer:
      "Modules 1 and 2 (What Is an Option? and Calls and Puts Explained) are free. The full course, with all eight modules, the quizzes, the final exam and the certificate, is $39 once, or included with an active ALGO Swamp desk plan, including the 7-day trial.",
  },
  {
    question: "Who is Options 101 for?",
    answer:
      "Beginners. You don't need any options experience. Each module builds on the one before it, starting with what an option is and how options work.",
  },
  {
    question: "What is the difference between a call and a put?",
    answer:
      "A call gives the buyer the right to buy 100 shares at the strike price. A put gives the buyer the right to sell 100 shares at the strike price. Call buyers generally benefit when the stock goes up; put buyers generally benefit when it goes down.",
  },
  {
    question: "How does the final exam work?",
    answer:
      "The final exam has 15 questions. Score 80% (12 of 15) to pass and print a certificate of completion with your name and the date.",
  },
  {
    question: "Do I need thinkorswim?",
    answer:
      "No. Each module includes a thinkorswim tip, and Module 7 walks through the thinkorswim option chain. Practice in paperMoney before you trade real money.",
  },
  {
    question: "Is Options 101 financial advice?",
    answer:
      "No. Options 101 is educational content, not a recommendation to buy or sell any security or to use any strategy. Options trading carries substantial risk and is not suitable for everyone.",
  },
  {
    question: "What comes after Options 101?",
    answer:
      "Options 201: Vertical Spreads. It shows you how to combine a long and a short option into bull call, bear put, bull put, and bear call spreads, with defined max loss and break-even.",
  },
];

function learnJsonLd() {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${SITE_ORIGIN}/#org`,
        name: "ALGO Swamp",
        url: `${SITE_ORIGIN}/`,
        logo: `${SITE_ORIGIN}/favicon.svg`,
      },
      {
        "@type": "Course",
        "@id": `${COURSE_URL}#course`,
        name: "Options 101: Options Trading for Beginners",
        alternateName: "Options 101",
        description:
          "Beginner options trading course: how options work, calls and puts, strike, expiration and premium, intrinsic and extrinsic value, buying vs. selling risk, the Greeks, reading a thinkorswim option chain, and position sizing. Eight modules with quizzes and a 15-question final exam. Modules 1–2 are free. Educational content, not financial advice.",
        url: COURSE_URL,
        courseCode: "OPTIONS-101",
        inLanguage: "en",
        educationalLevel: "Beginner",
        teaches: [
          "What an option is",
          "Calls and puts",
          "Strike price, expiration and premium",
          "Intrinsic and extrinsic value",
          "Risk of buying vs. selling options",
          "Option Greeks: delta, theta, vega, gamma",
          "Reading an option chain in thinkorswim",
          "Options position sizing",
        ],
        provider: { "@id": `${SITE_ORIGIN}/#org` },
        publisher: { "@id": `${SITE_ORIGIN}/#org` },
        isAccessibleForFree: false,
        image: OG_LEARN_IMAGE,
        hasCourseInstance: {
          "@type": "CourseInstance",
          courseMode: "Online",
          courseWorkload: "PT2H",
          inLanguage: "en",
        },
        offers: [
          {
            "@type": "Offer",
            category: "Paid",
            name: "Options 101 (one-time)",
            price: "39.00",
            priceCurrency: "USD",
            availability: "https://schema.org/InStock",
            url: COURSE_URL,
          },
          {
            "@type": "Offer",
            category: "Subscription",
            name: "Included with the ALGO Swamp desk",
            price: "29.00",
            priceCurrency: "USD",
            description:
              "Options 101 is included with an active desk plan, including the 7-day free trial.",
            url: `${SITE_ORIGIN}/join?plan=monthly`,
          },
        ],
        hasPart: MODULE_SEO.map((seo, index) => ({
          "@type": "LearningResource",
          position: index + 1,
          name: seo.h1,
          url: `${COURSE_URL}/${seo.id}`,
          isAccessibleForFree: index <= 1,
        })),
      },
      {
        "@type": "BreadcrumbList",
        "@id": `${COURSE_URL}#breadcrumb`,
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "ALGO Swamp",
            item: `${SITE_ORIGIN}/`,
          },
          {
            "@type": "ListItem",
            position: 2,
            name: "Classes",
            item: `${SITE_ORIGIN}/learn`,
          },
          {
            "@type": "ListItem",
            position: 3,
            name: "Options 101",
            item: COURSE_URL,
          },
        ],
      },
      {
        "@type": "FAQPage",
        "@id": `${COURSE_URL}#faq`,
        mainEntity: COURSE_FAQ.map((item) => ({
          "@type": "Question",
          name: item.question,
          acceptedAnswer: { "@type": "Answer", text: item.answer },
        })),
      },
    ],
  };
}

export const LEARN_PAGE: PageSeo = {
  title: "Options 101: Options Trading for Beginners — ALGO Swamp",
  description:
    "Learn how options work: calls and puts, strikes, the Greeks, and risk in 8 short lessons with quizzes. 2 modules free. $39 or included with the desk.",
  pathname: "/learn/options-101",
  ogImage: OG_LEARN_IMAGE,
  get jsonLd() {
    return learnJsonLd();
  },
};

export const LEARN_EXAM_PAGE: PageSeo = {
  title: "Options 101 Final Exam — ALGO Swamp",
  description:
    "The 15-question final exam for the Options 101 beginner course. Score 12 of 15 to pass and print your certificate. Not financial advice.",
  pathname: "/learn/options-101/exam",
  robots: "noindex,follow",
};

export const LEARN_CERTIFICATE_PAGE: PageSeo = {
  title: "Options 101 Certificate of Completion — ALGO Swamp",
  description:
    "Pass the Options 101 final exam to print a certificate of completion with your name and date. Educational only, not a trading credential.",
  pathname: "/learn/options-101/certificate",
  robots: "noindex,follow",
};

const OPTIONS_201_URL = COURSE_201_URL;

const OPTIONS_201_FREE_PHRASE =
  FREE_201_MODULE_COUNT <= 1 ? "Module 1 is free." : `Modules 1–${FREE_201_MODULE_COUNT} are free.`;

function options201PricePhrase(): string {
  if (OPTIONS_201_PRICE_USD == null) return "";
  const amount = `$${OPTIONS_201_PRICE_USD}`;
  return OPTIONS_201_INCLUDED_WITH_DESK
    ? `${amount} once, or included with an active ALGO Swamp desk plan, including the 7-day trial.`
    : `${amount} once.`;
}

/** Visible FAQ on /learn/options-201. The FAQPage node is built from this same list. */
export const COURSE_201_FAQ: { question: string; answer: string }[] = [
  {
    question: "Is Options 201 free?",
    answer: `Modules 1–3 (What Is a Vertical Spread?, Bull Call Spread and Bear Put Spread, and Credit Spreads: Bull Put and Bear Call) are free. The full course, with all eight modules, the quizzes, the final exam and the certificate, is ${options201PricePhrase() || "included with an active ALGO Swamp desk plan, including the 7-day trial."}`,
  },
  {
    question: "Do I need to take Options 101 first?",
    answer:
      "No. Options 101 is recommended, but you can start Options 201 without it. Options 201 assumes you already know calls and puts, strike, expiration and premium, intrinsic and extrinsic value, the basic Greeks, how to read a thinkorswim option chain, and how to size a trade from max loss. If any of that is new, start with Options 101. Modules 1 and 2 are free.",
  },
  {
    question: "What is a vertical spread?",
    answer:
      "A vertical spread is one long and one short option of the same type, on the same underlying, with the same expiration and different strikes. It defines your risk and caps your reward. At expiration it is worth between $0 and the width between the strikes, times 100.",
  },
  {
    question: "What is the difference between a debit spread and a credit spread?",
    answer:
      "You pay a net debit to open a debit spread, such as a bull call spread or a bear put spread. You collect a net credit to open a credit spread, such as a bull put spread or a bear call spread. A debit spread's max loss is the debit; a credit spread's max loss is the width minus the credit.",
  },
  {
    question: "How do you calculate the max loss and break-even of a vertical spread?",
    answer:
      "Debit spread: max loss = the debit, max profit = width minus the debit, and break-even = long strike plus the debit for a call spread or minus the debit for a put spread. Credit spread: max profit = the credit, max loss = width minus the credit, and break-even = short strike minus the credit for a bull put spread or plus the credit for a bear call spread. Multiply by 100 per contract, and remember commissions.",
  },
  {
    question: "Do I need thinkorswim or special broker approval?",
    answer:
      "You don't need thinkorswim to learn the material. Each module has a thinkorswim tip, and Module 8 walks through placing a vertical in thinkorswim. Practice in paperMoney first. To trade spreads, brokers typically require a specific options approval level, often higher than for buying calls and puts, and some require a margin account.",
  },
  {
    question: "How does the final exam work?",
    answer:
      "The final exam has 15 questions. Score 80% (12 of 15) to pass and print a certificate of completion with your name and the date.",
  },
  {
    question: "Is Options 201 financial advice?",
    answer:
      "No. Options 201 is educational content, not a recommendation to buy or sell any security or to use any strategy. All prices in the course are hypothetical. Options trading carries substantial risk and is not suitable for everyone.",
  },
];

export const OPTIONS_201_FAQ = COURSE_201_FAQ;

function options201Offers(): Array<Record<string, string>> {
  const offers: Array<Record<string, string>> = [];
  if (OPTIONS_201_PRICE_USD != null) {
    offers.push({
      "@type": "Offer",
      category: "Paid",
      name: "Options 201 (one-time)",
      price: OPTIONS_201_PRICE_USD.toFixed(2),
      priceCurrency: "USD",
      availability: "https://schema.org/InStock",
      url: OPTIONS_201_URL,
    });
  }
  if (OPTIONS_201_INCLUDED_WITH_DESK) {
    offers.push({
      "@type": "Offer",
      category: "Subscription",
      name: "Included with the ALGO Swamp desk",
      price: "29.00",
      priceCurrency: "USD",
      description:
        "Options 201 is included with an active desk plan, including the 7-day free trial.",
      url: `${SITE_ORIGIN}/join?plan=monthly`,
    });
  }
  return offers;
}

function options201JsonLd() {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${SITE_ORIGIN}/#org`,
        name: "ALGO Swamp",
        url: `${SITE_ORIGIN}/`,
        logo: `${SITE_ORIGIN}/favicon.svg`,
      },
      {
        "@type": "Course",
        "@id": `${OPTIONS_201_URL}#course`,
        name: "Options 201: Vertical Spreads",
        alternateName: "Options 201",
        description: `Intermediate options course on vertical spreads: the bull call spread, bear put spread, bull put spread and bear call spread, debit vs. credit spreads, choosing strikes, width and expiration, max profit, max loss and break-even math, the Greeks on spreads, managing, closing and rolling, and placing verticals in thinkorswim. Eight modules with quizzes and a 15-question final exam. ${OPTIONS_201_FREE_PHRASE} Educational content, not financial advice.`,
        url: OPTIONS_201_URL,
        courseCode: "OPTIONS-201",
        inLanguage: "en",
        educationalLevel: "Intermediate",
        coursePrerequisites: {
          "@type": "Course",
          "@id": `${COURSE_URL}#course`,
          name: "Options 101: Options Trading for Beginners",
          url: COURSE_URL,
        },
        teaches: [
          "What a vertical spread is",
          "Bull call spread and bear put spread (debit spreads)",
          "Bull put spread and bear call spread (credit spreads)",
          "Choosing strikes, width and expiration",
          "Max profit, max loss and break-even of a vertical spread",
          "Net Greeks of vertical spreads",
          "Managing, closing and rolling vertical spreads",
          "Placing a vertical spread in thinkorswim",
        ],
        provider: { "@id": `${SITE_ORIGIN}/#org` },
        publisher: { "@id": `${SITE_ORIGIN}/#org` },
        isAccessibleForFree: false,
        image: OG_LEARN_201_IMAGE,
        hasCourseInstance: {
          "@type": "CourseInstance",
          courseMode: "Online",
          courseWorkload: "PT2H30M",
          inLanguage: "en",
        },
        ...(options201Offers().length ? { offers: options201Offers() } : {}),
        hasPart: MODULE_SEO_201.map((seo, index) => ({
          "@type": "LearningResource",
          position: index + 1,
          name: seo.h1,
          url: `${OPTIONS_201_URL}/${seo.id}`,
          isAccessibleForFree: index < FREE_201_MODULE_COUNT,
        })),
      },
      {
        "@type": "BreadcrumbList",
        "@id": `${OPTIONS_201_URL}#breadcrumb`,
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "ALGO Swamp",
            item: `${SITE_ORIGIN}/`,
          },
          {
            "@type": "ListItem",
            position: 2,
            name: "Classes",
            item: `${SITE_ORIGIN}/learn`,
          },
          {
            "@type": "ListItem",
            position: 3,
            name: "Options 201",
            item: OPTIONS_201_URL,
          },
        ],
      },
      {
        "@type": "FAQPage",
        "@id": `${OPTIONS_201_URL}#faq`,
        mainEntity: COURSE_201_FAQ.map((item) => ({
          "@type": "Question",
          name: item.question,
          acceptedAnswer: { "@type": "Answer", text: item.answer },
        })),
      },
    ],
  };
}

export const LEARN_201_PAGE: PageSeo = {
  title: "Options 201: Vertical Spreads Explained — ALGO Swamp",
  description:
    "Learn vertical spreads: bull call, bear put, bull put and bear call spreads, max loss, break-even, Greeks, and thinkorswim. 8 lessons, Modules 1–3 free.",
  pathname: OPTIONS_201_PATH,
  ogImage: OG_LEARN_201_IMAGE,
  get jsonLd() {
    return options201JsonLd();
  },
};

export const OPTIONS_201_PAGE = LEARN_201_PAGE;

export const LEARN_201_EXAM_PAGE: PageSeo = {
  title: "Options 201 Final Exam: Vertical Spreads — ALGO Swamp",
  description:
    "The 15-question final exam for Options 201: Vertical Spreads. Score 12 of 15 to pass and print your certificate. Not financial advice.",
  pathname: "/learn/options-201/exam",
  robots: "noindex,follow",
  ogImage: OG_LEARN_201_IMAGE,
};

export const OPTIONS_201_EXAM_PAGE = LEARN_201_EXAM_PAGE;

export const LEARN_201_CERTIFICATE_PAGE: PageSeo = {
  title: "Options 201 Certificate of Completion — ALGO Swamp",
  description:
    "Pass the Options 201: Vertical Spreads final exam to print a certificate of completion with your name and date. Educational only, not a trading credential.",
  pathname: "/learn/options-201/certificate",
  robots: "noindex,follow",
  ogImage: OG_LEARN_201_IMAGE,
};

export const OPTIONS_201_CERTIFICATE_PAGE = LEARN_201_CERTIFICATE_PAGE;

function classesJsonLd() {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${SITE_ORIGIN}/#org`,
        name: "ALGO Swamp",
        url: `${SITE_ORIGIN}/`,
        logo: `${SITE_ORIGIN}/favicon.svg`,
      },
      {
        "@type": "ItemList",
        "@id": `${SITE_ORIGIN}/learn#classes`,
        name: "ALGO Swamp options trading classes",
        url: `${SITE_ORIGIN}/learn`,
        itemListOrder: "https://schema.org/ItemListOrderAscending",
        numberOfItems: 2,
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            url: COURSE_URL,
            item: {
              "@type": "Course",
              "@id": `${COURSE_URL}#course`,
              name: "Options 101: Options Trading for Beginners",
              description:
                "Beginner options trading course: calls and puts, strike, expiration and premium, intrinsic and extrinsic value, the Greeks, reading a thinkorswim option chain, and position sizing.",
              url: COURSE_URL,
              educationalLevel: "Beginner",
              provider: { "@id": `${SITE_ORIGIN}/#org` },
            },
          },
          {
            "@type": "ListItem",
            position: 2,
            url: OPTIONS_201_URL,
            item: {
              "@type": "Course",
              "@id": `${OPTIONS_201_URL}#course`,
              name: "Options 201: Vertical Spreads",
              description:
                "Intermediate options course on vertical spreads: bull call, bear put, bull put and bear call spreads, max profit, max loss and break-even, Greeks, managing spreads, and thinkorswim.",
              url: OPTIONS_201_URL,
              educationalLevel: "Intermediate",
              provider: { "@id": `${SITE_ORIGIN}/#org` },
            },
          },
        ],
      },
      {
        "@type": "BreadcrumbList",
        "@id": `${SITE_ORIGIN}/learn#breadcrumb`,
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "ALGO Swamp",
            item: `${SITE_ORIGIN}/`,
          },
          {
            "@type": "ListItem",
            position: 2,
            name: "Classes",
            item: `${SITE_ORIGIN}/learn`,
          },
        ],
      },
    ],
  };
}

export const CLASSES_PAGE: PageSeo = {
  title: "Options Trading Classes: Options 101 & 201 — ALGO Swamp",
  description:
    "Options trading classes in plain English: Options 101 for beginners, then Options 201: Vertical Spreads. Free preview lessons, quizzes, and final exams.",
  pathname: "/learn",
  ogImage: OG_CLASSES_IMAGE,
  get jsonLd() {
    return classesJsonLd();
  },
};

const OPTIONS_201_TEACHES = [
  "Vertical spreads: debit vs. credit spreads",
  "Bull call spread and bear put spread",
  "Bull put spread and bear call spread (credit spreads)",
];

/** Free Options 201 modules get a lesson node. Later modules are noindex, so they only get a breadcrumb. */
export function module201JsonLd(index: number, seo: ModuleSeo) {
  const url = `${OPTIONS_201_URL}/${seo.id}`;
  const breadcrumb = {
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "ALGO Swamp",
        item: `${SITE_ORIGIN}/`,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Classes",
        item: `${SITE_ORIGIN}/learn`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: "Options 201",
        item: OPTIONS_201_URL,
      },
      {
        "@type": "ListItem",
        position: 4,
        name: `Module ${index + 1}: ${seo.h1}`,
        item: url,
      },
    ],
  };
  if (index >= FREE_201_MODULE_COUNT) {
    return { "@context": "https://schema.org", "@graph": [breadcrumb] };
  }
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "LearningResource",
        "@id": `${url}#lesson`,
        name: seo.h1,
        description: seo.description,
        url,
        learningResourceType: "Lesson",
        educationalLevel: "Intermediate",
        ...(OPTIONS_201_TEACHES[index] ? { teaches: OPTIONS_201_TEACHES[index] } : {}),
        inLanguage: "en",
        position: index + 1,
        isAccessibleForFree: true,
        isPartOf: { "@id": `${OPTIONS_201_URL}#course` },
        provider: {
          "@type": "Organization",
          name: "ALGO Swamp",
          url: `${SITE_ORIGIN}/`,
        },
      },
      breadcrumb,
    ],
  };
}

export const options201ModuleJsonLd = module201JsonLd;

export const LOGIN_PAGE: PageSeo = {
  title: "Sign in — ALGO Swamp News",
  description: "Sign in to ALGO Swamp to open the desk, your classes, and your saved progress.",
  pathname: "/login",
  robots: "noindex,follow",
};

export const ACCOUNT_PAGE: PageSeo = {
  title: "Your account — ALGO Swamp News",
  description: "Your ALGO Swamp account: desk plan, billing, and class progress.",
  pathname: "/account",
  robots: "noindex,follow",
};

/** Modules 1 and 2 get a lesson node. Later modules are noindex, so they only get a breadcrumb. */
export function moduleJsonLd(index: number, seo: ModuleSeo) {
  const url = `${COURSE_URL}/${seo.id}`;
  const breadcrumb = {
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "ALGO Swamp",
        item: `${SITE_ORIGIN}/`,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Classes",
        item: `${SITE_ORIGIN}/learn`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: "Options 101",
        item: COURSE_URL,
      },
      {
        "@type": "ListItem",
        position: 4,
        name: `Module ${index + 1}: ${seo.h1}`,
        item: url,
      },
    ],
  };
  if (index > 1) {
    return { "@context": "https://schema.org", "@graph": [breadcrumb] };
  }
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "LearningResource",
        "@id": `${url}#lesson`,
        name: seo.h1,
        description: seo.description,
        url,
        learningResourceType: "Lesson",
        educationalLevel: "Beginner",
        inLanguage: "en",
        position: index + 1,
        isAccessibleForFree: true,
        isPartOf: { "@id": `${COURSE_URL}#course` },
        provider: {
          "@type": "Organization",
          name: "ALGO Swamp",
          url: `${SITE_ORIGIN}/`,
        },
      },
      breadcrumb,
    ],
  };
}

export const TOOLS_PAGE: PageSeo = {
  title: "Road Map thinkorswim Study — Tools — ALGO Swamp News",
  description:
    "Road Map paints inside bars yellow and outside bars orange in thinkorswim. Free by email, or Pro $39 once — colors, alerts, scan. Not trading advice.",
  pathname: "/tools",
  jsonLd: {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Road Map Pro",
    applicationCategory: "FinanceApplication",
    operatingSystem: "thinkorswim",
    url: "https://news.algoswamp.com/tools",
    description:
      "thinkorswim study: inside bars yellow, outside bars orange, plus Pro custom colors, alerts, scan, and watchlist column.",
    offers: {
      "@type": "Offer",
      price: "39.00",
      priceCurrency: "USD",
      availability: "https://schema.org/InStock",
      url: "https://news.algoswamp.com/tools",
    },
  },
};

const JOIN_ROBOTS = "noindex,follow";

export function joinPage(plan: PlanId): PageSeo {
  if (plan === "monthly") {
    return {
      title: "Start Monthly Desk — 7 Days Free — ALGO Swamp News",
      description:
        "Start the ALGO Swamp monthly desk: 7 days free, then $29/mo via Stripe. Full wire, lanes, watchlist, night note. Cancel anytime before you’re charged.",
      pathname: "/join?plan=monthly",
      robots: JOIN_ROBOTS,
    };
  }
  return {
    title: "Start Annual Desk — $249/yr — ALGO Swamp News Desk",
    description:
      "Lock in the ALGO Swamp annual desk for $249/yr — save $99 vs twelve months. Full wire, lanes, watchlist, night note. Billed once via Stripe.",
    pathname: "/join?plan=annual",
    robots: JOIN_ROBOTS,
  };
}
