import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import {
  appNameFromHost,
  createHeadInjector,
  grokXCreatorHeadTags,
  injectGrokPwaHead,
  isDocumentPath,
  isInstallQuery,
  publicAppHost,
  renderWebManifest,
  resolveOgCardAsset,
  snapshotOgIdentity,
  stripInstallParams,
} from "./grok-pwa-shared.mjs";
import { renderInstallPage } from "./grok-pwa-plugin.mjs";

const TEMPLATE_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

/** Tests that omit `site` must not inherit this desk's site.json or public/og.jpg. */
function blankWorkspace() {
  return mkdtempSync(join(tmpdir(), "grok-og-blank-"));
}

test("injects before </head>", () => {
  const out = injectGrokPwaHead("<html><head><title>x</title></head><body></body></html>");
  assert.match(out, /rel="manifest"/);
  assert.match(out, /apple-touch-icon/);
  assert.match(out, /grok-app-builder\/extensions\.js/);
  assert.ok(out.indexOf("manifest") < out.indexOf("</head>"));
});

test("injects the extensions script without a project id", () => {
  const out = injectGrokPwaHead("<html><head></head></html>", {
    appName: "Demo",
    projectId: "",
  });
  assert.match(out, /src="https:\/\/grok\.com\/grok-app-builder\/extensions\.js" defer/);
  assert.doesNotMatch(out, /grok-project-id/);
  assert.doesNotMatch(out, /data-project-id/);
  assert.doesNotMatch(out, /property="grok:app_id"/);
});

test("injects project id on the script and meta when provided", () => {
  const out = injectGrokPwaHead("<html><head></head></html>", {
    appName: "Demo",
    projectId: "proj-123",
  });
  assert.match(out, /name="grok-project-id" content="proj-123"/);
  assert.match(out, /data-project-id="proj-123"/);
  assert.match(out, /property="grok:app_id" content="proj-123"/);
});

test("does not duplicate grok:app_id", () => {
  const ctx = { appName: "Demo", projectId: "proj-123" };
  const once = injectGrokPwaHead("<html><head></head></html>", ctx);
  const twice = injectGrokPwaHead(once, ctx);
  assert.equal(once, twice);
  assert.equal(twice.split('property="grok:app_id"').length - 1, 1);
});

test("omits x:creator tags without both creator values", () => {
  assert.deepEqual(grokXCreatorHeadTags("", "42"), []);
  assert.deepEqual(grokXCreatorHeadTags("@alice", ""), []);
  const out = injectGrokPwaHead("<html><head></head></html>", {
    appName: "Demo",
    projectId: "",
    creator: "@alice",
    creatorId: "",
  });
  assert.doesNotMatch(out, /property="x:creator"/);
});

test("injects x:creator tags when both creator values are set", () => {
  const out = injectGrokPwaHead("<html><head></head></html>", {
    appName: "Demo",
    projectId: "",
    creator: "@alice",
    creatorId: "42",
  });
  assert.match(out, /property="x:creator" content="@alice"/);
  assert.match(out, /property="x:creator:id" content="42"/);
});

test("escapes x:creator values", () => {
  const tags = grokXCreatorHeadTags('"><script>', '1" onclick="alert(1)');
  assert.equal(tags[0], '<meta property="x:creator" content="&quot;&gt;&lt;script&gt;">');
  assert.equal(tags[1], '<meta property="x:creator:id" content="1&quot; onclick=&quot;alert(1)">');
});

test("does not duplicate x:creator tags", () => {
  const ctx = { appName: "Demo", projectId: "", creator: "@alice", creatorId: "42" };
  const once = injectGrokPwaHead("<html><head></head></html>", ctx);
  const twice = injectGrokPwaHead(once, ctx);
  assert.equal(once, twice);
  assert.equal(twice.split('property="x:creator" content=').length - 1, 1);
  assert.equal(twice.split('property="x:creator:id"').length - 1, 1);
});

test("platform chrome overwrites share-card metas and always sets og:title", () => {
  const html =
    '<html><head><title>Hello World</title><meta property="og:title" content="Old"><meta name="twitter:card" content="summary"></head></html>';
  const out = injectGrokPwaHead(html, { appName: "Wild Race", cwd: blankWorkspace() });
  assert.match(out, /name="twitter:card" content="summary_large_image"/);
  assert.match(out, /property="og:title" content="Hello World"/);
  assert.doesNotMatch(out, /content="Old"/);
  assert.doesNotMatch(out, /content="summary"/);
  assert.equal(out.split('name="twitter:card"').length - 1, 1);
  assert.equal(out.split('property="og:title"').length - 1, 1);
  assert.doesNotMatch(out, /property="og:image"/);
});

