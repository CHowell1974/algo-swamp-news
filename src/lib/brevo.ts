import { isValidEmail } from "./kit-subscribe.ts";
import { FROM_EMAIL, SITE_URL, wireTraceDetail } from "./wire-email.ts";

export const BREVO_API = "https://api.brevo.com/v3";
/** Free Brevo accounts can send 300 emails per day. One campaign recipient counts as one. */
export const BREVO_DAILY_CAP = 300;
export const DEFAULT_LIST_NAME = "Pre-market wire";
export const SENDER_NAME = "ALGO Swamp";
export const DOI_TEMPLATE_NAME = "ALGO Swamp free wire confirm";
export const DOI_REDIRECT_URL = `${SITE_URL}/`;

export type WireSubscribeResult = { ok: true; confirm: boolean } | { ok: false };

export type WireProviderReason =
  "missing-api-key" | "missing-list" | "empty-list" | "over-daily-cap" | "brevo-error";

export function wireSendEnabled(value: string | undefined): boolean {
  return value === "true";
}

/** Positive integer id from an env var, or null when the value is missing or not an id. */
export function parseBrevoId(value: string | undefined | null): number | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!/^[1-9]\d{0,15}$/.test(trimmed)) return null;
  const id = Number(trimmed);
  return Number.isSafeInteger(id) ? id : null;
}

export function brevoSender(env: { email?: string | undefined; name?: string | undefined } = {}): {
  email: string;
  name: string;
} {
  return {
    email: env.email?.trim() || FROM_EMAIL,
    name: env.name?.trim() || SENDER_NAME,
  };
}

/** Block a list send that would email nobody, or more people than the free daily cap. */
export function listSendBlock(
  subscribers: number,
  cap = BREVO_DAILY_CAP,
): "empty-list" | "over-daily-cap" | null {
  if (!Number.isFinite(subscribers) || subscribers <= 0) return "empty-list";
  if (subscribers > cap) return "over-daily-cap";
  return null;
}

export type BrevoCampaignPayload = {
  name: string;
  subject: string;
  sender: { name: string; email: string };
  type: "classic";
  htmlContent: string;
  previewText: string;
  recipients: { listIds: number[] };
  replyTo: string;
  inlineImageActivation: false;
};

/** Body for POST /v3/emailCampaigns. The html must already contain Brevo's unsubscribe tag. */
export function brevoCampaignPayload(input: {
  name: string;
  subject: string;
  htmlContent: string;
  previewText: string;
  listId: number;
  sender: { email: string; name: string };
}): BrevoCampaignPayload {
  return {
    name: input.name,
    subject: input.subject,
    sender: { name: input.sender.name, email: input.sender.email },
    type: "classic",
    htmlContent: input.htmlContent,
    previewText: input.previewText,
    recipients: { listIds: [input.listId] },
    replyTo: input.sender.email,
    inlineImageActivation: false,
  };
}

export function brevoDoiPayload(input: {
  email: string;
  listId: number;
  templateId: number;
  redirectionUrl?: string;
}): {
  email: string;
  includeListIds: number[];
  templateId: number;
  redirectionUrl: string;
} {
  return {
    email: input.email,
    includeListIds: [input.listId],
    templateId: input.templateId,
    redirectionUrl: input.redirectionUrl ?? DOI_REDIRECT_URL,
  };
}

/** Transactional template used as the double opt-in email. The href tag is required by Brevo. */
export function doiTemplateFields(): {
  templateName: string;
  subject: string;
  htmlContent: string;
  isActive: true;
  tag: string;
} {
  return {
    templateName: DOI_TEMPLATE_NAME,
    subject: "Confirm your free wire",
    isActive: true,
    tag: "wire-doi",
    htmlContent: `<!doctype html><html><body style="font-family:Arial,Helvetica,sans-serif;background:#0c1410;color:#e8f2e4;padding:24px;">
<p>Confirm your email to get the ALGO Swamp pre-market wire.</p>
<p><a href="{{ params.DOIurl }}" style="color:#d6f25c;">Confirm your email</a></p>
<p style="color:#8ea396;font-size:13px;">If you did not ask for this, you can ignore it.</p>
</body></html>`,
  };
}

