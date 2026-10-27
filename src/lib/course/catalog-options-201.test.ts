import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { canReadModule, courseOffer } from "./access.ts";
import {
  FREE_201_MODULE_COUNT,
  MODULE_SEO_201,
  OPTIONS_201_INCLUDED_WITH_DESK,
  OPTIONS_201_PRICE_USD,
  moduleRobots201,
} from "./catalog-options-201.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "../../..");

describe("options 201 SEO catalog", () => {
  it("matches the course module ids and indexes modules 1–2", () => {
    const file = JSON.parse(readFileSync(join(root, "src/content/options-201.json"), "utf8")) as {
      course: { intro: string; modules: { id: string }[] };
    };
    assert.deepEqual(
      MODULE_SEO_201.map((module) => module.id),
      file.course.modules.map((module) => module.id),
    );
    assert.equal(OPTIONS_201_PRICE_USD, 39);
    assert.equal(OPTIONS_201_INCLUDED_WITH_DESK, false);
    assert.equal(FREE_201_MODULE_COUNT, 2);
    assert.doesNotMatch(file.course.intro, /Modules 1–3|included with/i);
    assert.equal(courseOffer("options-201")?.prerequisiteCourseId, null);
    assert.doesNotMatch(file.course.intro, /prerequisite|required/i);
    for (const module of MODULE_SEO_201) {
      assert.ok(module.h1.length > 0, `${module.id} is missing an H1`);
      assert.ok(module.title.length <= 60, `${module.id} title is ${module.title.length}`);
      assert.ok(
        module.description.length <= 155,
        `${module.id} description is ${module.description.length}`,
      );
    }
    const freeThrough = FREE_201_MODULE_COUNT - 1;
    for (let index = 0; index < MODULE_SEO_201.length; index += 1) {
      const free = index < FREE_201_MODULE_COUNT;
      assert.equal(moduleRobots201(index), free ? undefined : "noindex,follow");
      assert.equal(canReadModule(index, false, freeThrough), free);
    }
  });

  it("keeps prerequisite and required out of Options 201 user-facing copy", () => {
    const banned = /prerequisite|required/i;
    const copies = [
      readFileSync(join(root, "src/content/options-201.json"), "utf8"),
      readFileSync(join(root, "src/routes/learn/index.tsx"), "utf8"),
      ...readdirSync(join(root, "src/routes/learn/options-201")).map((name) =>
        readFileSync(join(root, "src/routes/learn/options-201", name), "utf8"),
      ),
    ];
    for (const copy of copies) {
      assert.doesNotMatch(copy, banned);
    }
  });
});
