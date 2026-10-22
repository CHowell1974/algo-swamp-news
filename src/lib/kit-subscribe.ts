/**
 * Key-free subscribe for the Kit form at algo-swamp.kit.com (form 10083135).
 *
 * The public form endpoint answers browser posts with CORS (`access-control-allow-origin: *`)
 * when the request matches Kit's own form script: multipart fields plus
 * `Accept: application/json` and `X-CKJS-Version`. A server-side proxy from a
 * datacenter address is sent to Kit's captcha gate, so the browser posts directly.
 */

export const KIT_FORM_ID = "10083135";
export const KIT_SUBSCRIBE_URL = `https://app.kit.com/forms/${KIT_FORM_ID}/subscriptions`;

const KIT_HOST = "app.kit.com";
const VISITOR_KEY = "ckid";

export type KitSubscribeOutcome =
  | { kind: "success"; raw: unknown }
  | { kind: "check"; url: string; raw: unknown }
  | { kind: "error"; raw: unknown };

export function isValidEmail(value: string): boolean {
  const email = value.trim();
  if (email.length < 3 || email.length > 254) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function isKitCheckUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      url.hostname === KIT_HOST &&
      (url.pathname.startsWith("/forms/guards/") || url.pathname.startsWith("/forms/consents/"))
    );
  } catch {
    return false;
  }
}

type KitPayload = {
  status?: unknown;
  url?: unknown;
  consent?: { enabled?: unknown; url?: unknown };
};

export function interpretKitResponse(httpStatus: number, payload: unknown): KitSubscribeOutcome {
  if (httpStatus < 200 || httpStatus >= 300 || !payload || typeof payload !== "object") {
    return { kind: "error", raw: payload };
  }
  const body = payload as KitPayload;
  if (body.status === "quarantined" && typeof body.url === "string" && isKitCheckUrl(body.url)) {
    return { kind: "check", url: body.url, raw: payload };
  }
  if (body.status === "success") {
    const consent = body.consent;
    if (
      consent &&
      consent.enabled === true &&
      typeof consent.url === "string" &&
      isKitCheckUrl(consent.url)
    ) {
      return { kind: "check", url: consent.url, raw: payload };
    }
    return { kind: "success", raw: payload };
  }
  return { kind: "error", raw: payload };
}

function visitorId(): string {
  try {
    const existing = window.localStorage.getItem(VISITOR_KEY);
    if (existing) return existing;
    const created = crypto.randomUUID();
    window.localStorage.setItem(VISITOR_KEY, created);
    return created;
  } catch {
    return crypto.randomUUID();
  }
}

export async function subscribeToFreeWire(email: string): Promise<KitSubscribeOutcome> {
  const body = new FormData();
  body.append("email_address", email.trim());
  body.append("token", "");
  body.append("referrer", document.referrer || "");
  body.append("host", window.location.href);
  body.append("search", window.location.search || "");
  body.append("user", visitorId());
  body.append("ckjs_version", "6");

  let response: Response;
  try {
    response = await fetch(KIT_SUBSCRIBE_URL, {
      method: "POST",
      body,
      headers: {
        Accept: "application/json",
        "X-CKJS-Version": "6",
      },
    });
  } catch {
    return { kind: "error", raw: null };
  }

  let payload: unknown = null;
  try {
    payload = await response.json();
  } catch {
    return { kind: "error", raw: null };
  }
  return interpretKitResponse(response.status, payload);
}
