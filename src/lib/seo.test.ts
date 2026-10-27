import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { annualSavings, MONTHLY_TRIAL_DAYS, PLANS } from "./plans.ts";
import { MODULE_SEO } from "./course/catalog.ts";
import {
  ACCOUNT_PAGE,
  DESK_PAGE,
  HOME_PAGE,
  LEARN_CERTIFICATE_PAGE,
  LEARN_EXAM_PAGE,
  LEARN_PAGE,
  LEARN_201_CERTIFICATE_PAGE,
  LEARN_201_EXAM_PAGE,
  LOGIN_PAGE,
  OG_IMAGE,
  OG_LEARN_201_IMAGE,
  OPTIONS_201_PAGE,
  TOOLS_PAGE,
  CLASSES_PAGE,
  COURSE_201_FAQ,
  COURSE_FAQ,
  joinPage,
  moduleJsonLd,
  options201ModuleJsonLd,
  pageUrl,
  routeHead,
} from "./seo.ts";
import { FREE_201_MODULE_COUNT, MODULE_SEO_201 } from "./course/catalog-options-201.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

function meta(
  page: Parameters<typeof routeHead>[0],
  key: string,
  attr: "name" | "property" = "name",
) {
  const tag = routeHead(page).meta.find(
    (item) => attr in item && item[attr as keyof typeof item] === key,
  );
  assert.ok(tag && "content" in tag, `missing ${attr}=${key}`);
  return tag.content;
}

