/**
 * Brevo v3 client. Server-only: the API key stays in `BREVO_API_KEY` and is
 * sent as the `api-key` header. Never import this module from a component.
 */
import {
  BREVO_API,
  BREVO_DAILY_CAP,
  DEFAULT_LIST_NAME,
  DOI_TEMPLATE_NAME,
  brevoCampaignPayload,
  brevoDoiPayload,
  brevoErrorNote,
  brevoSender,
  campaignIdFromBody,
  collectionPage,
  contactFromBody,
  doiTemplateFields,
  firstFolderId,
  listIdByName,
  listSendBlock,
  parseBrevoId,
  subscriberCountFromList,
  templateIdByName,
  type BrevoContactState,
  type WireProviderReason,
  type WireSubscribeResult,
} from "@/lib/brevo";

export class BrevoError extends Error {
  readonly reason: WireProviderReason;
  readonly note: string | null;

  constructor(reason: WireProviderReason, note: string | null) {
    super(note ?? reason);
    this.name = "BrevoError";
    this.reason = reason;
    this.note = note;
  }
}

function assertServer(): void {
  if (typeof window !== "undefined") {
    throw new Error("Brevo is server-only.");
  }
}

function apiKey(): string {
  const key = process.env.BREVO_API_KEY?.trim();
  if (!key) throw new BrevoError("missing-api-key", null);
  return key;
}

type BrevoResponse = { status: number; text: string; json: unknown };