test("a React apostrophe in a share description is encoded once", () => {
  const ctx = {
    host: "news.algoswamp.com",
    cwd: blankWorkspace(),
    site: { title: "ALGO Swamp News", card: "custom" },
  };
  const html =
    "<html><head><title>Scan</title>" +
    '<meta name="description" content="the mother bar&#x27;s low">' +
    '<meta property="og:description" content="the mother bar&#x27;s low">' +
    '<meta name="twitter:description" content="the mother bar&#x27;s low">' +
    "</head></html>";
  const out = injectGrokPwaHead(html, ctx);
  assert.match(out, /property="og:description" content="the mother bar&#39;s low"/);
  assert.match(out, /name="twitter:description" content="the mother bar&#39;s low"/);
  assert.doesNotMatch(out, /property="og:description" content="[^"]*&amp;#x27;/);
  assert.doesNotMatch(out, /name="twitter:description" content="[^"]*&amp;#x27;/);
  assert.equal(out.split('property="og:description"').length - 1, 1);
  const twice = injectGrokPwaHead(out, ctx);
  assert.equal(twice, out);

  const doubled =
    "<html><head><title>Scan</title>" +
    '<meta name="description" content="the mother bar&amp;#x27;s low">' +
    "</head></html>";
  const fixed = injectGrokPwaHead(doubled, ctx);
  assert.match(fixed, /property="og:description" content="the mother bar&#39;s low"/);
  assert.doesNotMatch(fixed, /property="og:description" content="[^"]*&amp;/);
});

test("page description fills og and twitter text without replacing the host og:image", () => {
  const empty = mkdtempSync(join(tmpdir(), "grok-og-desc-"));
  const html =
    "<html><head><title>ALGO Swamp News</title>" +
    '<meta name="description" content="The desk is $29/mo. A sort, not a signal.">' +
    '<meta property="og:description" content="stale">' +
    '<meta name="twitter:title" content="stale title">' +
    '<meta property="og:image" content="https://evil.example/steal.jpg">' +
    "</head></html>";
  const out = injectGrokPwaHead(html, {
    host: "news.algoswamp.com",
    cwd: empty,
    site: { title: "ALGO Swamp News", card: "custom" },
  });
  assert.match(out, /property="og:title" content="ALGO Swamp News"/);
  assert.match(out, /name="twitter:title" content="ALGO Swamp News"/);
  assert.match(
    out,
    /property="og:description" content="The desk is \$29\/mo\. A sort, not a signal\."/,
  );
  assert.match(
    out,
    /name="twitter:description" content="The desk is \$29\/mo\. A sort, not a signal\."/,
  );
  assert.match(out, /name="description" content="The desk is \$29\/mo\. A sort, not a signal\."/);
  assert.match(out, /property="og:image" content="https:\/\/news\.algoswamp\.com\/og\.jpg"/);
  assert.doesNotMatch(out, /evil\.example/);
  assert.doesNotMatch(out, /content="stale"/);
  assert.equal(out.split('property="og:image"').length - 1, 1);
  assert.equal(out.split('property="og:description"').length - 1, 1);
  assert.equal(out.split('name="twitter:description"').length - 1, 1);
  const twice = injectGrokPwaHead(out, {
    host: "news.algoswamp.com",
    cwd: empty,
    site: { title: "ALGO Swamp News", card: "custom" },
  });
  assert.equal(twice.split('property="og:image"').length - 1, 1);
  assert.equal(twice, out);
});