describe("news route head", () => {
  it("keeps draft prices aligned with the desk plans", () => {
    assert.equal(PLANS.monthly.price, 29);
    assert.equal(PLANS.annual.price, 249);
    assert.equal(annualSavings(), 99);
    assert.equal(MONTHLY_TRIAL_DAYS, 7);
    assert.match(HOME_PAGE.description, /\$29\/mo \(or \$249\/yr\)/);
    assert.match(joinPage("annual").description, /save \$99/);
  });

  it("gives each public route a unique title, canonical, and og:url", () => {
    const pages = [
      HOME_PAGE,
      DESK_PAGE,
      TOOLS_PAGE,
      LEARN_PAGE,
      CLASSES_PAGE,
      OPTIONS_201_PAGE,
      LEARN_EXAM_PAGE,
      LEARN_CERTIFICATE_PAGE,
      LEARN_201_EXAM_PAGE,
      LEARN_201_CERTIFICATE_PAGE,
      LOGIN_PAGE,
      ACCOUNT_PAGE,
      joinPage("monthly"),
      joinPage("annual"),
    ];
    const titles = new Set(pages.map((page) => page.title));
    assert.equal(titles.size, pages.length);
    for (const page of pages) {
      const head = routeHead(page);
      const title = head.meta.find((item) => "title" in item);
      assert.equal(title && "title" in title ? title.title : undefined, page.title);
      assert.equal(meta(page, "description"), page.description);
      assert.equal(meta(page, "og:url", "property"), pageUrl(page.pathname));
      assert.equal(meta(page, "og:title", "property"), page.title);
      assert.equal(meta(page, "og:image", "property"), page.ogImage ?? OG_IMAGE);
      assert.equal(meta(page, "og:type", "property"), page.ogType ?? "website");
      assert.equal(meta(page, "og:site_name", "property"), "ALGO Swamp");
      assert.equal(meta(page, "og:locale", "property"), "en_US");
      assert.deepEqual(head.links, [{ rel: "canonical", href: pageUrl(page.pathname) }]);
    }
  });

  it("noindexes join plans and leaves them out of the sitemap", () => {
    assert.equal(meta(joinPage("monthly"), "robots"), "noindex,follow");
    assert.equal(meta(joinPage("annual"), "robots"), "noindex,follow");
    assert.equal(
      routeHead(HOME_PAGE).meta.some((item) => "name" in item && item.name === "robots"),
      false,
    );

    const sitemap = readFileSync(join(root, "public/sitemap.xml"), "utf8");
    const loc = (path: string) =>
      new RegExp(
        `<loc>https://news\\.algoswamp\\.com${path.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&")}</loc>`,
      );
    for (const path of ["/", "/desk", "/tools"]) assert.match(sitemap, loc(path));
    for (const path of [
      "/learn",
      "/learn/options-101",
      "/learn/options-101/m1-what-is-an-option",
      "/learn/options-101/m2-calls-and-puts",
      "/learn/options-201",
      "/learn/options-201/m1-what-is-a-vertical",
      "/learn/options-201/m2-debit-verticals",
      "/learn/options-201/m3-credit-verticals",
    ]) {
      assert.match(sitemap, loc(path));
    }
    MODULE_SEO_201.forEach((module, index) => {
      const entry = loc(`/learn/options-201/${module.id}`);
      if (index < FREE_201_MODULE_COUNT) assert.match(sitemap, entry);
      else assert.doesNotMatch(sitemap, entry);
    });
    assert.doesNotMatch(sitemap, /learn\/options-101\/(m[3-8]-|exam|certificate)/);
    assert.doesNotMatch(sitemap, /learn\/options-201\/(m[4-8]-|exam|certificate)/);
    assert.doesNotMatch(sitemap, /learn\/(m\d-|exam<|certificate<)/);
    assert.doesNotMatch(sitemap, /join/);

    const robots = readFileSync(join(root, "public/robots.txt"), "utf8");
    assert.match(robots, /Sitemap: https:\/\/news\.algoswamp\.com\/sitemap\.xml/);
    assert.match(robots, /Disallow: \/assets\//);
    assert.match(robots, /Disallow: \/__grok\//);
    assert.doesNotMatch(robots, /Disallow:\s*\/learn/);
  });

  it("embeds SoftwareApplication and FAQ JSON-LD on the homepage and Road Map on tools", () => {
    const homeScript = routeHead(HOME_PAGE).scripts?.[0];
    assert.equal(homeScript?.type, "application/ld+json");
    const graph = JSON.parse(homeScript?.children ?? "{}") as {
      "@graph": Array<{ "@type": string }>;
    };
    assert.deepEqual(
      graph["@graph"].map((node) => node["@type"]),
      ["SoftwareApplication", "FAQPage"],
    );
    const toolsScript = routeHead(TOOLS_PAGE).scripts?.[0];
    const product = JSON.parse(toolsScript?.children ?? "{}") as {
      "@type": string;
      name: string;
    };
    assert.equal(product["@type"], "SoftwareApplication");
    assert.equal(product.name, "Road Map Pro");
    assert.equal(routeHead(DESK_PAGE).scripts, undefined);

    const learnScript = routeHead(LEARN_PAGE).scripts?.[0];
    const learn = JSON.parse(learnScript?.children ?? "{}") as {
      "@graph": Array<{
        "@type": string;
        offers?: Array<{ price: string }>;
        hasPart?: unknown[];
        mainEntity?: Array<{ name: string; acceptedAnswer: { text: string } }>;
      }>;
    };
    assert.deepEqual(
      learn["@graph"].map((node) => node["@type"]),
      ["Organization", "Course", "BreadcrumbList", "FAQPage"],
    );
    const course = learn["@graph"].find((node) => node["@type"] === "Course");
    assert.equal(course?.offers?.[0]?.price, "39.00");
    assert.equal(course?.hasPart?.length, 8);
    const parts = course?.hasPart as Array<{ isAccessibleForFree?: boolean }>;
    assert.equal(parts?.[0]?.isAccessibleForFree, true);
    assert.equal(parts?.[1]?.isAccessibleForFree, true);
    assert.equal(parts?.[2]?.isAccessibleForFree, false);
    const faq = learn["@graph"].find((node) => node["@type"] === "FAQPage");
    assert.equal(faq?.mainEntity?.length, 7);
    assert.equal(COURSE_FAQ.at(-1)?.question, "What comes after Options 101?");

    assert.equal(LEARN_PAGE.title.length, 55);
    assert.equal(
      LEARN_PAGE.description,
      "Learn how options work: calls and puts, strikes, the Greeks, and risk in 8 short lessons with quizzes. 2 modules free. $39 or included with the desk.",
    );
    assert.ok(LEARN_PAGE.description.length <= 155);
    assert.equal(
      routeHead(LEARN_PAGE).meta.some((item) => "name" in item && item.name === "robots"),
      false,
    );
    assert.equal(meta(LEARN_EXAM_PAGE, "robots"), "noindex,follow");
    assert.equal(meta(LEARN_CERTIFICATE_PAGE, "robots"), "noindex,follow");
    assert.equal(routeHead(LEARN_EXAM_PAGE).scripts, undefined);
    assert.equal(routeHead(LEARN_CERTIFICATE_PAGE).scripts, undefined);

    const first = MODULE_SEO[0];
    assert.ok(first);
    const openLesson = moduleJsonLd(0, first) as {
      "@graph": Array<{ "@type": string }>;
    };
    assert.deepEqual(
      openLesson["@graph"].map((node) => node["@type"]),
      ["LearningResource", "BreadcrumbList"],
    );
    const second = MODULE_SEO[1];
    assert.ok(second);
    const secondLesson = moduleJsonLd(1, second) as {
      "@graph": Array<{
        "@type": string;
        position?: number;
        isAccessibleForFree?: boolean;
      }>;
    };
    assert.deepEqual(
      secondLesson["@graph"].map((node) => node["@type"]),
      ["LearningResource", "BreadcrumbList"],
    );
    assert.equal(secondLesson["@graph"][0]?.position, 2);
    assert.equal(secondLesson["@graph"][0]?.isAccessibleForFree, true);
    const locked = MODULE_SEO[2];
    assert.ok(locked);
    const lockedLesson = moduleJsonLd(2, locked) as {
      "@graph": Array<{ "@type": string }>;
    };
    assert.deepEqual(
      lockedLesson["@graph"].map((node) => node["@type"]),
      ["BreadcrumbList"],
    );

    const options201Script = routeHead(OPTIONS_201_PAGE).scripts?.[0];
    const options201 = JSON.parse(options201Script?.children ?? "{}") as {
      "@graph": Array<{
        "@type": string;
        "@id"?: string;
        offers?: Array<{ price: string; category?: string }>;
        hasPart?: Array<{ isAccessibleForFree?: boolean }>;
        url?: string;
        coursePrerequisites?: { "@id"?: string };
        mainEntity?: unknown[];
      }>;
    };
    assert.deepEqual(
      options201["@graph"].map((node) => node["@type"]),
      ["Organization", "Course", "BreadcrumbList", "FAQPage"],
    );
    const course201 = options201["@graph"].find((node) => node["@type"] === "Course");
    assert.equal(course201?.offers?.[0]?.price, "39.00");
    assert.equal(course201?.offers?.[0]?.category, "Paid");
    assert.equal(course201?.offers?.[1]?.price, "29.00");
    assert.equal(course201?.offers?.[1]?.category, "Subscription");
    assert.equal(
      course201?.coursePrerequisites?.["@id"],
      pageUrl("/learn/options-101") + "#course",
    );
    assert.equal(course201?.url, pageUrl("/learn/options-201"));
    assert.equal(course201?.hasPart?.length, 8);
    assert.equal(course201?.hasPart?.[0]?.isAccessibleForFree, true);
    assert.equal(course201?.hasPart?.[1]?.isAccessibleForFree, true);
    assert.equal(course201?.hasPart?.[2]?.isAccessibleForFree, true);
    assert.equal(course201?.hasPart?.[3]?.isAccessibleForFree, false);
    const faq201 = options201["@graph"].find((node) => node["@type"] === "FAQPage");
    assert.equal(faq201?.mainEntity?.length, 8);
    assert.equal(COURSE_201_FAQ.length, 8);
    assert.match(COURSE_201_FAQ[0]?.answer ?? "", /\$39 once, or included with/);
    assert.match(COURSE_201_FAQ[1]?.answer ?? "", /^Options 101 is the prerequisite\./);
    assert.equal(OPTIONS_201_PAGE.title.length, 52);
    assert.equal(
      OPTIONS_201_PAGE.description,
      "Learn vertical spreads: bull call, bear put, bull put and bear call spreads, max loss, break-even, Greeks, and thinkorswim. 8 lessons, Modules 1–3 free.",
    );
    assert.equal(CLASSES_PAGE.title.length, 55);
    assert.equal(
      CLASSES_PAGE.description,
      "Options trading classes in plain English: Options 101 for beginners, then Options 201: Vertical Spreads. Free preview lessons, quizzes, and final exams.",
    );
    assert.equal(meta(OPTIONS_201_PAGE, "og:image", "property"), OG_LEARN_201_IMAGE);
    assert.equal(meta(LEARN_201_EXAM_PAGE, "robots"), "noindex,follow");
    assert.equal(meta(LEARN_201_CERTIFICATE_PAGE, "robots"), "noindex,follow");
    assert.equal(routeHead(LEARN_201_EXAM_PAGE).scripts, undefined);
    assert.equal(routeHead(LEARN_201_CERTIFICATE_PAGE).scripts, undefined);
    assert.equal(
      routeHead(CLASSES_PAGE).meta.some((item) => "name" in item && item.name === "robots"),
      false,
    );
    const classesScript = routeHead(CLASSES_PAGE).scripts?.[0];
    const classes = JSON.parse(classesScript?.children ?? "{}") as {
      "@graph": Array<{ "@type": string; numberOfItems?: number }>;
    };
    assert.deepEqual(
      classes["@graph"].map((node) => node["@type"]),
      ["Organization", "ItemList", "BreadcrumbList"],
    );
    assert.equal(classes["@graph"].find((node) => node["@type"] === "ItemList")?.numberOfItems, 2);
    const first201 = MODULE_SEO_201[0];
    assert.ok(first201);
    const open201 = options201ModuleJsonLd(0, first201) as {
      "@graph": Array<{ "@type": string; teaches?: string }>;
    };
    assert.deepEqual(
      open201["@graph"].map((node) => node["@type"]),
      ["LearningResource", "BreadcrumbList"],
    );
    assert.equal(open201["@graph"][0]?.teaches, "Vertical spreads: debit vs. credit spreads");
    const third201 = MODULE_SEO_201[2];
    assert.ok(third201);
    const openThird = options201ModuleJsonLd(2, third201) as {
      "@graph": Array<{ "@type": string }>;
    };
    assert.deepEqual(
      openThird["@graph"].map((node) => node["@type"]),
      ["LearningResource", "BreadcrumbList"],
    );
    const locked201Seo = MODULE_SEO_201[3];
    assert.ok(locked201Seo);
    const locked201 = options201ModuleJsonLd(3, locked201Seo) as {
      "@graph": Array<{ "@type": string }>;
    };
    assert.deepEqual(
      locked201["@graph"].map((node) => node["@type"]),
      ["BreadcrumbList"],
    );

    const rendered = [
      CLASSES_PAGE,
      LEARN_PAGE,
      OPTIONS_201_PAGE,
      LEARN_201_EXAM_PAGE,
      LEARN_201_CERTIFICATE_PAGE,
    ]
      .map((page) => JSON.stringify(routeHead(page)))
      .concat(
        MODULE_SEO.map((seo, index) => JSON.stringify(moduleJsonLd(index, seo))),
        MODULE_SEO_201.map((seo, index) => JSON.stringify(options201ModuleJsonLd(index, seo))),
        COURSE_FAQ.map((item) => item.question + item.answer),
        COURSE_201_FAQ.map((item) => item.question + item.answer),
      )
      .join("\n");
    assert.equal(rendered.includes("{{"), false);
    assert.equal(rendered.includes('"price":"0.00"'), false);
    assert.equal(LOGIN_PAGE.description.includes("your classes"), true);
    assert.equal(ACCOUNT_PAGE.description.includes("class progress"), true);
  });
});
