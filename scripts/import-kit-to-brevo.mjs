#!/usr/bin/env node
/**
 * One-off copy of existing Kit subscribers into the Brevo pre-market wire list.
 *
 * Does not send a campaign or a confirmation email. People already confirmed
 * on Kit are added as Brevo contacts. Do not run this from CI or against
 * production until you mean to. Pass --apply to write. Without it, the script
 * only counts.
 *
 *   node scripts/import-kit-to-brevo.mjs --csv ./subscribers.csv
 *   node scripts/import-kit-to-brevo.mjs --csv ./subscribers.csv --apply
 *
 * Kit's subscriber export is a CSV with an `email` or `email_address` column.
 * A file of one address per line also works.
 *
 * To read Kit instead, set KIT_API_KEY (the same v4 key the app used to send
 * with). The default read is the active subscribers on the free-wire form
 * (10083135) and the Road Map form (10084236). --all-active reads every active
 * subscriber on the account. If Kit refuses the key, export a CSV and use --csv.
 *
 * --apply also needs BREVO_API_KEY and BREVO_LIST_ID. The list id is the number
 * in the Brevo list URL, or the id the site logged after it created
 * "Pre-market wire". This script does not create a list.
 */
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

export const DEFAULT_FORM_IDS = ["10083135", "10084236"];
const BREVO_IMPORT = "https://api.brevo.com/v3/contacts/import";
const KIT_API = "https://api.kit.com/v4";

export function isImportEmail(value) {
  const email = value.trim();
  if (email.length < 3 || email.length > 254) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function uniqueEmails(values) {
  const seen = new Set();
  const emails = [];
  for (const value of values) {
    const email = value.trim().toLowerCase();
    if (!isImportEmail(email) || seen.has(email)) continue;
    seen.add(email);
    emails.push(email);
  }
  return emails;
}

export function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;
  const src = text.replace(/^\uFEFF/, "");
  for (let index = 0; index < src.length; index += 1) {
    const char = src[index];
    if (quoted) {
      if (char === '"') {
        if (src[index + 1] === '"') {
          cell += '"';
          index += 1;
        } else {
          quoted = false;
        }
      } else {
        cell += char;
      }
      continue;
    }
    if (char === '"') {
      quoted = true;
    } else if (char === ",") {
      row.push(cell);
      cell = "";
    } else if (char === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else if (char !== "\r") {
      cell += char;
    }
  }
  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((line) => line.some((value) => value.trim().length > 0));
}

export function emailsFromCsv(text) {
  const rows = parseCsv(text);
  if (rows.length === 0) return [];
  const header = rows[0].map((value) => value.trim().toLowerCase());
  const emailIndex = header.findIndex(
    (name) => name === "email" || name === "email_address" || name === "email address",
  );
  const start = emailIndex >= 0 ? 1 : 0;
  const index = emailIndex >= 0 ? emailIndex : 0;
  return uniqueEmails(rows.slice(start).map((line) => line[index] ?? ""));
}

export function emailsFromKitPage(body) {
  const subscribers = Array.isArray(body?.subscribers) ? body.subscribers : [];
  const emails = [];
  for (const subscriber of subscribers) {
    const state = typeof subscriber?.state === "string" ? subscriber.state : "active";
    if (state !== "active") continue;
    if (typeof subscriber?.email_address === "string") emails.push(subscriber.email_address);
  }
  const cursor =
    body?.pagination?.has_next_page === true && typeof body.pagination.end_cursor === "string"
      ? body.pagination.end_cursor
      : null;
  return { emails: uniqueEmails(emails), cursor };
}

export function parseArgs(argv) {
  const apply = argv.includes("--apply");
  const allActive = argv.includes("--all-active");
  const help = argv.includes("--help") || argv.includes("-h");
  let csv = null;
  const forms = [];
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === "--csv") csv = argv[index + 1] ?? "";
    if (argv[index] === "--form") forms.push(argv[index + 1] ?? "");
  }
  return { apply, allActive, help, csv, forms };
}

export function selectedFormIds(forms) {
  const ids = forms.length > 0 ? forms : DEFAULT_FORM_IDS;
  if (ids.some((id) => !/^\d+$/.test(id))) {
    throw new Error("Kit form ids must be numeric.");
  }
  return ids;
}

export function batches(emails, size = 100) {
  const chunks = [];
  for (let index = 0; index < emails.length; index += size) {
    chunks.push(emails.slice(index, index + size));
  }
  return chunks;
}

export function parseListId(value) {
  const trimmed = value?.trim() ?? "";
  if (!/^[1-9]\d{0,15}$/.test(trimmed)) return null;
  return Number(trimmed);
}

