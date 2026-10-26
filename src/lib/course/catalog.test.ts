import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { COURSE_URL, MODULE_SEO, moduleRobots } from "./catalog.ts";
import { SITE_ORIGIN } from "../site.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "../../..");

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return path.endsWith(".ts") || path.endsWith(".tsx") ? [path] : [];
  });
}

describe("options 101 SEO catalog", () => {
  it("matches the course module ids and stays within title and description limits", () => {
    const file = JSON.parse(
      readFileSync(join(root, "src/content/options-101.json"), "utf8"),
    ) as {
      course: { modules: { id: string }[] };
    };
    assert.deepEqual(
      MODULE_SEO.map((module) => module.id),
      file.course.modules.map((module) => module.id),
    );
    assert.equal(COURSE_URL, `${SITE_ORIGIN}/learn`);
    for (const module of MODULE_SEO) {
      assert.ok(
        module.title.length <= 60,
        `${module.id} title is ${module.title.length}`,
      );
      assert.ok(
        module.description.length <= 155,
        `${module.id} description is ${module.description.length}`,
      );
      assert.ok(module.h1.length > 0);
    }
    assert.equal(
      MODULE_SEO[1]?.description,
      "Calls and puts explained: what each gives the buyer, which way the stock must move, and how to find break-even at expiration. Free Options 101 lesson.",
    );
    assert.equal(moduleRobots(0), undefined);
    assert.equal(moduleRobots(1), undefined);
    assert.equal(moduleRobots(2), "noindex,follow");
    assert.equal(moduleRobots(7), "noindex,follow");
  });

  it("keeps the answer key out of SEO and client modules", () => {
    const allowed = new Set([join(root, "src/lib/course/content.server.ts")]);
    const offenders: string[] = [];
    for (const path of sourceFiles(join(root, "src"))) {
      if (path.endsWith(".test.ts")) continue;
      const source = readFileSync(path, "utf8");
      if (source.includes("options-101.json") && !allowed.has(path))
        offenders.push(path);
    }
    assert.deepEqual(offenders, []);
  });
});