export function subscriberCountFromList(body: unknown): number | null {
  if (!body || typeof body !== "object") return null;
  const record = body as { uniqueSubscribers?: unknown; totalSubscribers?: unknown };
  if (typeof record.uniqueSubscribers === "number" && Number.isFinite(record.uniqueSubscribers)) {
    return record.uniqueSubscribers;
  }
  if (typeof record.totalSubscribers === "number" && Number.isFinite(record.totalSubscribers)) {
    return record.totalSubscribers;
  }
  return null;
}

export function campaignIdFromBody(body: unknown): string | null {
  if (!body || typeof body !== "object") return null;
  const id = (body as { id?: unknown }).id;
  if (typeof id === "number" && Number.isSafeInteger(id) && id > 0) return String(id);
  if (typeof id === "string" && /^[1-9]\d*$/.test(id)) return id;
  return null;
}

export type BrevoContactState = { onList: boolean; blacklisted: boolean };

function asId(value: unknown): number | null {
  if (typeof value === "number" && Number.isSafeInteger(value) && value > 0) return value;
  if (typeof value === "string" && /^[1-9]\d*$/.test(value)) return Number(value);
  return null;
}

export function contactFromBody(body: unknown, listId: number): BrevoContactState | null {
  if (!body || typeof body !== "object") return null;
  const record = body as { emailBlacklisted?: unknown; listIds?: unknown };
  const listIds = Array.isArray(record.listIds)
    ? record.listIds.map(asId).filter((id): id is number => id !== null)
    : [];
  return {
    blacklisted: record.emailBlacklisted === true,
    onList: listIds.includes(listId),
  };
}

function namedId(
  body: unknown,
  collection: "lists" | "templates" | "folders",
  name?: string,
): number | null {
  if (!body || typeof body !== "object") return null;
  const rows = (body as Record<string, unknown>)[collection];
  if (!Array.isArray(rows)) return null;
  for (const row of rows) {
    if (!row || typeof row !== "object") continue;
    const record = row as { id?: unknown; name?: unknown; templateName?: unknown };
    if (name !== undefined) {
      const label =
        typeof record.name === "string"
          ? record.name
          : typeof record.templateName === "string"
            ? record.templateName
            : "";
      if (label.trim() !== name) continue;
    }
    const id = asId(record.id);
    if (id) return id;
  }
  return null;
}

export function listIdByName(body: unknown, name: string): number | null {
  return namedId(body, "lists", name);
}

export function templateIdByName(body: unknown, name: string): number | null {
  return namedId(body, "templates", name);
}

export function firstFolderId(body: unknown): number | null {
  return namedId(body, "folders");
}

export function collectionPage(
  body: unknown,
  collection: "lists" | "templates" | "folders",
): {
  length: number;
  count: number | null;
} {
  if (!body || typeof body !== "object") return { length: 0, count: null };
  const record = body as Record<string, unknown>;
  const rows = record[collection];
  const length = Array.isArray(rows) ? rows.length : 0;
  const count =
    typeof record.count === "number" && Number.isFinite(record.count) ? record.count : null;
  return { length, count };
}

/** One address from a `to` query. More than one value, or a comma, is rejected. */
export function singleTestRecipient(values: readonly string[]): string | null {
  if (values.length !== 1) return null;
  const email = values[0]?.trim() ?? "";
  if (!email || email.includes(",")) return null;
  return isValidEmail(email) ? email : null;
}

/** Status, Brevo's error code, and a short message. Secrets are stripped before this is stored. */
export function brevoErrorNote(status: number, body: string): string {
  let code: string | null = null;
  let message: string | null = null;
  try {
    const parsed = JSON.parse(body) as { code?: unknown; message?: unknown };
    if (typeof parsed.code === "string" && parsed.code.trim()) {
      code = parsed.code
        .trim()
        .replace(/[;\r\n]+/g, " ")
        .slice(0, 80);
    }
    if (typeof parsed.message === "string" && parsed.message.trim()) {
      message = parsed.message.trim().replace(/\s+/g, " ").slice(0, 120);
    }
  } catch {
    const clipped = body.replace(/\s+/g, " ").trim();
    if (clipped) message = clipped.slice(0, 80);
  }
  return (
    wireTraceDetail([
      status > 0 ? `brevo-status=${status}` : "brevo-status=0",
      code ? `code=${code}` : null,
      message,
    ]) ?? `brevo-status=${status > 0 ? status : 0}`
  );
}