async function brevo(path: string, method: string, body?: unknown): Promise<BrevoResponse> {
  assertServer();
  const headers: Record<string, string> = {
    "api-key": apiKey(),
    accept: "application/json",
  };
  let payload: string | undefined;
  if (body !== undefined) {
    headers["content-type"] = "application/json";
    payload = JSON.stringify(body);
  }
  let response: Response;
  try {
    response = await fetch(`${BREVO_API}${path}`, {
      method,
      headers,
      body: payload,
      signal: AbortSignal.timeout(20_000),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "request failed";
    throw new BrevoError("brevo-error", brevoErrorNote(0, JSON.stringify({ message })));
  }
  const text = await response.text();
  let json: unknown = null;
  if (text) {
    try {
      json = JSON.parse(text) as unknown;
    } catch {
      json = null;
    }
  }
  return { status: response.status, text, json };
}

function expectOk(response: BrevoResponse): void {
  if (response.status >= 200 && response.status < 300) return;
  throw new BrevoError("brevo-error", brevoErrorNote(response.status, response.text));
}

function senderFromEnv(): { email: string; name: string } {
  return brevoSender({
    email: process.env.BREVO_SENDER_EMAIL,
    name: process.env.BREVO_SENDER_NAME,
  });
}

let listTask: Promise<number> | null = null;
let templateTask: Promise<number> | null = null;

/** Test hook. The running server keeps the resolved ids for the life of the process. */
export function resetBrevoCache(): void {
  listTask = null;
  templateTask = null;
}

async function findOrCreateList(): Promise<number> {
  const name = process.env.BREVO_LIST_NAME?.trim() || DEFAULT_LIST_NAME;
  const limit = 50;
  for (let offset = 0; offset < 500; offset += limit) {
    const page = await brevo(`/contacts/lists?limit=${limit}&offset=${offset}`, "GET");
    expectOk(page);
    const found = listIdByName(page.json, name);
    if (found) return found;
    const info = collectionPage(page.json, "lists");
    if (info.length < limit || (info.count !== null && offset + info.length >= info.count)) break;
  }
  const folderId = await resolveFolderId();
  const created = await brevo("/contacts/lists", "POST", { name, folderId });
  expectOk(created);
  const id = campaignIdFromBody(created.json);
  if (!id) throw new BrevoError("missing-list", "Brevo did not return a list id");
  return Number(id);
}

async function resolveFolderId(): Promise<number> {
  const page = await brevo("/contacts/folders?limit=50&offset=0", "GET");
  expectOk(page);
  const existing = firstFolderId(page.json);
  if (existing) return existing;
  const created = await brevo("/contacts/folders", "POST", { name: "ALGO Swamp" });
  expectOk(created);
  const id = campaignIdFromBody(created.json);
  if (!id) throw new BrevoError("missing-list", "Brevo did not return a folder id");
  return Number(id);
}

/**
 * `BREVO_LIST_ID` wins. Otherwise the list named `BREVO_LIST_NAME` (default
 * "Pre-market wire") is reused, or created in the first contact folder.
 */
export function resolveListId(): Promise<number> {
  assertServer();
  const configured = process.env.BREVO_LIST_ID;
  if (configured?.trim()) {
    const id = parseBrevoId(configured);
    if (!id) throw new BrevoError("missing-list", "BREVO_LIST_ID is not a numeric id");
    return Promise.resolve(id);
  }
  if (!listTask) {
    listTask = findOrCreateList().catch((error: unknown) => {
      listTask = null;
      throw error;
    });
  }
  return listTask;
}

async function findOrCreateTemplate(): Promise<number> {
  const limit = 50;
  for (let offset = 0; offset < 500; offset += limit) {
    const page = await brevo(`/smtp/templates?limit=${limit}&offset=${offset}`, "GET");
    expectOk(page);
    const found = templateIdByName(page.json, DOI_TEMPLATE_NAME);
    if (found) return found;
    const info = collectionPage(page.json, "templates");
    if (info.length < limit || (info.count !== null && offset + info.length >= info.count)) break;
  }
  const created = await brevo("/smtp/templates", "POST", {
    ...doiTemplateFields(),
    sender: senderFromEnv(),
  });
  expectOk(created);
  const id = campaignIdFromBody(created.json);
  if (!id) throw new BrevoError("brevo-error", "Brevo did not return a template id");
  return Number(id);
}

/** `BREVO_DOI_TEMPLATE_ID` wins. Otherwise find or create the named confirmation template. */
export function resolveDoiTemplateId(): Promise<number> {
  assertServer();
  const configured = process.env.BREVO_DOI_TEMPLATE_ID;
  if (configured?.trim()) {
    const id = parseBrevoId(configured);
    if (!id) throw new BrevoError("brevo-error", "BREVO_DOI_TEMPLATE_ID is not a numeric id");
    return Promise.resolve(id);
  }
  if (!templateTask) {
    templateTask = findOrCreateTemplate().catch((error: unknown) => {
      templateTask = null;
      throw error;
    });
  }
  return templateTask;
}

async function readContact(email: string, listId: number): Promise<BrevoContactState | null> {
  const response = await brevo(`/contacts/${encodeURIComponent(email)}`, "GET");
  if (response.status === 404) return null;
  expectOk(response);
  const contact = contactFromBody(response.json, listId);
  if (!contact) throw new BrevoError("brevo-error", "Brevo contact was not readable");
  return contact;
}

function alreadyExists(response: BrevoResponse): boolean {
  if (response.status !== 400) return false;
  const note = brevoErrorNote(response.status, response.text).toLowerCase();
  return note.includes("already exist") || note.includes("duplicate");
}

/**
 * Add one address to the wire list. New addresses get Brevo's double opt-in
 * email. An address already on the list, and not unsubscribed, is left as-is.
 */
export async function subscribeWireContact(email: string): Promise<WireSubscribeResult> {
  try {
    assertServer();
    const listId = await resolveListId();
    const existing = await readContact(email, listId);
    if (existing?.onList && !existing.blacklisted) return { ok: true, confirm: false };
    if (existing && !existing.blacklisted) {
      const updated = await brevo("/contacts", "POST", {
        email,
        listIds: [listId],
        updateEnabled: true,
      });
      expectOk(updated);
      return { ok: true, confirm: false };
    }
    const templateId = await resolveDoiTemplateId();
    const created = await brevo(
      "/contacts/doubleOptinConfirmation",
      "POST",
      brevoDoiPayload({ email, listId, templateId }),
    );
    if (created.status >= 200 && created.status < 300) return { ok: true, confirm: true };
    if (!existing && alreadyExists(created)) return { ok: true, confirm: true };
    throw new BrevoError("brevo-error", brevoErrorNote(created.status, created.text));
  } catch (error) {
    const note = error instanceof BrevoError ? (error.note ?? error.reason) : "brevo-error";
    console.log(`[wire-subscribe] fail ${note}`);
    return { ok: false };
  }
}

async function deleteCampaign(campaignId: string): Promise<boolean> {
  try {
    const response = await brevo(`/emailCampaigns/${campaignId}`, "DELETE");
    if (response.status >= 200 && response.status < 300) return true;
    console.log(
      `[premarket-wire] fail delete campaign ${campaignId}: ${brevoErrorNote(response.status, response.text)}`,
    );
    return false;
  } catch (error) {
    const note = error instanceof BrevoError ? (error.note ?? error.reason) : "delete failed";
    console.log(`[premarket-wire] fail delete campaign ${campaignId}: ${note}`);
    return false;
  }
}

export async function sendListCampaign(input: {
  name: string;
  subject: string;
  htmlContent: string;
  previewText: string;
}): Promise<{ campaignId: string; recipients: number }> {
  assertServer();
  const listId = await resolveListId();
  const list = await brevo(`/contacts/lists/${listId}`, "GET");
  if (list.status === 404) throw new BrevoError("missing-list", "brevo-status=404; list-not-found");
  expectOk(list);
  const count = subscriberCountFromList(list.json);
  if (count === null) {
    throw new BrevoError("brevo-error", "Brevo list did not include a subscriber count");
  }
  const block = listSendBlock(count);
  if (block === "empty-list") throw new BrevoError("empty-list", "recipients=0");
  if (block === "over-daily-cap") {
    throw new BrevoError("over-daily-cap", `recipients=${count}; cap=${BREVO_DAILY_CAP}`);
  }
  const created = await brevo(
    "/emailCampaigns",
    "POST",
    brevoCampaignPayload({ ...input, listId, sender: senderFromEnv() }),
  );
  expectOk(created);
  const campaignId = campaignIdFromBody(created.json);
  if (!campaignId) throw new BrevoError("brevo-error", "Brevo did not return a campaign id");
  try {
    const sent = await brevo(`/emailCampaigns/${campaignId}/sendNow`, "POST");
    expectOk(sent);
  } catch (error) {
    await deleteCampaign(campaignId);
    throw error;
  }
  return { campaignId, recipients: count };
}

/**
 * Create a draft, send it to one address with Brevo's test-send, then delete the draft
 * so it cannot be sent to the list. Does not check the daily list cap.
 */
export async function sendTestCampaign(input: {
  to: string;
  name: string;
  subject: string;
  htmlContent: string;
  previewText: string;
}): Promise<{ campaignId: string; deleted: boolean }> {
  assertServer();
  const listId = await resolveListId();
  const { to, ...campaign } = input;
  const created = await brevo(
    "/emailCampaigns",
    "POST",
    brevoCampaignPayload({ ...campaign, listId, sender: senderFromEnv() }),
  );
  expectOk(created);
  const campaignId = campaignIdFromBody(created.json);
  if (!campaignId) throw new BrevoError("brevo-error", "Brevo did not return a campaign id");
  try {
    const test = await brevo(`/emailCampaigns/${campaignId}/sendTest`, "POST", { emailTo: [to] });
    expectOk(test);
  } catch (error) {
    await deleteCampaign(campaignId);
    throw error;
  }
  const deleted = await deleteCampaign(campaignId);
  return { campaignId, deleted };
}
