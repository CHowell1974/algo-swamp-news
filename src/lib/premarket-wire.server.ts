import { getSql } from "@/lib/db";
import { loadPublicTape } from "@/lib/news.functions";
import {
  blocksAnotherSend,
  etParts,
  gateSend,
  kitBroadcastPayload,
  tapeIsFresh,
  wireDescription,
  wireEmailFragment,
  wirePreviewDocument,
  wirePreviewText,
  wireRss,
  wireSubject,
} from "@/lib/wire-email";

const KIT_BROADCASTS = "https://api.kit.com/v4/broadcasts";

export type WireRun = {
  ok: boolean;
  action: "sent" | "dry_run" | "skipped";
  reason: string;
  tradingDay: string;
  subject: string | null;
};

export async function renderWirePreview(
  now = new Date(),
): Promise<{ status: number; html: string }> {
  const tape = await loadPublicTape();
  if (!tape.ok || tape.stories.length === 0) {
    return {
      status: 503,
      html: `<!doctype html><html><body style="margin:0;padding:24px;background:#0c1410;color:#e8f2e4;font-family:Arial,sans-serif;">The wire is empty right now.</body></html>`,
    };
  }
  return { status: 200, html: wirePreviewDocument(tape.stories, etParts(now)) };
}

export async function renderWireFeed(now = new Date()): Promise<{ status: number; xml: string }> {
  const tape = await loadPublicTape();
  if (!tape.ok || tape.stories.length === 0) {
    return { status: 503, xml: wireRss([], now) };
  }
  return { status: 200, xml: wireRss(tape.stories, now) };
}

export async function runPremarketWire(now = new Date()): Promise<WireRun> {
  const gate = gateSend(now);
  if (!gate.ok) {
    console.log(`[premarket-wire] skip ${gate.tradingDay}: ${gate.reason}`);
    return {
      ok: true,
      action: "skipped",
      reason: gate.reason,
      tradingDay: gate.tradingDay,
      subject: null,
    };
  }

  const { parts } = gate;
  const tradingDay = parts.ymd;
  const tape = await loadPublicTape();
  if (!tape.ok) {
    console.log(`[premarket-wire] skip ${tradingDay}: wire-unavailable`);
    return { ok: false, action: "skipped", reason: "wire-unavailable", tradingDay, subject: null };
  }
  if (!tapeIsFresh(tape.stories, now)) {
    console.log(`[premarket-wire] skip ${tradingDay}: lines-not-fresh`);
    await noteSkip(tradingDay, "lines-not-fresh");
    return { ok: true, action: "skipped", reason: "lines-not-fresh", tradingDay, subject: null };
  }

  const subject = wireSubject(parts, tape.stories[0]?.title ?? "Markets");
  const claimed = await claimDay(tradingDay, subject);
  if (!claimed) {
    console.log(`[premarket-wire] skip ${tradingDay}: already-recorded`);
    return { ok: true, action: "skipped", reason: "already-recorded", tradingDay, subject };
  }

  if (process.env.KIT_SEND_ENABLED !== "true") {
    console.log(`[premarket-wire] dry-run ${tradingDay}: ${subject}`);
    await finish(tradingDay, "dry_run", null, "KIT_SEND_ENABLED is not true");
    return { ok: true, action: "dry_run", reason: "send-disabled", tradingDay, subject };
  }

  const apiKey = process.env.KIT_API_KEY;
  if (!apiKey) {
    console.log(`[premarket-wire] fail ${tradingDay}: KIT_API_KEY missing`);
    await finish(tradingDay, "failed", null, "KIT_API_KEY missing");
    return { ok: false, action: "skipped", reason: "missing-api-key", tradingDay, subject };
  }

  try {
    const broadcastId = await createKitBroadcast(apiKey, {
      subject,
      content: wireEmailFragment(tape.stories, parts),
      description: wireDescription(parts),
      previewText: wirePreviewText(),
      now,
    });
    await finish(tradingDay, "sent", broadcastId, null);
    console.log(`[premarket-wire] sent ${tradingDay} broadcast ${broadcastId}`);
    return { ok: true, action: "sent", reason: "broadcast-created", tradingDay, subject };
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Kit request failed";
    console.log(`[premarket-wire] fail ${tradingDay}: ${detail}`);
    await finish(tradingDay, "failed", null, detail.slice(0, 500));
    return { ok: false, action: "skipped", reason: "kit-error", tradingDay, subject };
  }
}

async function claimDay(tradingDay: string, subject: string): Promise<boolean> {
  const sql = await getSql();
  const inserted = await sql<{ trading_day: string }>`
    insert into wire_sends (trading_day, status, subject)
    values (${tradingDay}::date, 'pending', ${subject})
    on conflict (trading_day) do nothing
    returning trading_day::text
  `;
  if (inserted.length > 0) return true;

  const rows = await sql<{ status: string }>`
    select status from wire_sends where trading_day = ${tradingDay}::date
  `;
  const status = rows[0]?.status ?? null;
  if (blocksAnotherSend(status)) return false;

  const retried = await sql<{ trading_day: string }>`
    update wire_sends
    set status = 'pending', subject = ${subject}, detail = null, broadcast_id = null, updated_at = now()
    where trading_day = ${tradingDay}::date and status = 'failed'
    returning trading_day::text
  `;
  return retried.length > 0;
}

async function noteSkip(tradingDay: string, reason: string): Promise<void> {
  const sql = await getSql();
  await sql`
    insert into wire_sends (trading_day, status, detail)
    values (${tradingDay}::date, 'skipped', ${reason})
    on conflict (trading_day) do update
      set status = 'skipped', detail = excluded.detail, updated_at = now()
      where wire_sends.status = 'failed'
  `;
}

async function finish(
  tradingDay: string,
  status: "sent" | "dry_run" | "failed",
  broadcastId: string | null,
  detail: string | null,
): Promise<void> {
  const sql = await getSql();
  await sql`
    update wire_sends
    set status = ${status}, broadcast_id = ${broadcastId}, detail = ${detail}, updated_at = now()
    where trading_day = ${tradingDay}::date
  `;
}

async function createKitBroadcast(
  apiKey: string,
  input: { subject: string; content: string; description: string; previewText: string; now: Date },
): Promise<string> {
  const res = await fetch(KIT_BROADCASTS, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "X-Kit-Api-Key": apiKey,
    },
    body: JSON.stringify(kitBroadcastPayload(input)),
    signal: AbortSignal.timeout(20_000),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Kit ${res.status}: ${text.slice(0, 300)}`);
  let broadcastId: unknown;
  try {
    broadcastId = (JSON.parse(text) as { broadcast?: { id?: unknown } }).broadcast?.id;
  } catch {
    throw new Error("Kit returned a body that was not JSON");
  }
  if (broadcastId === undefined || broadcastId === null || broadcastId === "") {
    throw new Error("Kit did not return a broadcast id");
  }
  return String(broadcastId);
}
