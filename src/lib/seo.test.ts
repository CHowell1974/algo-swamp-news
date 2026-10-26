import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { annualSavings, MONTHLY_TRIAL_DAYS, PLANS } from "./plans.ts";
import {
  DESK_PAGE,
  HOME_PAGE,
  OG_IMAGE,
  LEARN_PAGE,
  TOOLS_PAGE,
  joinPage,
  pageUrl,
  routeHead,
} from "./seo.ts";

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
      assert.equal(meta(page, "og:image", "property"), OG_IMAGE);
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
    assert.doesNotMatch(sitemap, /join/);

    const robots = readFileSync(join(root, "public/robots.txt"), "utf8");
    assert.match(robots, /Sitemap: https:\/\/news\.algoswamp\.com\/sitemap\.xml/);
    assert.match(robots, /Disallow: \/assets\//);
    assert.match(robots, /Disallow: \/__grok\//);
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
    const product = JSON.parse(toolsScript?.children ?? "{}") as { "@type": string; name: string };
    assert.equal(product["@type"], "SoftwareApplication");
    assert.equal(product.name, "Road Map Pro");
    assert.equal(routeHead(DESK_PAGE).scripts, undefined);
  });
});
