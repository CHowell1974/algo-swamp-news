import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { courseOffer } from "../course/access.ts";
import {
  BUNDLE_LINE,
  MOTHER_BAR_BUNDLE,
  MOTHER_BAR_LEVELS_PAGE_COPY,
  MOTHER_BAR_SWEEP_SCAN_IMAGE,
  MOTHER_BAR_SWEEP_SCAN_PAGE_COPY,
  STUDY_DISCLAIMER,
  deliverableThinkscript,
  studyDownloadStatus,
  studyFileHeader,
} from "./catalog.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "../../..");

function walk(dir: string): string[] {
  const found: string[] = [];
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) found.push(...walk(path));
    else found.push(path);
  }
  return found;
}

describe("mother bar products", () => {
  it("keeps the $39 bundle unsold and the files off the public site", () => {
    assert.equal(MOTHER_BAR_BUNDLE.forSale, false);
    assert.equal(MOTHER_BAR_BUNDLE.priceUsd, 39);
    assert.equal(courseOffer(MOTHER_BAR_BUNDLE.id), null);
    assert.equal(MOTHER_BAR_SWEEP_SCAN_IMAGE, "/mother-bar-sweep-scan-results.webp");
    assert.equal(MOTHER_BAR_SWEEP_SCAN_PAGE_COPY.placeholder, null);
    assert.equal(MOTHER_BAR_SWEEP_SCAN_PAGE_COPY.images[0]?.width, 1920);
    assert.equal(MOTHER_BAR_SWEEP_SCAN_PAGE_COPY.images[0]?.height, 988);
    assert.match(MOTHER_BAR_SWEEP_SCAN_PAGE_COPY.images[0]?.caption ?? "", /Not a list of picks/);
    assert.match(BUNDLE_LINE, /\$39/);
    assert.match(BUNDLE_LINE, /coming soon/);

    const publicFiles = walk(join(root, "public"));
    const names = publicFiles.map((path) => path.slice(join(root, "public").length));
    for (const asset of [
      "/mother-bar-levels-daily.webp",
      "/mother-bar-levels-15m.webp",
      "/og-mother-bar-levels.jpg",
      "/mother-bar-sweep-scan-results.webp",
      "/og-mother-bar-sweep-scan.jpg",
    ]) {
      assert.ok(names.includes(asset), asset);
    }
    assert.equal(MOTHER_BAR_LEVELS_PAGE_COPY.images[0]?.width, 1920);
    assert.equal(MOTHER_BAR_LEVELS_PAGE_COPY.images[0]?.height, 988);
    assert.equal(MOTHER_BAR_LEVELS_PAGE_COPY.images[1]?.width, 1920);
    assert.equal(MOTHER_BAR_LEVELS_PAGE_COPY.images[1]?.height, 988);
    assert.equal(MOTHER_BAR_LEVELS_PAGE_COPY.ogPath, "/og-mother-bar-levels.jpg");
    assert.equal(
      names.some((name) => name.endsWith("spy_daily_mother_bar_levels.png")),
      false,
    );
    assert.equal(
      names.some((name) => /MotherBar/i.test(name) && name.endsWith(".ts")),
      false,
    );
    for (const path of publicFiles) {
      if (!path.endsWith(".ts") && !path.endsWith(".thinkscript")) continue;
      const text = readFileSync(path, "utf8");
      assert.equal(text.includes("plot scan"), false);
      assert.equal(text.includes("MotherHigh"), false);
    }

    const levels = readFileSync(
      join(root, "src/content/studies/MotherBarLevels.thinkscript"),
      "utf8",
    );
    const scan = readFileSync(
      join(root, "src/content/studies/MotherBarSweepScan.thinkscript"),
      "utf8",
    );
    assert.equal(
      createHash("sha256").update(levels).digest("hex"),
      "42972a37f9a4a2aa0db525cd06705cbababdd52427d412997cf4db666142fe49",
    );
    assert.equal(
      createHash("sha256").update(scan).digest("hex"),
      "e54bbc157fb877ec352ff0432b1cc0c25687c5bb9963399448d8c4b51cc4c59c",
    );
    assert.match(levels, /plot MotherHigh/);
    assert.match(scan, /plot scan = barsSince >= 1 and barsSince <= lookback/);
    assert.match(scan, /input bullish = yes/);
    assert.match(scan, /input lookback = 10/);
  });

  it("puts the disclaimer on the page and at the top of the delivered file", () => {
    assert.match(STUDY_DISCLAIMER, /Not financial advice/);
    assert.match(STUDY_DISCLAIMER, /not affiliated with or endorsed by Charles Schwab/i);
    const source = "# exact study body\n";
    const delivered = deliverableThinkscript(studyFileHeader("study"), source);
    assert.match(delivered, /^# Educational tool only\. Not financial advice\./);
    assert.match(delivered, /no performance or profit claims/);
    assert.match(delivered, /Past patterns do not predict future results/);
    assert.ok(delivered.endsWith(source));
    assert.equal(studyDownloadStatus({ signedIn: false, owned: true }), 401);
    assert.equal(studyDownloadStatus({ signedIn: true, owned: false }), 403);
    assert.equal(studyDownloadStatus({ signedIn: true, owned: true }), 200);
  });

  it("describes the scan from the script and does not promise results", () => {
    const scanText = [
      MOTHER_BAR_SWEEP_SCAN_PAGE_COPY.lede,
      MOTHER_BAR_SWEEP_SCAN_PAGE_COPY.hook,
      ...MOTHER_BAR_SWEEP_SCAN_PAGE_COPY.details,
      ...MOTHER_BAR_SWEEP_SCAN_PAGE_COPY.install,
    ].join("\n");
    assert.match(scanText, /inside bar/);
    assert.match(scanText, /Bullish/);
    assert.match(scanText, /mother low/);
    assert.match(scanText, /close is back above/);
    assert.match(scanText, /mother high/);
    assert.match(scanText, /close is back below/);
    assert.match(scanText, /Lookback/);
    assert.match(scanText, /10/);
    assert.match(scanText, /Load Scan Query/);
    assert.match(scanText, /plot scan/);
    assert.match(scanText, /does not send an alert/);

    const marketing = [MOTHER_BAR_LEVELS_PAGE_COPY, MOTHER_BAR_SWEEP_SCAN_PAGE_COPY]
      .flatMap((copy) => [
        copy.title,
        copy.description,
        copy.hook,
        copy.lede,
        ...copy.details,
        ...copy.faqs.map((item) => item.question + item.answer),
        BUNDLE_LINE,
      ])
      .join("\n");
    assert.doesNotMatch(marketing, /guaranteed|win rate|make money|you will profit|profits/i);
    assert.match(MOTHER_BAR_LEVELS_PAGE_COPY.details.join(" "), /close crosses/);
    assert.match(MOTHER_BAR_LEVELS_PAGE_COPY.install.join(" "), /Edit Studies/);
  });
});
