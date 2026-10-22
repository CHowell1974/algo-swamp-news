import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { interpretKitResponse, isKitCheckUrl, isValidEmail } from "./kit-subscribe.ts";

const success = {
  consent: { enabled: false, url: "https://app.kit.com/forms/consents/abc?redirect=1" },
  status: "success",
  redirect_url: "https://app.kit.com/forms/success?form_id=10083135",
};

describe("isValidEmail", () => {
  it("accepts a normal address and rejects blanks and junk", () => {
    assert.equal(isValidEmail("  reader@algoswamp.com "), true);
    assert.equal(isValidEmail(""), false);
    assert.equal(isValidEmail("not-an-email"), false);
    assert.equal(isValidEmail("a@b"), false);
    assert.equal(isValidEmail("a b@desk.com"), false);
  });
});

describe("isKitCheckUrl", () => {
  it("allows only Kit guard and consent pages", () => {
    assert.equal(
      isKitCheckUrl("https://app.kit.com/forms/guards/26f125c5-dbfc-461d-ae67-29ab0c8a3ce2"),
      true,
    );
    assert.equal(isKitCheckUrl("https://app.kit.com/forms/consents/token"), true);
    assert.equal(isKitCheckUrl("https://app.kit.com/forms/10083135/subscriptions"), false);
    assert.equal(isKitCheckUrl("http://app.kit.com/forms/guards/x"), false);
    assert.equal(isKitCheckUrl("https://evil.example/forms/guards/x"), false);
  });
});

describe("interpretKitResponse", () => {
  it("treats a success without a required consent step as subscribed", () => {
    assert.equal(interpretKitResponse(200, success).kind, "success");
  });

  it("asks for the consent step only when Kit enabled it", () => {
    const outcome = interpretKitResponse(200, {
      ...success,
      consent: { enabled: true, url: "https://app.kit.com/forms/consents/token" },
    });
    assert.deepEqual(outcome, {
      kind: "check",
      url: "https://app.kit.com/forms/consents/token",
      raw: {
        ...success,
        consent: { enabled: true, url: "https://app.kit.com/forms/consents/token" },
      },
    });
  });

  it("surfaces a quarantined subscribe as Kit's security check", () => {
    const outcome = interpretKitResponse(200, {
      consent: { enabled: false },
      status: "quarantined",
      url: "https://app.kit.com/forms/guards/abc",
    });
    assert.equal(outcome.kind, "check");
  });

  it("rejects a quarantined payload that points off Kit", () => {
    assert.equal(
      interpretKitResponse(200, {
        status: "quarantined",
        url: "https://evil.example/forms/guards/abc",
      }).kind,
      "error",
    );
  });

  it("rejects non-success payloads and failed HTTP statuses", () => {
    assert.equal(interpretKitResponse(200, { errors: { messages: ["nope"] } }).kind, "error");
    assert.equal(interpretKitResponse(500, success).kind, "error");
    assert.equal(interpretKitResponse(200, null).kind, "error");
  });
});
