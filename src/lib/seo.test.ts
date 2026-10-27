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
  LOGIN_PAGE,
  OG_IMAGE,
  OPTIONS_201_PAGE,
  TOOLS_PAGE,
  CLASSES_PAGE,
  joinPage,
  moduleJsonLd,
  options201ModuleJsonLd,
  pageUrl,
  routeHead,
} from "./seo.ts";
import { MODULE_SEO_201 } from "./course/catalog-201.ts";

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
    assert.match(sitemap, /<loc>https:\/\/news\.algoswamp\.com\/<\/loc>/);
    assert.match(sitemap, /<loc>https:\/\/news\.algoswamp\.com\/desk<\/loc>/);
    assert.match(sitemap, /<loc>https:\/\/news\.algoswamp\.com\/tools<\/loc>/);
    assert.match(sitemap, /<loc>https:\/\/news\.algoswamp\.com\/learn<\/loc>/);
    assert.match(
      sitemap,
      /<loc>https:\/\/news\.algoswamp\.com\/learn\/m1-what-is-an-option<\/loc>/,
    );
    assert.match(sitemap, /<loc>https:\/\/news\.algoswamp\.com\/learn\/m2-calls-and-puts<\/loc>/);
    assert.match(sitemap, /<loc>https:\/\/news\.algoswamp\.com\/learn\/options-101<\/loc>/);
    assert.match(sitemap, /<loc>https:\/\/news\.algoswamp\.com\/learn\/options-201<\/loc>/);
    assert.match(
      sitemap,
      /<loc>https:\/\/news\.algoswamp\.com\/learn\/options-201\/m1-what-is-a-vertical<\/loc>/,
    );
    assert.doesNotMatch(sitemap, /learn\/(m[3-8]-|exam|certificate)/);
    assert.doesNotMatch(sitemap, /options-201\/m[2-8]-/);
    assert.doesNotMatch(sitemap, /options-201\/exam/);
    assert.doesNotMatch(sitemap, /options-201\/certificate/);
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
    assert.equal(faq?.mainEntity?.length, 6);

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
        offers?: Array<{ price: string }>;
        hasPart?: Array<{ isAccessibleForFree?: boolean }>;
        url?: string;
      }>;
    };
    assert.deepEqual(
      options201["@graph"].map((node) => node["@type"]),
      ["Organization", "Course", "BreadcrumbList", "FAQPage"],
    );
    const course201 = options201["@graph"].find((node) => node["@type"] === "Course");
    assert.equal(course201?.offers?.[0]?.price, "39.00");
    assert.equal(course201?.url, pageUrl("/learn/options-201"));
    assert.equal(course201?.hasPart?.length, 8);
    assert.equal(course201?.hasPart?.[0]?.isAccessibleForFree, true);
    assert.equal(course201?.hasPart?.[1]?.isAccessibleForFree, false);
    assert.ok(OPTIONS_201_PAGE.title.length <= 60);
    assert.ok(OPTIONS_201_PAGE.description.length <= 155);
    assert.ok(CLASSES_PAGE.description.length <= 155);
    assert.equal(
      routeHead(CLASSES_PAGE).meta.some((item) => "name" in item && item.name === "robots"),
      false,
    );
    const first201 = MODULE_SEO_201[0];
    assert.ok(first201);
    const open201 = options201ModuleJsonLd(0, first201) as {
      "@graph": Array<{ "@type": string }>;
    };
    assert.deepEqual(
      open201["@graph"].map((node) => node["@type"]),
      ["LearningResource", "BreadcrumbList"],
    );
    const second201 = MODULE_SEO_201[1];
    assert.ok(second201);
    const locked201 = options201ModuleJsonLd(1, second201) as {
      "@graph": Array<{ "@type": string }>;
    };
    assert.deepEqual(
      locked201["@graph"].map((node) => node["@type"]),
      ["BreadcrumbList"],
    );
  });
});
