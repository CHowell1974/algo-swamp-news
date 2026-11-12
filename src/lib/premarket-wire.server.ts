import { BrevoError, sendListCampaign, sendTestCampaign } from "@/lib/brevo.server";
import { wireSendEnabled } from "@/lib/brevo";
import { getSql } from "@/lib/db";
import { loadPublicTape } from "@/lib/news.functions";
import { OPEN_TAPE } from "@/lib/plans";
import {
  blocksAnotherSend,
  etParts,
  FRESH_HOURS,
  freshCount,
  gateSend,
  safeCronSchedule,
  tapeIsFresh,
  wireCampaignDocument,
  wireDescription,
  wirePreviewDocument,
  wirePreviewText,
  wireRss,
  wireSubject,
  wireTraceDetail,
  type EtParts,
} from "@/lib/wire-email";

export type WireRun = {
  ok: boolean;
  action: "sent" | "dry_run" | "skipped" | "test";
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

export type WireSource = { method?: string | null; schedule?: string | null };

type Executed = { run: WireRun; note: string | null };

function done(run: WireRun, note: string | null = null): Executed {
  return { run, note };
}

export async function recordUnauthorizedWire(now = new Date()): Promise<void> {
  const parts = etParts(now);
  await persistWireRun(
    now,
    { ok: true, action: "skipped", reason: "unauthorized", tradingDay: parts.ymd, subject: null },
    undefined,
    null,
  );
}

export async function runPremarketWire(now = new Date(), source?: WireSource): Promise<WireRun> {
  const executed = await executePremarketWire(now);
  await persistWireRun(now, executed.run, source, executed.note);
  return executed.run;
}

async function persistWireRun(
  now: Date,
  run: WireRun,
  source: WireSource | undefined,
  note: string | null,
): Promise<void> {
  const method = source?.method === "POST" ? "POST" : source?.method === "GET" ? "GET" : null;
  const schedule = safeCronSchedule(source?.schedule);
  const detail = wireTraceDetail([
    method ? `method=${method}` : null,
    schedule ? `schedule=${schedule}` : null,
    note,
  ]);
  try {
    const sql = await getSql();
    await sql`
      insert into wire_runs (trading_day, et_clock, action, reason, detail)
      values (${run.tradingDay}::date, ${etClock(etParts(now))}, ${run.action}, ${run.reason}, ${detail})
    `;
  } catch {
    console.log("[premarket-wire] trace-failed");
  }
}

async function executePremarketWire(now: Date): Promise<Executed> {
  const gate = gateSend(now);
  const clock = etClock(gate.ok ? gate.parts : etParts(now));
  if (!gate.ok) {
    console.log(`[premarket-wire] skip ${gate.tradingDay} ${clock} ET: ${gate.reason}`);
    return done({
      ok: true,
      action: "skipped",
      reason: gate.reason,
      tradingDay: gate.tradingDay,
      subject: null,
    });
  }

  const { parts } = gate;
  try {
    return await deliverWire(parts, now, clock);
  } catch (error) {
    const detail = errorDetail(error, "wire failed");
    console.log(`[premarket-wire] fail ${parts.ymd} ${clock} ET: ${detail}`);
    return done(
      {
        ok: false,
        action: "skipped",
        reason: "wire-error",
        tradingDay: parts.ymd,
        subject: null,
      },
      detail,
    );
  }
}

async function deliverWire(parts: EtParts, now: Date, clock: string): Promise<Executed> {
  const tradingDay = parts.ymd;
  const tape = await loadPublicTape();
  if (!tape.ok) {
    console.log(`[premarket-wire] skip ${tradingDay} ${clock} ET: wire-unavailable`);
    return done({
      ok: false,
      action: "skipped",
      reason: "wire-unavailable",
      tradingDay,
      subject: null,
    });
  }
  if (!tapeIsFresh(tape.stories, now)) {
    const lines = tape.stories.slice(0, OPEN_TAPE);
    const fresh = freshCount(lines, now);
    console.log(
      `[premarket-wire] skip ${tradingDay} ${clock} ET: lines-not-fresh (${fresh}/${lines.length} within ${FRESH_HOURS}h)`,
    );
    return done(
      { ok: true, action: "skipped", reason: "lines-not-fresh", tradingDay, subject: null },
      `fresh=${fresh}/${lines.length}`,
    );
  }

  const subject = wireSubject(parts, tape.stories[0]?.title ?? "Markets");
  if (!wireSendEnabled(process.env.BREVO_SEND_ENABLED)) {
    console.log(`[premarket-wire] dry-run ${tradingDay} ${clock} ET: ${subject}`);
    return done({ ok: true, action: "dry_run", reason: "send-disabled", tradingDay, subject });
  }

  if (!process.env.BREVO_API_KEY?.trim()) {
    console.log(`[premarket-wire] fail ${tradingDay} ${clock} ET: BREVO_API_KEY missing`);
    return done({ ok: false, action: "skipped", reason: "missing-api-key", tradingDay, subject });
  }

  const claim = await claimDay(tradingDay, subject);
  if (!claim.claimed) {
    console.log(
      `[premarket-wire] skip ${tradingDay} ${clock} ET: already-recorded (${claim.status ?? "missing"})`,
    );
    return done(
      { ok: true, action: "skipped", reason: "already-recorded", tradingDay, subject },
      `row=${claim.status ?? "missing"}`,
    );
  }

  let campaignId: string;
  let recipients = 0;
  try {
    const sent = await sendListCampaign({
      name: wireDescription(parts),
      subject,
      htmlContent: wireCampaignDocument(tape.stories, parts),
      previewText: wirePreviewText(),
    });
    campaignId = sent.campaignId;
    recipients = sent.recipients;
  } catch (error) {
    const reason = error instanceof BrevoError ? error.reason : "brevo-error";
    const note =
      error instanceof BrevoError ? error.note : errorDetail(error, "Brevo request failed");
    console.log(`[premarket-wire] fail ${tradingDay} ${clock} ET: ${note ?? reason}`);
    const released = await releaseClaimQuiet(tradingDay);
    return done(
      { ok: false, action: "skipped", reason, tradingDay, subject },
      [note, released].filter(Boolean).join("; ") || null,
    );
  }

  try {
    await markSent(tradingDay, campaignId);
  } catch (error) {
    const detail = errorDetail(error, "could not record the send");
    console.log(
      `[premarket-wire] fail ${tradingDay} ${clock} ET: campaign ${campaignId} sent, record failed: ${detail}`,
    );
    return done(
      { ok: false, action: "skipped", reason: "record-failed", tradingDay, subject },
      `campaign=${campaignId}`,
    );
  }

  console.log(
    `[premarket-wire] sent ${tradingDay} ${clock} ET campaign ${campaignId} recipients=${recipients}`,
  );
  return done(
    { ok: true, action: "sent", reason: "campaign-sent", tradingDay, subject },
    `campaign=${campaignId}; recipients=${recipients}`,
  );
}

/**
 * Send the current wire to one address. This does not write `wire_sends`, so it
 * cannot take the day's list send. The daily send switch does not apply here.
 */
export async function runPremarketWireTest(to: string, now = new Date()): Promise<WireRun> {
  const parts = etParts(now);
  const executed = await executeWireTest(to, parts, now);
  await persistWireRun(now, executed.run, undefined, executed.note);
  return executed.run;
}

async function executeWireTest(to: string, parts: EtParts, now: Date): Promise<Executed> {
  const tradingDay = parts.ymd;
  if (!process.env.BREVO_API_KEY?.trim()) {
    console.log(`[premarket-wire] test fail ${tradingDay}: BREVO_API_KEY missing`);
    return done({
      ok: false,
      action: "test",
      reason: "missing-api-key",
      tradingDay,
      subject: null,
    });
  }
  const tape = await loadPublicTape();
  if (!tape.ok || tape.stories.length === 0) {
    console.log(`[premarket-wire] test fail ${tradingDay}: wire-unavailable`);
    return done({
      ok: false,
      action: "test",
      reason: "wire-unavailable",
      tradingDay,
      subject: null,
    });
  }
  const subject = wireSubject(parts, tape.stories[0]?.title ?? "Markets");
  try {
    const sent = await sendTestCampaign({
      to,
      name: `TEST pre-market wire ${parts.ymd} ${now.toISOString()}`,
      subject,
      htmlContent: wireCampaignDocument(tape.stories, parts),
      previewText: wirePreviewText(),
    });
    const note = `campaign=${sent.campaignId}; deleted=${sent.deleted ? 1 : 0}`;
    if (!sent.deleted) {
      console.log(
        `[premarket-wire] test fail ${tradingDay}: campaign ${sent.campaignId} sent, delete failed`,
      );
    } else {
      console.log(`[premarket-wire] test sent ${tradingDay} campaign ${sent.campaignId}`);
    }
    return done(
      {
        ok: sent.deleted,
        action: "test",
        reason: sent.deleted ? "sent" : "delete-failed",
        tradingDay,
        subject,
      },
      note,
    );
  } catch (error) {
    const reason = error instanceof BrevoError ? error.reason : "brevo-error";
    const note =
      error instanceof BrevoError ? error.note : errorDetail(error, "Brevo request failed");
    console.log(`[premarket-wire] test fail ${tradingDay}: ${note ?? reason}`);
    return done({ ok: false, action: "test", reason, tradingDay, subject }, note);
  }
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

async function releaseClaimQuiet(tradingDay: string): Promise<string | null> {
  try {
    await releaseClaim(tradingDay);
    return null;
  } catch (error) {
    const detail = errorDetail(error, "could not release the day");
    console.log(`[premarket-wire] fail ${tradingDay}: release ${detail}`);
    return "release-failed";
  }
}
