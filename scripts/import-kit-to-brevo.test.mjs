import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import {
  DEFAULT_FORM_IDS,
  batches,
  emailsFromCsv,
  emailsFromKitPage,
  importToBrevo,
  loadKitEmails,
  parseArgs,
  parseListId,
  selectedFormIds,
  uniqueEmails,
} from "./import-kit-to-brevo.mjs";

describe("csv", () => {
  it("reads an email column, a one-address file, and skips junk", () => {
    assert.deepEqual(
      emailsFromCsv('email_address,first_name\nAda@Desk.com,Ada\n"Bee, Jr"@desk.com,Bee\nnope\n'),
      ["ada@desk.com"],
    );
    assert.deepEqual(emailsFromCsv("ada@desk.com\nada@desk.com\nbee@desk.com\n"), [
      "ada@desk.com",
      "bee@desk.com",
    ]);
    assert.deepEqual(uniqueEmails(["Ada@Desk.com", "ada@desk.com", "nope"]), ["ada@desk.com"]);
  });

  it("keeps a quoted comma out of the email column", () => {
    const csv = 'email,note\n"ada@desk.com","hello, there"\n';
    assert.deepEqual(emailsFromCsv(csv), ["ada@desk.com"]);
  });
});

describe("kit pages", () => {
  it("keeps active subscribers and the next cursor", () => {
    const page = emailsFromKitPage({
      subscribers: [
        { email_address: "Ada@Desk.com", state: "active" },
        { email_address: "gone@desk.com", state: "cancelled" },
      ],
      pagination: { has_next_page: true, end_cursor: "cursor-1" },
    });
    assert.deepEqual(page.emails, ["ada@desk.com"]);
    assert.equal(page.cursor, "cursor-1");
    assert.equal(
      emailsFromKitPage({ subscribers: [], pagination: { has_next_page: false } }).cursor,
      null,
    );
  });

  it("follows the cursor and does not send the key anywhere but the header", async () => {
    const seen = [];
    const fetchImpl = async (url, init) => {
      seen.push({ href: String(url), key: init.headers["X-Kit-Api-Key"] });
      const cursor = new URL(String(url)).searchParams.get("after");
      const body = cursor
        ? { subscribers: [{ email_address: "bee@desk.com", state: "active" }], pagination: {} }
        : {
            subscribers: [{ email_address: "ada@desk.com", state: "active" }],
            pagination: { has_next_page: true, end_cursor: "next" },
          };
      return { ok: true, status: 200, text: async () => JSON.stringify(body) };
    };
    const emails = await loadKitEmails({
      apiKey: "kit-secret",
      formIds: ["10083135"],
      allActive: false,
      fetchImpl,
    });
    assert.deepEqual(emails, ["ada@desk.com", "bee@desk.com"]);
    assert.equal(seen.length, 2);
    assert.match(seen[0].href, /\/forms\/10083135\/subscribers/);
    assert.match(seen[1].href, /after=next/);
    assert.equal(seen[0].key, "kit-secret");
    assert.equal(seen[0].href.includes("kit-secret"), false);
  });
});

describe("brevo import", () => {
  it("stays a dry run unless --apply is present and batches the write", async () => {
    assert.equal(parseArgs(["--csv", "people.csv"]).apply, false);
    assert.equal(parseArgs(["--csv", "people.csv", "--apply"]).apply, true);
    assert.deepEqual(selectedFormIds([]), DEFAULT_FORM_IDS);
    assert.throws(() => selectedFormIds(["nope"]), /numeric/);
    assert.equal(parseListId("12"), 12);
    assert.equal(parseListId("nope"), null);
    assert.equal(batches(["a", "b", "c"], 2).length, 2);
    const calls = [];
    const processIds = await importToBrevo({
      apiKey: "xkeysib-secret",
      listId: 7,
      emails: ["ada@desk.com", "bee@desk.com"],
      fetchImpl: async (url, init) => {
        calls.push({ url, body: JSON.parse(init.body), key: init.headers["api-key"] });
        return { ok: true, status: 202, text: async () => JSON.stringify({ processId: 99 }) };
      },
    });
    assert.deepEqual(processIds, [99]);
    assert.equal(calls[0].url, "https://api.brevo.com/v3/contacts/import");
    assert.deepEqual(calls[0].body.listIds, [7]);
    assert.equal(calls[0].body.updateExistingContacts, true);
    assert.deepEqual(calls[0].body.jsonBody, [
      { email: "ada@desk.com" },
      { email: "bee@desk.com" },
    ]);
    assert.equal(JSON.stringify(calls[0].body).includes("xkeysib-"), false);
  });

  it("uses the same default forms as the site", () => {
    const source = readFileSync(new URL("../src/lib/kit-subscribe.ts", import.meta.url), "utf8");
    assert.match(source, /KIT_FORM_ID = "10083135"/);
    assert.match(source, /ROAD_MAP_FORM_ID = "10084236"/);
  });
});