test("a same-site page image wins over the host card, and a page without one keeps /og.jpg", () => {
  const ctx = {
    host: "news.algoswamp.com",
    cwd: blankWorkspace(),
    site: { title: "ALGO Swamp News", card: "custom" },
  };
  const withImage = (path) =>
    "<html><head><title>Classes</title>" +
    `<link rel="canonical" href="https://news.algoswamp.com${path}">` +
    `<meta property="og:image" content="https://news.algoswamp.com${path === "/learn" ? "/og-classes.jpg" : "/og-learn-201.jpg"}">` +
    `<meta name="twitter:image" content="https://news.algoswamp.com${path === "/learn" ? "/og-classes.jpg" : "/og-learn-201.jpg"}">` +
    "</head></html>";
  const classes = injectGrokPwaHead(withImage("/learn"), ctx);
  assert.match(
    classes,
    /property="og:image" content="https:\/\/news\.algoswamp\.com\/og-classes\.jpg"/,
  );
  assert.match(
    classes,
    /name="twitter:image" content="https:\/\/news\.algoswamp\.com\/og-classes\.jpg"/,
  );
  assert.doesNotMatch(classes, /content="https:\/\/news\.algoswamp\.com\/og\.jpg"/);
  assert.equal(classes.split('property="og:image"').length - 1, 1);
  assert.equal(injectGrokPwaHead(classes, ctx), classes);

  const course = injectGrokPwaHead(withImage("/learn/options-201"), ctx);
  assert.match(
    course,
    /property="og:image" content="https:\/\/news\.algoswamp\.com\/og-learn-201\.jpg"/,
  );
  assert.match(
    course,
    /name="twitter:image" content="https:\/\/news\.algoswamp\.com\/og-learn-201\.jpg"/,
  );
  assert.equal(injectGrokPwaHead(course, ctx), course);

  const plain = injectGrokPwaHead(
    '<html><head><title>Desk</title><link rel="canonical" href="https://news.algoswamp.com/desk"></head></html>',
    ctx,
  );
  assert.match(plain, /property="og:image" content="https:\/\/news\.algoswamp\.com\/og\.jpg"/);
  assert.match(plain, /name="twitter:image" content="https:\/\/news\.algoswamp\.com\/og\.jpg"/);
  assert.equal(plain.split('property="og:image"').length - 1, 1);
  assert.equal(injectGrokPwaHead(plain, ctx), plain);
});

test("keeps a page og:type and og:site_name, and fills website / ALGO Swamp when missing", () => {
  const ctx = {
    host: "news.algoswamp.com",
    cwd: blankWorkspace(),
    site: { title: "ALGO Swamp News", card: "custom" },
  };
  const course = injectGrokPwaHead(
    "<html><head><title>Lesson</title>" +
      '<meta property="og:type" content="article">' +
      '<meta property="og:site_name" content="ALGO Swamp Classes">' +
      "</head></html>",
    ctx,
  );
  assert.match(course, /property="og:type" content="article"/);
  assert.match(course, /property="og:site_name" content="ALGO Swamp Classes"/);
  assert.doesNotMatch(course, /property="og:type" content="website"/);
  assert.equal(course.split('property="og:type"').length - 1, 1);
  assert.equal(course.split('property="og:site_name"').length - 1, 1);
  assert.equal(injectGrokPwaHead(course, ctx), course);

  const home = injectGrokPwaHead("<html><head><title>Home</title></head></html>", ctx);
  assert.match(home, /property="og:type" content="website"/);
  assert.match(home, /property="og:site_name" content="ALGO Swamp"/);
  assert.equal(home.split('property="og:type"').length - 1, 1);
  assert.equal(home.split('property="og:site_name"').length - 1, 1);
  assert.equal(injectGrokPwaHead(home, ctx), home);

  const game = injectGrokPwaHead(
    '<html><head><meta property="og:type" content="article"></head></html>',
    { ...ctx, site: { title: "Pixel Nova", type: "x:game", card: "custom" } },
  );
  assert.match(game, /property="og:type" content="x:game"/);
  assert.doesNotMatch(game, /property="og:type" content="article"/);
  assert.match(game, /property="og:site_name" content="ALGO Swamp"/);
  assert.equal(game.split('property="og:type"').length - 1, 1);
});

