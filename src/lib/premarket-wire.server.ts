import { getSql } from "@/lib/db";
import { loadPublicTape } from "@/lib/news.functions";
import { OPEN_TAPE } from "@/lib/plans";
import {
  blocksAnotherSend,
  etParts,
  FRESH_HOURS,
  freshCount,
  gateSend,
  kitBroadcastPayload,
  tapeIsFresh,
  wireDescription,
  wireEmailFragment,
  wirePreviewDocument,
  wirePreviewText,
  wireRss,
  wireSubject,
  type EtParts,
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

function etClock(parts: Pick<EtParts, "hour" | "minute">): string {
  return `${String(parts.hour).padStart(2, "0")}:${String(parts.minute).padStart(2, "0")}`;
}

function errorDetail(error: unknown, fallback: string): string {
  const message = error instanceof Error ? error.message : fallback;
  return message.slice(0, 300);
}

export async function runPremarketWire(now = new Date()): Promise<WireRun> {
  const gate = gateSend(now);
  const clock = etClock(gate.ok ? gate.parts : etParts(now));
  if (!gate.ok) {
    console.log(`[premarket-wire] skip ${gate.tradingDay} ${clock} ET: ${gate.reason}`);
    return {
      ok: true,
      action: "skipped",
      reason: gate.reason,
      tradingDay: gate.tradingDay,
      subject: null,
    };
  }

  const { parts } = gate;
  try {
    return await deliverWire(parts, now, clock);
  } catch (error) {
    const detail = errorDetail(error, "wire failed");
    console.log(`[premarket-wire] fail ${parts.ymd} ${clock} ET: ${detail}`);
    return {
      ok: false,
      action: "skipped",
      reason: "wire-error",
      tradingDay: parts.ymd,
      subject: null,
    };
  }
}

async function deliverWire(parts: EtParts, now: Date, clock: string): Promise<WireRun> {
  const tradingDay = parts.ymd;
  const tape = await loadPublicTape();
  if (!tape.ok) {
    console.log(`[premarket-wire] skip ${tradingDay} ${clock} ET: wire-unavailable`);
    return { ok: false, action: "skipped", reason: "wire-unavailable", tradingDay, subject: null };
  }
  if (!tapeIsFresh(tape.stories, now)) {
    const lines = tape.stories.slice(0, OPEN_TAPE);
    const fresh = freshCount(lines, now);
    console.log(
      `[premarket-wire] skip ${tradingDay} ${clock} ET: lines-not-fresh (${fresh}/${lines.length} within ${FRESH_HOURS}h)`,
    );
    return { ok: true, action: "skipped", reason: "lines-not-fresh", tradingDay, subject: null };
  }

  const subject = wireSubject(parts, tape.stories[0]?.title ?? "Markets");
  if (process.env.KIT_SEND_ENABLED !== "true") {
    console.log(`[premarket-wire] dry-run ${tradingDay} ${clock} ET: ${subject}`);
    return { ok: true, action: "dry_run", reason: "send-disabled", tradingDay, subject };
  }

  const apiKey = process.env.KIT_API_KEY;
  if (!apiKey) {
    console.log(`[premarket-wire] fail ${tradingDay} ${clock} ET: KIT_API_KEY missing`);
    return { ok: false, action: "skipped", reason: "missing-api-key", tradingDay, subject };
  }

  const claim = await claimDay(tradingDay, subject);
  if (!claim.claimed) {
    console.log(
      `[premarket-wire] skip ${tradingDay} ${clock} ET: already-recorded (${claim.status ?? "missing"})`,
    );
    return { ok: true, action: "skipped", reason: "already-recorded", tradingDay, subject };
  }

  let broadcastId: string;
  try {
    broadcastId = await createKitBroadcast(apiKey, {
      subject,
      content: wireEmailFragment(tape.stories, parts),
      description: wireDescription(parts),
      previewText: wirePreviewText(),
      now,
    });
  } catch (error) {
    const detail = errorDetail(error, "Kit request failed");
    console.log(`[premarket-wire] fail ${tradingDay} ${clock} ET: ${detail}`);
    await releaseClaim(tradingDay);
    return { ok: false, action: "skipped", reason: "kit-error", tradingDay, subject };
  }

  try {
    await markSent(tradingDay, broadcastId);
  } catch (error) {
    const detail = errorDetail(error, "could not record the send");
    console.log(
      `[premarket-wire] fail ${tradingDay} ${clock} ET: broadcast ${broadcastId} created, record failed: ${detail}`,
    );
    return { ok: false, action: "skipped", reason: "record-failed", tradingDay, subject };
  }

  console.log(`[premarket-wire] sent ${tradingDay} ${clock} ET broadcast ${broadcastId}`);
  return { ok: true, action: "sent", reason: "broadcast-created", tradingDay, subject };
}

async function claimDay(
  tradingDay: string,
  subject: string,
): Promise<{ claimed: boolean; status: string | null }> {
  const sql = await getSql();
  const inserted = await sql<{ trading_day: string }>`
    insert into wire_sends (trading_day, status, subject)
    values (${tradingDay}::date, 'pending', ${subject})
    on conflict (trading_day) do nothing
    returning trading_day::text
  `;
  if (inserted.length > 0) return { claimed: true, status: "pending" };

  const rows = await sql<{ status: string }>`
    select status from wire_sends where trading_day = ${tradingDay}::date
  `;
  const status = rows[0]?.status ?? null;
  if (!status || blocksAnotherSend(status)) return { claimed: false, status };

  const retried = await sql<{ trading_day: string }>`
    update wire_sends
    set status = 'pending', subject = ${subject}, detail = null, broadcast_id = null, updated_at = now()
    where trading_day = ${tradingDay}::date and status = ${status}
    returning trading_day::text
  `;
  return { claimed: retried.length > 0, status };
}

async function markSent(tradingDay: string, broadcastId: string): Promise<void> {
  const sql = await getSql();
  await sql`
    update wire_sends
    set status = 'sent', broadcast_id = ${broadcastId}, detail = null, updated_at = now()
    where trading_day = ${tradingDay}::date and status = 'pending'
  `;
}

async function releaseClaim(tradingDay: string): Promise<void> {
  const sql = await getSql();
  await sql`
    delete from wire_sends
    where trading_day = ${tradingDay}::date and status = 'pending'
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
