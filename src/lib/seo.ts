import type { PlanId } from "@/lib/plans";
import { SITE_ORIGIN } from "./site.ts";
import { MODULE_SEO, type ModuleSeo } from "@/lib/course/catalog";

export { SITE_ORIGIN } from "./site.ts";

type HeadMeta =
  | { title: string }
  | { name: string; content: string }
  | { property: string; content: string };

export const OG_IMAGE = `${SITE_ORIGIN}/og.jpg`;
export const OG_LEARN_IMAGE = `${SITE_ORIGIN}/og-learn.jpg`;

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
            description:
              "$249 per year — $99 less than twelve monthly payments",
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
        "@id": `${SITE_ORIGIN}/learn#course`,
        name: "Options 101: Options Trading for Beginners",
        alternateName: "Options 101",
        description:
          "Beginner options trading course: how options work, calls and puts, strike, expiration and premium, intrinsic and extrinsic value, buying vs. selling risk, the Greeks, reading a thinkorswim option chain, and position sizing. Eight modules with quizzes and a 15-question final exam. Modules 1–2 are free. Educational content, not financial advice.",
        url: `${SITE_ORIGIN}/learn`,
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
            url: `${SITE_ORIGIN}/learn`,
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
          url: `${SITE_ORIGIN}/learn/${seo.id}`,
          isAccessibleForFree: index <= 1,
        })),
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
            name: "Options 101",
            item: `${SITE_ORIGIN}/learn`,
          },
        ],
      },
      {
        "@type": "FAQPage",
        "@id": `${SITE_ORIGIN}/learn#faq`,
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
  pathname: "/learn",
  ogImage: OG_LEARN_IMAGE,
  get jsonLd() {
    return learnJsonLd();
  },
};

export const LEARN_EXAM_PAGE: PageSeo = {
  title: "Options 101 Final Exam — ALGO Swamp",
  description:
    "The 15-question final exam for the Options 101 beginner course. Score 12 of 15 to pass and print your certificate. Not financial advice.",
  pathname: "/learn/exam",
  robots: "noindex,follow",
};

export const LEARN_CERTIFICATE_PAGE: PageSeo = {
  title: "Options 101 Certificate of Completion — ALGO Swamp",
  description:
    "Pass the Options 101 final exam to print a certificate of completion with your name and date. Educational only, not a trading credential.",
  pathname: "/learn/certificate",
  robots: "noindex,follow",
};

export const LOGIN_PAGE: PageSeo = {
  title: "Sign in — ALGO Swamp News",
  description:
    "Sign in to ALGO Swamp to open the desk, Options 101, and your saved progress.",
  pathname: "/login",
  robots: "noindex,follow",
};

export const ACCOUNT_PAGE: PageSeo = {
  title: "Your account — ALGO Swamp News",
  description:
    "Your ALGO Swamp account: desk plan, billing, and Options 101 progress.",
  pathname: "/account",
  robots: "noindex,follow",
};

/** Modules 1 and 2 get a lesson node. Later modules are noindex, so they only get a breadcrumb. */
export function moduleJsonLd(index: number, seo: ModuleSeo) {
  const url = `${SITE_ORIGIN}/learn/${seo.id}`;
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
        name: "Options 101",
        item: `${SITE_ORIGIN}/learn`,
      },
      {
        "@type": "ListItem",
        position: 3,
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
        isPartOf: { "@id": `${SITE_ORIGIN}/learn#course` },
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