test("site.description wins over the document description for share text", () => {
  const out = injectGrokPwaHead(
    '<html><head><meta name="description" content="from the page"></head></html>',
    { site: { title: "Desk", description: "from the site" } },
  );
  assert.match(out, /property="og:description" content="from the site"/);
  assert.match(out, /name="twitter:description" content="from the site"/);
  assert.match(out, /name="description" content="from the page"/);
  assert.doesNotMatch(out, /og:description" content="from the page"/);
});

test("does not duplicate twitter:card or og:title", () => {
  const once = injectGrokPwaHead("<html><head><title>Hello World</title></head></html>");
  const twice = injectGrokPwaHead(once);
  assert.equal(once, twice);
  assert.equal(twice.split('name="twitter:card"').length - 1, 1);
  assert.equal(twice.split('property="og:title"').length - 1, 1);
});

test("a baked site.image is treated as a custom card", () => {
  const out = injectGrokPwaHead("<html><head></head></html>", {
    host: "wild-race.grok.me",
    cwd: mkdtempSync(join(tmpdir(), "grok-og-image-only-")),
    site: { title: "Wild Race", image: "/og.jpg" },
  });
  assert.match(out, /property="og:image" content="https:\/\/wild-race\.grok\.me\/og\.jpg"/);
  assert.doesNotMatch(out, /og\.grok\.me/);
});

test("baked identity does not need a workspace filesystem", () => {
  const empty = mkdtempSync(join(tmpdir(), "grok-og-empty-"));
  const out = injectGrokPwaHead("<html><head></head></html>", {
    host: "wild-race.grok.me",
    cwd: empty,
    site: { title: "Pixel Nova", type: "x:game", card: "custom" },
  });
  assert.match(out, /property="og:title" content="Pixel Nova"/);
  assert.match(out, /property="og:type" content="x:game"/);
  assert.match(out, /property="og:image" content="https:\/\/wild-race\.grok\.me\/og\.jpg"/);
  assert.doesNotMatch(out, /og\.grok\.me/);
});

test("a public card file wins over a baked site without card=custom", () => {
  // Deploy middleware always passes a baked `site`. If that snapshot missed
  // the file, public/og.jpg must still beat the og.grok.me placeholder.
  const root = mkdtempSync(join(tmpdir(), "grok-og-card-"));
  mkdirSync(join(root, "public"));
  writeFileSync(join(root, "public/og.jpg"), "x");
  const out = injectGrokPwaHead("<html><head></head></html>", {
    host: "wild-race.grok.me",
    cwd: root,
    site: {},
  });
  assert.match(out, /property="og:image" content="https:\/\/wild-race\.grok\.me\/og\.jpg"/);
  assert.doesNotMatch(out, /og\.grok\.me/);
});

test("public/og.png wins when jpg is absent", () => {
  const root = mkdtempSync(join(tmpdir(), "grok-og-png-"));
  mkdirSync(join(root, "public"));
  writeFileSync(join(root, "public/og.png"), "x");
  const out = injectGrokPwaHead("<html><head></head></html>", {
    host: "wild-race.grok.me",
    cwd: root,
    site: { title: "Wild Race" },
  });
  assert.match(out, /property="og:image" content="https:\/\/wild-race\.grok\.me\/og\.png"/);
  assert.doesNotMatch(out, /og\.grok\.me/);
});

test("resolveOgCardAsset: disk file, then bake, then empty (placeholder)", () => {
  const empty = mkdtempSync(join(tmpdir(), "grok-og-none-"));
  assert.equal(resolveOgCardAsset({}, empty), "");
  assert.equal(resolveOgCardAsset({ title: "X" }, empty), "");

  const baked = resolveOgCardAsset({ card: "custom", image: "/og.jpg" }, empty);
  assert.equal(baked, "/og.jpg");

  const root = mkdtempSync(join(tmpdir(), "grok-og-disk-"));
  mkdirSync(join(root, "public"));
  writeFileSync(join(root, "public/og.jpg"), "x");
  assert.equal(resolveOgCardAsset({}, root), "/og.jpg");
  assert.equal(resolveOgCardAsset({ card: "custom", image: "/other.png" }, root), "/og.jpg");
});

test("snapshotOgIdentity stamps card=custom from a public card file", () => {
  const root = mkdtempSync(join(tmpdir(), "grok-og-snap-"));
  mkdirSync(join(root, "public"));
  writeFileSync(join(root, "public/og.jpg"), "x");
  const { site } = snapshotOgIdentity(root);
  assert.equal(site.card, "custom");
  assert.equal(site.image, "/og.jpg");
  assert.equal(site.banner, undefined);
});

test("snapshotOgIdentity stamps banner from public/x-banner.jpg", () => {
  const root = mkdtempSync(join(tmpdir(), "grok-og-banner-"));
  mkdirSync(join(root, "public"));
  writeFileSync(join(root, "public/x-banner.jpg"), "x");
  const { site } = snapshotOgIdentity(root);
  assert.equal(site.banner, "/x-banner.jpg");
});

test("emits x:game:image for a public host when site.banner is set", () => {
  const html = '<html><head><meta property="x:game:image" content="old"></head></html>';
  const out = injectGrokPwaHead(html, {
    host: "wild-race.grok.me",
    site: { title: "Wild Race", type: "x:game", card: "custom", banner: "/x-banner.jpg" },
  });
  assert.match(
    out,
    /property="x:game:image" content="https:\/\/wild-race\.grok\.me\/x-banner\.jpg"/,
  );
  assert.match(out, /property="x:game:image:width" content="1200"/);
  assert.match(out, /property="x:game:image:height" content="264"/);
  assert.doesNotMatch(out, /content="old"/);
  assert.equal(out.split('property="x:game:image"').length - 1, 1);
});

test("does not emit x:game:image without a public host or banner", () => {
  const noHost = injectGrokPwaHead("<html><head></head></html>", {
    site: { banner: "/x-banner.jpg" },
  });
  assert.doesNotMatch(noHost, /x:game:image/);
  const noBanner = injectGrokPwaHead("<html><head></head></html>", {
    host: "wild-race.grok.me",
    site: { type: "x:game", card: "custom" },
  });
  assert.doesNotMatch(noBanner, /x:game:image/);
});

test("site title Grok App is a real name, not a sentinel", () => {
  const out = injectGrokPwaHead("<html><head></head></html>", {
    host: "wild-race.grok.me",
    site: { title: "Grok App" },
  });
  assert.match(out, /property="og:title" content="Grok App"/);
});

test("published grok.me slug is still a title fallback", () => {
  const out = injectGrokPwaHead("<html><head></head></html>", {
    host: "wild-race.grok.me",
    cwd: blankWorkspace(),
  });
  assert.match(out, /property="og:title" content="Wild Race"/);
});

test("rejects Vercel system hosts as og:image origins", () => {
  assert.equal(
    publicAppHost("01a020b6-803a-71a2-bb47-e2bec57eb9a2-662k8x1l1-xai-org.vercel.app"),
    "",
  );
  assert.equal(publicAppHost("demo.vercel.app:443"), "");
  assert.equal(publicAppHost("vercel.app"), "");
  assert.equal(publicAppHost("wild-race.grok.me"), "wild-race.grok.me");
});

test("published VITE_PUBLIC_HOSTNAME wins over request Host for og:image", () => {
  const prev = process.env.VITE_PUBLIC_HOSTNAME;
  process.env.VITE_PUBLIC_HOSTNAME = "plum-plaza-reef-dream.grok.me";
  try {
    const vercelHost = injectGrokPwaHead("<html><head><title>RACK</title></head></html>", {
      host: "01a020b6-803a-71a2-bb47-e2bec57eb9a2-662k8x1l1-xai-org.vercel.app",
      site: { title: "RACK", card: "custom" },
    });
    assert.match(
      vercelHost,
      /property="og:image" content="https:\/\/plum-plaza-reef-dream\.grok\.me\/og\.jpg"/,
    );
    assert.doesNotMatch(vercelHost, /vercel\.app/);

    const otherPublicHost = injectGrokPwaHead("<html><head><title>RACK</title></head></html>", {
      host: "custom.example.com",
      site: { title: "RACK", card: "custom" },
    });
    assert.match(
      otherPublicHost,
      /property="og:image" content="https:\/\/plum-plaza-reef-dream\.grok\.me\/og\.jpg"/,
    );
    assert.doesNotMatch(otherPublicHost, /custom\.example\.com/);
  } finally {
    if (prev === undefined) delete process.env.VITE_PUBLIC_HOSTNAME;
    else process.env.VITE_PUBLIC_HOSTNAME = prev;
  }
});

test("vercel Host without a public hostname emits no og:image", () => {
  const prev = process.env.VITE_PUBLIC_HOSTNAME;
  delete process.env.VITE_PUBLIC_HOSTNAME;
  try {
    const out = injectGrokPwaHead("<html><head><title>RACK</title></head></html>", {
      host: "01a020b6-803a-71a2-bb47-e2bec57eb9a2-662k8x1l1-xai-org.vercel.app",
      site: { title: "RACK", card: "custom" },
    });
    assert.doesNotMatch(out, /property="og:image"/);
    assert.doesNotMatch(out, /vercel\.app/);
  } finally {
    if (prev === undefined) delete process.env.VITE_PUBLIC_HOSTNAME;
    else process.env.VITE_PUBLIC_HOSTNAME = prev;
  }
});

test("emits og:image for a public host and prefers a custom card", () => {
  const placeholder = injectGrokPwaHead("<html><head></head></html>", {
    appName: "Wild Race",
    host: "wild-race.grok.me",
    cwd: blankWorkspace(),
    site: { title: "Wild Race" },
  });
  assert.match(
    placeholder,
    /property="og:image" content="https:\/\/og\.grok\.me\/v1\/card\.png\?host=wild-race\.grok\.me&amp;title=Wild%20Race"/,
  );
  assert.match(placeholder, /property="og:image:width" content="1200"/);

  const custom = injectGrokPwaHead("<html><head></head></html>", {
    appName: "Wild Race",
    host: "wild-race.grok.me",
    cwd: blankWorkspace(),
    site: { title: "Wild Race", card: "custom", type: "x:game" },
  });
  assert.match(custom, /property="og:image" content="https:\/\/wild-race\.grok\.me\/og\.jpg"/);
  assert.match(custom, /property="og:type" content="x:game"/);
});

test("placeholder og:image appends site.color when it is 6-digit hex", () => {
  const themed = injectGrokPwaHead("<html><head></head></html>", {
    host: "wild-race.grok.me",
    cwd: blankWorkspace(),
    site: { title: "Wild Race", color: "#FF4D2E" },
  });
  assert.match(
    themed,
    /property="og:image" content="https:\/\/og\.grok\.me\/v1\/card\.png\?host=wild-race\.grok\.me&amp;title=Wild%20Race&amp;color=FF4D2E"/,
  );

  const invalid = injectGrokPwaHead("<html><head></head></html>", {
    host: "wild-race.grok.me",
    cwd: blankWorkspace(),
    site: { title: "Wild Race", color: "red" },
  });
  assert.doesNotMatch(invalid, /color=/);

  const custom = injectGrokPwaHead("<html><head></head></html>", {
    host: "wild-race.grok.me",
    cwd: blankWorkspace(),
    site: { title: "Wild Race", card: "custom", color: "FF4D2E" },
  });
  assert.doesNotMatch(custom, /color=/);
});

test("document title entities are not double-escaped on og:title", () => {
  const out = injectGrokPwaHead("<html><head><title>Cats &amp; Dogs</title></head></html>", {
    cwd: blankWorkspace(),
  });
  assert.match(out, /property="og:title" content="Cats &amp; Dogs"/);
  assert.doesNotMatch(out, /Cats &amp;amp; Dogs/);
});

test("site.json title wins over the host slug", () => {
  const out = injectGrokPwaHead("<html><head></head></html>", {
    host: "wild-race.grok.me",
    site: { title: "Pixel Nova" },
  });
  assert.match(out, /property="og:title" content="Pixel Nova"/);
});

test("injects into documents with no head element", () => {
  const out = injectGrokPwaHead("<html><body>hi</body></html>", {
    appName: "Solo",
    cwd: blankWorkspace(),
  });
  assert.match(out, /<head>/);
  assert.match(out, /property="og:title" content="Solo"/);
  assert.match(out, /<\/head>/);
});

test("streaming injector matches </HEAD> case-insensitively", () => {
  const injector = createHeadInjector({ appName: "Wild Race", cwd: blankWorkspace() });
  const chunks = [
    ...injector.push("<html><HEAD><title>x</title></HE"),
    ...injector.push("AD><body>hello</body></html>"),
  ];
  const out = Buffer.concat(chunks).toString("utf8");
  assert.match(out, /property="og:title" content="x"/);
  assert.match(out, /<body>hello<\/body>/);
});

test("omits the extensions script when the deployer disables it", () => {
  const previous = process.env.VITE_GROK_EXTENSIONS;
  process.env.VITE_GROK_EXTENSIONS = "0";
  try {
    const baked =
      '<html><head><script src="https://grok.com/grok-app-builder/extensions.js" data-project-id="old" defer></script></head></html>';
    const out = injectGrokPwaHead(baked, { appName: "Demo", projectId: "proj-123" });
    assert.doesNotMatch(out, /grok-app-builder\/extensions\.js/);
    assert.match(out, /name="grok-project-id" content="proj-123"/);
    assert.match(out, /property="grok:app_id" content="proj-123"/);
    assert.match(out, /rel="manifest"/);
    const twice = injectGrokPwaHead(out, { appName: "Demo", projectId: "proj-123" });
    assert.equal(out, twice);
  } finally {
    if (previous === undefined) delete process.env.VITE_GROK_EXTENSIONS;
    else process.env.VITE_GROK_EXTENSIONS = previous;
  }
});

test("keeps the extensions script on commercial when the deployer enables it", () => {
  const previous = process.env.VITE_GROK_EXTENSIONS;
  process.env.VITE_GROK_EXTENSIONS = "1";
  try {
    const out = injectGrokPwaHead("<html><head></head></html>", {
      appName: "Demo",
      projectId: "proj-123",
    });
    assert.match(out, /src="https:\/\/grok\.com\/grok-app-builder\/extensions\.js"/);
    assert.match(out, /data-project-id="proj-123"/);
  } finally {
    if (previous === undefined) delete process.env.VITE_GROK_EXTENSIONS;
    else process.env.VITE_GROK_EXTENSIONS = previous;
  }
});

test("does not duplicate the extensions script", () => {
  const ctx = { appName: "Demo", projectId: "proj-123" };
  const once = injectGrokPwaHead("<html><head></head></html>", ctx);
  const twice = injectGrokPwaHead(once, ctx);
  assert.equal(once, twice);
  assert.equal(twice.split("extensions.js").length - 1, 1);
});

test("is idempotent", () => {
  const once = injectGrokPwaHead("<html><head></head></html>");
  const twice = injectGrokPwaHead(once);
  assert.equal(once, twice);
});

test("uses the app name in the injected title tag", () => {
  const out = injectGrokPwaHead("<html><head></head></html>", {
    appName: "Wild Race",
    cwd: blankWorkspace(),
  });
  assert.match(out, /apple-mobile-web-app-title" content="Wild Race"/);
});

test("streaming injector handles </head> split across chunks", () => {
  const injector = createHeadInjector({ appName: "Wild Race" });
  const chunks = [
    ...injector.push("<html><head><title>x</title></he"),
    ...injector.push("ad><body>hello</body></html>"),
  ];
  const out = Buffer.concat(chunks).toString("utf8");
  assert.match(out, /rel="manifest"/);
  assert.ok(out.indexOf("manifest") < out.indexOf("</head>"));
  assert.match(out, /<body>hello<\/body>/);
  assert.deepEqual(injector.flush(), []);
});

test("streaming injector passes post-head chunks through untouched", () => {
  const injector = createHeadInjector();
  injector.push("<html><head></head>");
  const [tail] = injector.push("<body>tail</body>");
  assert.equal(tail.toString("utf8"), "<body>tail</body>");
});

test("streaming injector falls back when no </head> is seen", () => {
  const injector = createHeadInjector();
  assert.deepEqual(injector.push("<html><head>"), []);
  const out = Buffer.concat(injector.flush()).toString("utf8");
  assert.match(out, /rel="manifest"/);
});

test("detects install query", () => {
  assert.equal(isInstallQuery("/?install=1&platform=ios"), true);
  assert.equal(isInstallQuery("/app?foo=1&install=true&platform=ios"), true);
  assert.equal(isInstallQuery("/?install=1"), false);
  assert.equal(isInstallQuery("/?install=1&platform=android"), false);
  assert.equal(isInstallQuery("/?install=0&platform=ios"), false);
  assert.equal(isInstallQuery("/"), false);
});

test("filters non-document paths", () => {
  assert.equal(isDocumentPath("/"), true);
  assert.equal(isDocumentPath("/app"), true);
  assert.equal(isDocumentPath("/api/thing"), false);
  assert.equal(isDocumentPath("/__grok/install/styles.css"), false);
  assert.equal(isDocumentPath("/logo.png"), false);
});

test("strips install params from the app link", () => {
  assert.equal(stripInstallParams("/?install=1&platform=ios"), "/");
  assert.equal(stripInstallParams("/app?install=1&platform=ios&tab=2"), "/app?tab=2");
});

test("names the install page from host slug", () => {
  assert.equal(appNameFromHost("localhost:8080"), "Grok App");
  assert.equal(appNameFromHost("172.17.154.217:8080"), "Grok App");
  assert.equal(appNameFromHost("wild-race.grok.me"), "Wild Race");
});

test("rejects hosts that are not plain slugs", () => {
  assert.equal(appNameFromHost("<script>alert(1)</script>"), "Grok App");
  assert.equal(appNameFromHost('"><img src=x onerror=1>.grok.me'), "Grok App");
});

test("renders install page markup", () => {
  const html = renderInstallPage("wild-race.grok.me", "/?install=1&platform=ios");
  assert.match(html, /Add Wild Race to your/);
  assert.match(html, /\/__grok\/install\/styles\.css/);
  assert.match(html, /href="\/"/);
  assert.equal(html.includes("{{APP_NAME}}"), false);
  assert.equal(html.includes("{{APP_URL}}"), false);
});

test("escapes host-derived values in the install page", () => {
  const html = renderInstallPage("<script>alert(1)</script>", "/?install=1&platform=ios");
  assert.equal(html.includes("<script>alert(1)</script>"), false);
});

test("renders the manifest with the per-app name", () => {
  const manifest = JSON.parse(renderWebManifest("wild-race.grok.me"));
  assert.equal(manifest.name, "Wild Race");
  assert.equal(manifest.short_name, "Wild Race");
  assert.equal(manifest.icons[0].src, "/__grok/icon-180.png");
});

// Tripwires: the deployed-app path only works if Nitro scans server/ — an
// accidental edit that drops serverDir or the middleware file would otherwise
// fail silently (published apps would just render the app for ?install=1).
test("vite config keeps the nitro serverDir wiring", () => {
  const viteConfig = readFileSync(join(TEMPLATE_ROOT, "vite.config.ts"), "utf8");
  assert.match(viteConfig, /serverDir:\s*"\.\/server"/);
  assert.match(viteConfig, /grokPwaPlugin\(\)/);
});

test("nitro middleware and its bundled assets exist", () => {
  const middleware = readFileSync(join(TEMPLATE_ROOT, "server/middleware/grok-pwa.ts"), "utf8");
  assert.match(middleware, /install-page\.html\?raw/);
  assert.match(middleware, /virtual:grok-og-identity/);
  readFileSync(join(TEMPLATE_ROOT, "scripts/install-page.html"));
  readFileSync(join(TEMPLATE_ROOT, "public/__grok/icon-180.png"));
  readFileSync(join(TEMPLATE_ROOT, "public/__grok/install/styles.css"));
});

test("vite plugin bakes og identity as a virtual module", () => {
  const plugin = readFileSync(join(TEMPLATE_ROOT, "scripts/grok-pwa-plugin.mjs"), "utf8");
  assert.match(plugin, /virtual:grok-og-identity/);
  assert.match(plugin, /snapshotOgIdentity/);
});

test("a route title beats site.json and canonical is re-emitted as og:url", () => {
  const html =
    "<html><head><title>Live Headline Desk</title>" +
    '<meta name="description" content="Live wires.">' +
    '<meta name="robots" content="noindex,follow">' +
    '<link rel="canonical" href="https://news.algoswamp.com/desk">' +
    "</head></html>";
  const ctx = {
    host: "news.algoswamp.com",
    cwd: blankWorkspace(),
    site: { title: "ALGO Swamp News", description: "", card: "custom" },
  };
  const out = injectGrokPwaHead(html, ctx);
  assert.match(out, /<title>Live Headline Desk<\/title>/);
  assert.match(out, /property="og:title" content="Live Headline Desk"/);
  assert.doesNotMatch(out, /property="og:title" content="ALGO Swamp News"/);
  assert.match(out, /property="og:description" content="Live wires\."/);
  assert.match(out, /property="og:url" content="https:\/\/news\.algoswamp\.com\/desk"/);
  assert.match(out, /rel="canonical" href="https:\/\/news\.algoswamp\.com\/desk"/);
  assert.match(out, /name="robots" content="noindex,follow"/);
  assert.match(out, /property="og:image" content="https:\/\/news\.algoswamp\.com\/og\.jpg"/);
  assert.equal(out.split('property="og:url"').length - 1, 1);
  assert.equal(injectGrokPwaHead(out, ctx), out);
});

test("an explicit og:url wins over a different canonical and stays singular", () => {
  const html =
    "<html><head><title>Monthly</title>" +
    '<link rel="canonical" href="https://news.algoswamp.com/join?plan=annual">' +
    '<meta property="og:url" content="https://news.algoswamp.com/join?plan=monthly">' +
    "</head></html>";
  const ctx = { cwd: blankWorkspace(), site: { title: "ALGO Swamp News" } };
  const out = injectGrokPwaHead(html, ctx);
  assert.match(
    out,
    /property="og:url" content="https:\/\/news\.algoswamp\.com\/join\?plan=monthly"/,
  );
  assert.match(out, /rel="canonical" href="https:\/\/news\.algoswamp\.com\/join\?plan=annual"/);
  assert.equal(out.split('property="og:url"').length - 1, 1);
  assert.equal(injectGrokPwaHead(out, ctx), out);
});
