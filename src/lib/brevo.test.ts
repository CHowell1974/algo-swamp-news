import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import {
  BREVO_DAILY_CAP,
  brevoCampaignPayload,
  brevoDoiPayload,
  brevoErrorNote,
  brevoSender,
  campaignIdFromBody,
  contactFromBody,
  doiTemplateFields,
  listIdByName,
  listSendBlock,
  parseBrevoId,
  singleTestRecipient,
  subscriberCountFromList,
  templateIdByName,
  wireSendEnabled,
} from "./brevo.ts";
import { BREVO_UNSUBSCRIBE_HREF, FROM_EMAIL } from "./wire-email.ts";

describe("wire send switch", () => {
  it("sends only when the flag is the string true", () => {
    assert.equal(wireSendEnabled("true"), true);
    assert.equal(wireSendEnabled("TRUE"), false);
    assert.equal(wireSendEnabled("1"), false);
    assert.equal(wireSendEnabled(undefined), false);
  });
});

describe("brevo ids", () => {
  it("accepts a positive integer and rejects blanks and junk", () => {
    assert.equal(parseBrevoId("12"), 12);
    assert.equal(parseBrevoId("  12  "), 12);
    assert.equal(parseBrevoId("0"), null);
    assert.equal(parseBrevoId("1.5"), null);
    assert.equal(parseBrevoId("12abc"), null);
    assert.equal(parseBrevoId(""), null);
    assert.equal(parseBrevoId(undefined), null);
  });
});

describe("campaign payload", () => {
  it("targets one list from the verified sender and keeps the unsubscribe tag", () => {
    const html = `<p>hi</p><a href="${BREVO_UNSUBSCRIBE_HREF}">Unsubscribe</a>`;
    const payload = brevoCampaignPayload({
      name: "Pre-market wire 2026-10-22",
      subject: "Pre-market wire · Thu, Oct 22: Fed holds",
      htmlContent: html,
      previewText: "Six scored headlines before the open.",
      listId: 7,
      sender: brevoSender(),
    });
    assert.equal(payload.type, "classic");
    assert.equal(payload.sender.email, FROM_EMAIL);
    assert.equal(payload.sender.name, "ALGO Swamp");
    assert.equal(payload.replyTo, FROM_EMAIL);
    assert.deepEqual(payload.recipients.listIds, [7]);
    assert.equal(payload.inlineImageActivation, false);
    assert.equal(payload.htmlContent.includes(BREVO_UNSUBSCRIBE_HREF), true);
    assert.equal("subscriber_filter" in payload, false);
    assert.equal(JSON.stringify(payload).includes("xkeysib-"), false);
  });

  it("blocks an empty list and a list over the free daily cap", () => {
    assert.equal(listSendBlock(0), "empty-list");
    assert.equal(listSendBlock(BREVO_DAILY_CAP), null);
    assert.equal(listSendBlock(BREVO_DAILY_CAP + 1), "over-daily-cap");
  });
});

describe("double opt-in", () => {
  it("points the confirmation link at the site and names the template", () => {
    const payload = brevoDoiPayload({ email: "reader@algoswamp.com", listId: 7, templateId: 3 });
    assert.deepEqual(payload, {
      email: "reader@algoswamp.com",
      includeListIds: [7],
      templateId: 3,
      redirectionUrl: "https://news.algoswamp.com/",
    });
    const template = doiTemplateFields();
    assert.equal(template.templateName, "ALGO Swamp free wire confirm");
    assert.equal(template.htmlContent.includes("{{ params.DOIurl }}"), true);
    assert.equal(template.isActive, true);
  });
});

describe("brevo responses", () => {
  it("reads a campaign id, a list count, and whether a contact is already on the list", () => {
    assert.equal(campaignIdFromBody({ id: 15 }), "15");
    assert.equal(campaignIdFromBody({}), null);
    assert.equal(subscriberCountFromList({ uniqueSubscribers: 4, totalSubscribers: 9 }), 4);
    assert.equal(subscriberCountFromList({ totalSubscribers: 9 }), 9);
    assert.deepEqual(contactFromBody({ emailBlacklisted: false, listIds: [7, "8"] }, 7), {
      onList: true,
      blacklisted: false,
    });
    assert.deepEqual(contactFromBody({ emailBlacklisted: true, listIds: [] }, 7), {
      onList: false,
      blacklisted: true,
    });
    assert.equal(
      listIdByName(
        {
          lists: [
            { id: 4, name: "Other" },
            { id: 7, name: "Pre-market wire" },
          ],
        },
        "Pre-market wire",
      ),
      7,
    );
    assert.equal(
      templateIdByName(
        { templates: [{ id: 3, name: "ALGO Swamp free wire confirm" }] },
        "ALGO Swamp free wire confirm",
      ),
      3,
    );
  });

  it("records the status and code and strips a key from the message", () => {
    const note = brevoErrorNote(
      401,
      JSON.stringify({
        code: "unauthorized",
        message: "Key not found xkeysib-abc123def456-xyz789",
      }),
    );
    assert.match(note, /brevo-status=401/);
    assert.match(note, /code=unauthorized/);
    assert.equal(note.includes("xkeysib-"), false);
    assert.match(note, /\[redacted\]/);
  });
});

describe("test recipient", () => {
  it("accepts one address and rejects a list", () => {
    assert.equal(singleTestRecipient(["chris@algoswamp.com"]), "chris@algoswamp.com");
    assert.equal(singleTestRecipient(["  chris@algoswamp.com  "]), "chris@algoswamp.com");
    assert.equal(singleTestRecipient(["a@b.com", "c@d.com"]), null);
    assert.equal(singleTestRecipient(["a@b.com,c@d.com"]), null);
    assert.equal(singleTestRecipient([]), null);
    assert.equal(singleTestRecipient(["not-an-email"]), null);
  });
});

describe("kit send path", () => {
  it("is gone from the cron sender and the free-wire form", () => {
    const server = readFileSync(new URL("./premarket-wire.server.ts", import.meta.url), "utf8");
    const form = readFileSync(
      new URL("../components/free-wire-signup.tsx", import.meta.url),
      "utf8",
    );
    assert.equal(server.includes("api.kit.com"), false);
    assert.equal(server.includes("KIT_API_KEY"), false);
    assert.equal(server.includes("KIT_SEND_ENABLED"), false);
    assert.match(server, /sendListCampaign/);
    assert.equal(form.includes("KIT_FORM_ID"), false);
    assert.equal(form.includes("app.kit.com"), false);
    const start = server.indexOf("async function executeWireTest");
    const end = server.indexOf("async function claimDay");
    const testFn = server.slice(start, end);
    assert.equal(testFn.includes("claimDay"), false);
    assert.equal(testFn.includes("wire_sends"), false);
    assert.equal(testFn.includes("BREVO_SEND_ENABLED"), false);
  });
});