async function readKitPages(urlForCursor, apiKey, fetchImpl) {
  const emails = [];
  let cursor = null;
  for (let page = 0; page < 200; page += 1) {
    const url = urlForCursor(cursor);
    const response = await fetchImpl(url, {
      headers: { "X-Kit-Api-Key": apiKey, accept: "application/json" },
    });
    const text = await response.text();
    if (!response.ok) {
      const error = new Error(`Kit ${response.status}`);
      error.status = response.status;
      throw error;
    }
    let body;
    try {
      body = JSON.parse(text);
    } catch {
      throw new Error("Kit returned a body that was not JSON");
    }
    const parsed = emailsFromKitPage(body);
    emails.push(...parsed.emails);
    if (!parsed.cursor) break;
    cursor = parsed.cursor;
  }
  return uniqueEmails(emails);
}

export async function loadKitEmails({ apiKey, formIds, allActive, fetchImpl = fetch }) {
  if (allActive) {
    return readKitPages(
      (cursor) => {
        const url = new URL(`${KIT_API}/subscribers`);
        url.searchParams.set("per_page", "1000");
        url.searchParams.set("status", "active");
        if (cursor) url.searchParams.set("after", cursor);
        return url;
      },
      apiKey,
      fetchImpl,
    );
  }
  const emails = [];
  for (const formId of formIds) {
    const page = await readKitPages(
      (cursor) => {
        const url = new URL(`${KIT_API}/forms/${formId}/subscribers`);
        url.searchParams.set("per_page", "1000");
        url.searchParams.set("status", "active");
        url.searchParams.set("slim", "true");
        if (cursor) url.searchParams.set("after", cursor);
        return url;
      },
      apiKey,
      fetchImpl,
    );
    emails.push(...page);
  }
  return uniqueEmails(emails);
}

export async function importToBrevo({ apiKey, listId, emails, fetchImpl = fetch }) {
  const processIds = [];
  for (const chunk of batches(emails)) {
    const response = await fetchImpl(BREVO_IMPORT, {
      method: "POST",
      headers: {
        "api-key": apiKey,
        accept: "application/json",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        listIds: [listId],
        updateExistingContacts: true,
        emptyContactsAttributes: false,
        jsonBody: chunk.map((email) => ({ email })),
      }),
    });
    const text = await response.text();
    if (response.status !== 202 && (response.status < 200 || response.status >= 300)) {
      throw new Error(`Brevo ${response.status} importing a batch of ${chunk.length}`);
    }
    let processId = null;
    try {
      const parsed = JSON.parse(text);
      processId = typeof parsed.processId === "number" ? parsed.processId : null;
    } catch {
      processId = null;
    }
    processIds.push(processId);
  }
  return processIds;
}

function isDirectRun() {
  const entry = process.argv[1];
  if (!entry) return false;
  return import.meta.url === pathToFileURL(resolve(entry)).href;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log("See the comment at the top of scripts/import-kit-to-brevo.mjs");
    return;
  }
  let emails;
  if (args.csv !== null) {
    if (!args.csv) throw new Error("Pass a CSV path after --csv.");
    emails = emailsFromCsv(await readFile(args.csv, "utf8"));
    console.log(`[import-kit-to-brevo] source=csv unique=${emails.length}`);
  } else {
    const apiKey = process.env.KIT_API_KEY?.trim();
    if (!apiKey) {
      throw new Error("Set KIT_API_KEY or pass --csv. No emails were written.");
    }
    const formIds = args.allActive ? [] : selectedFormIds(args.forms);
    try {
      emails = await loadKitEmails({
        apiKey,
        formIds,
        allActive: args.allActive,
      });
    } catch (error) {
      const status = typeof error?.status === "number" ? error.status : 0;
      if (status === 401 || status === 403) {
        throw new Error(
          `Kit ${status}. Export subscribers to a CSV and rerun with --csv. No emails were written.`,
        );
      }
      throw new Error(
        `${error instanceof Error ? error.message : "Kit request failed"}. No emails were written.`,
      );
    }
    console.log(
      `[import-kit-to-brevo] source=${args.allActive ? "kit-account" : `kit-forms ${formIds.join(",")}`} unique=${emails.length}`,
    );
  }
  if (!args.apply) {
    console.log(
      "[import-kit-to-brevo] dry-run. Pass --apply to import. No email is sent and Brevo was not called.",
    );
    return;
  }
  const brevoKey = process.env.BREVO_API_KEY?.trim();
  const listId = parseListId(process.env.BREVO_LIST_ID);
  if (!brevoKey || !listId) {
    throw new Error("Set BREVO_API_KEY and BREVO_LIST_ID before --apply. Nothing was imported.");
  }
  if (emails.length === 0) {
    console.log("[import-kit-to-brevo] nothing to import.");
    return;
  }
  const processIds = await importToBrevo({ apiKey: brevoKey, listId, emails });
  console.log(
    `[import-kit-to-brevo] imported ${emails.length} into list ${listId} processIds=${processIds.join(",")}`,
  );
}

if (isDirectRun()) {
  main().catch((error) => {
    const message = error instanceof Error ? error.message : "import failed";
    console.error(`[import-kit-to-brevo] ${message.replace(/xkeysib-\S+/gi, "[redacted]")}`);
    process.exitCode = 1;
  });
}
