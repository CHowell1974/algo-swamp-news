import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { cronAuthorized } from "./cron-auth.ts";
import type { Story } from "./scan.ts";
import {
  blocksAnotherSend,
  DESK_URL,
  escapeHtml,
  freshCount,
  gateSend,
  isNyseHoliday,
  safeCronSchedule,
  tapeIsFresh,
  BREVO_UNSUBSCRIBE_HREF,
  wireCampaignDocument,
  wireEmailFragment,
  wireRss,
  wireSubject,
  wireTraceDetail,
  type EtParts,
} from "./wire-email.ts";

function story(partial: Partial<Story> & Pick<Story, "title" | "publishedAt">): Story {
  return {
    id: partial.id ?? partial.title,
    title: partial.title,
    url: partial.url ?? "https://news.example/story",
    source: partial.source ?? "Desk",
    publishedAt: partial.publishedAt,
    lanes: partial.lanes ?? ["markets"],
    tickers: partial.tickers ?? [],
    heat: partial.heat ?? 70,
    tone: partial.tone ?? "hot",
    tags: partial.tags ?? [],
    why: partial.why ?? "",
  };
}

const parts: EtParts = {
  year: 2026,
  month: 10,
  day: 22,
  hour: 8,
  minute: 30,
  weekday: 4,
  ymd: "2026-10-22",
  label: "Thu, Oct 22",
};

describe("gateSend", () => {
  it("accepts 7:00–9:20am Eastern and rejects the minutes on either side", () => {
    const open = gateSend(new Date("2026-07-15T11:00:00Z"));
    const eight = gateSend(new Date("2026-07-15T12:00:00Z"));
    const last = gateSend(new Date("2026-07-15T13:20:00Z"));
    const after = gateSend(new Date("2026-07-15T13:21:00Z"));
    const before = gateSend(new Date("2026-07-15T10:59:00Z"));
    assert.equal(open.ok, true);
    if (open.ok) {
      assert.equal(open.parts.ymd, "2026-07-15");
      assert.equal(open.parts.hour, 7);
      assert.equal(open.parts.minute, 0);
    }
    assert.equal(eight.ok, true);
    if (eight.ok) {
      assert.equal(eight.parts.hour, 8);
      assert.equal(eight.parts.minute, 0);
    }
    assert.equal(last.ok, true);
    assert.deepEqual(before, {
      ok: false,
      reason: "outside-send-window",
      tradingDay: "2026-07-15",
    });
    assert.deepEqual(after, { ok: false, reason: "outside-send-window", tradingDay: "2026-07-15" });
  });

  it("covers the 7am and 8am hours in both EDT and EST", () => {
    for (let minute = 0; minute < 60; minute += 1) {
      const mm = String(minute).padStart(2, "0");
      // EDT is UTC-4: 11:00 is 7:00am, 12:00 is 8:00am.
      assert.equal(gateSend(new Date(`2026-07-15T11:${mm}:30Z`)).ok, true, `EDT 11:${mm}`);
      assert.equal(gateSend(new Date(`2026-07-15T12:${mm}:30Z`)).ok, true, `EDT 12:${mm}`);
      // EST is UTC-5: 12:00 is 7:00am, 13:00 is 8:00am. 11:00 is 6:00am.
      assert.equal(gateSend(new Date(`2026-01-15T12:${mm}:30Z`)).ok, true, `EST 12:${mm}`);
      assert.equal(gateSend(new Date(`2026-01-15T13:${mm}:30Z`)).ok, true, `EST 13:${mm}`);
      assert.equal(gateSend(new Date(`2026-01-15T11:${mm}:30Z`)).ok, false, `EST 11:${mm}`);
    }
    assert.equal(gateSend(new Date("2026-07-15T13:20:59Z")).ok, true);
    assert.equal(gateSend(new Date("2026-07-15T13:21:00Z")).ok, false);
    assert.equal(gateSend(new Date("2026-01-15T14:20:00Z")).ok, true);
    assert.equal(gateSend(new Date("2026-01-15T14:21:00Z")).ok, false);
  });

  it("follows the DST switch in March and November", () => {
    // Monday after the March start. Eastern is EDT, so 11:00 UTC is 7:00am.
    assert.equal(gateSend(new Date("2026-03-09T10:59:00Z")).ok, false);
    assert.equal(gateSend(new Date("2026-03-09T11:00:00Z")).ok, true);
    assert.equal(gateSend(new Date("2026-03-09T12:59:00Z")).ok, true);
    assert.equal(gateSend(new Date("2026-03-09T13:20:00Z")).ok, true);
    assert.equal(gateSend(new Date("2026-03-09T13:21:00Z")).ok, false);
    // Monday after the November end. Eastern is EST, so 12:00 UTC is 7:00am.
    assert.equal(gateSend(new Date("2026-11-02T11:59:00Z")).ok, false);
    assert.equal(gateSend(new Date("2026-11-02T12:00:00Z")).ok, true);
    assert.equal(gateSend(new Date("2026-11-02T12:59:00Z")).ok, true);
    assert.equal(gateSend(new Date("2026-11-02T13:00:00Z")).ok, true);
    assert.equal(gateSend(new Date("2026-11-02T13:10:00Z")).ok, true);
    assert.equal(gateSend(new Date("2026-11-02T13:59:00Z")).ok, true);
    assert.equal(gateSend(new Date("2026-11-02T14:20:00Z")).ok, true);
    assert.equal(gateSend(new Date("2026-11-02T14:21:00Z")).ok, false);
  });

  it("accepts 8:10am Eastern in both seasons, including the week of Nov 9 2026", () => {
    const edt = gateSend(new Date("2026-07-15T12:10:00Z"));
    const est = gateSend(new Date("2026-11-10T13:10:00Z"));
    assert.equal(edt.ok, true);
    if (edt.ok) {
      assert.equal(edt.parts.hour, 8);
      assert.equal(edt.parts.minute, 10);
    }
    assert.equal(est.ok, true);
    if (est.ok) {
      assert.equal(est.parts.ymd, "2026-11-10");
      assert.equal(est.parts.hour, 8);
      assert.equal(est.parts.minute, 10);
      assert.equal(est.parts.weekday, 2);
    }
    assert.equal(gateSend(new Date("2026-11-06T12:05:00Z")).ok, true);
    assert.equal(gateSend(new Date("2026-11-06T13:10:00Z")).ok, true);
    const monday = gateSend(new Date("2026-11-09T13:10:00Z"));
    assert.equal(monday.ok, true);
    if (monday.ok) {
      assert.equal(monday.parts.ymd, "2026-11-09");
      assert.equal(monday.parts.weekday, 1);
    }
    assert.equal(gateSend(new Date("2026-11-09T12:00:00Z")).ok, true);
    assert.equal(gateSend(new Date("2026-11-10T12:30:00Z")).ok, true);
    assert.equal(gateSend(new Date("2026-11-10T14:21:00Z")).ok, false);
  });

  it("lets both Hobby UTC hours through on Wednesday Nov 11 2026", () => {
    assert.equal(isNyseHoliday("2026-11-11"), false);
    for (const stamp of [
      "2026-11-11T12:00:00Z",
      "2026-11-11T12:59:30Z",
      "2026-11-11T13:00:00Z",
      "2026-11-11T13:10:00Z",
      "2026-11-11T13:59:30Z",
    ]) {
      const gate = gateSend(new Date(stamp));
      assert.equal(gate.ok, true, stamp);
      if (gate.ok) {
        assert.equal(gate.parts.ymd, "2026-11-11");
        assert.equal(gate.parts.weekday, 3);
      }
    }
  });

  it("skips weekends without treating them as a holiday", () => {
    const saturday = gateSend(new Date("2026-07-18T12:30:00Z"));
    assert.deepEqual(saturday, { ok: false, reason: "weekend", tradingDay: "2026-07-18" });
  });
});

describe("NYSE holidays", () => {
  it("matches the 2026 full-day closures, including the observed July 4", () => {
    for (const day of [
      "2026-01-01",
      "2026-01-19",
      "2026-02-16",
      "2026-04-03",
      "2026-05-25",
      "2026-06-19",
      "2026-07-03",
      "2026-09-07",
      "2026-11-26",
      "2026-12-25",
    ]) {
      assert.equal(isNyseHoliday(day), true, day);
    }
    assert.equal(isNyseHoliday("2026-07-04"), false);
    assert.equal(isNyseHoliday("2026-04-02"), false);
    assert.equal(isNyseHoliday("2026-12-24"), false);
  });

  it("catches a New Year's Day observed on the previous December 31", () => {
    assert.equal(isNyseHoliday("2021-12-31"), true);
    const holiday = gateSend(new Date("2026-01-01T13:30:00Z"));
    assert.deepEqual(holiday, { ok: false, reason: "nyse-holiday", tradingDay: "2026-01-01" });
  });
});

describe("freshness", () => {
  const now = new Date("2026-10-22T12:30:00Z");

  it("requires four of the six public lines inside 36 hours", () => {
    const recent = new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString();
    const old = new Date(now.getTime() - 40 * 60 * 60 * 1000).toISOString();
    const lines = [
      story({ title: "a", publishedAt: recent }),
      story({ title: "b", publishedAt: recent }),
      story({ title: "c", publishedAt: recent }),
      story({ title: "d", publishedAt: recent }),
      story({ title: "e", publishedAt: old }),
      story({ title: "f", publishedAt: old }),
    ];
    assert.equal(freshCount(lines, now), 4);
    assert.equal(tapeIsFresh(lines, now), true);
    assert.equal(tapeIsFresh(lines.slice(0, 5), now), false);
    assert.equal(
      tapeIsFresh(
        lines.map((line, index) => (index < 3 ? line : { ...line, publishedAt: old })),
        now,
      ),
      false,
    );
  });
});

describe("email", () => {
  it("builds the subject from the date and the top headline", () => {
    assert.equal(
      wireSubject(parts, "Fed holds rates"),
      "Pre-market wire · Thu, Oct 22: Fed holds rates",
    );
  });

  it("escapes headline markup and links the monthly desk", () => {
    const html = wireEmailFragment(
      [
        story({
          title: `Rates <script>alert("x")</script> & more`,
          url: "https://news.example/a?q=1&z=2",
          source: "Wire",
          publishedAt: "2026-10-22T11:00:00Z",
          heat: 88,
          tone: "hot",
        }),
      ],
      parts,
    );
    assert.match(html, /Thu, Oct 22 · six scored headlines/);
    assert.equal(html.includes("<script>"), false);
    assert.match(html, /Rates &lt;script&gt;/);
    assert.match(html, /q=1&amp;z=2/);
    assert.match(html, new RegExp(DESK_URL.replace(/[?]/g, "\\?")));
    assert.match(html, /Open the full desk · \$29\/mo/);
    assert.match(html, /Hot · 88/);
    assert.equal(escapeHtml(`a<b>"c"`), "a&lt;b&gt;&quot;c&quot;");
  });

  it("adds Brevo's unsubscribe link to the campaign document", () => {
    const html = wireCampaignDocument(
      [story({ title: "Fed holds", publishedAt: "2026-10-22T11:00:00Z" })],
      parts,
    );
    assert.match(html, /Fed holds/);
    assert.match(html, /Thu, Oct 22/);
    assert.equal(html.includes("<script>"), false);
    const href = `href="${BREVO_UNSUBSCRIBE_HREF}"`;
    assert.equal(html.includes(href), true);
    assert.equal(html.split(BREVO_UNSUBSCRIBE_HREF).length, 2);
  });

  it("publishes the same six lines as RSS", () => {
    const xml = wireRss(
      [
        story({
          title: "Oil & gas",
          url: "https://news.example/oil",
          publishedAt: "2026-10-22T11:00:00Z",
          id: "oil-1",
        }),
      ],
      new Date("2026-10-22T12:30:00Z"),
    );
    assert.match(xml, /<title>Oil &amp; gas<\/title>/);
    assert.match(xml, /<link>https:\/\/news.algoswamp.com\/wire.xml<\/link>/);
    assert.match(xml, /<guid isPermaLink="false">oil-1<\/guid>/);
  });
});

describe("idempotency", () => {
  it("closes the day only for a finished send or one already in flight", () => {
    assert.equal(blocksAnotherSend("sent"), true);
    assert.equal(blocksAnotherSend("pending"), true);
    assert.equal(blocksAnotherSend("dry_run"), false);
    assert.equal(blocksAnotherSend("skipped"), false);
    assert.equal(blocksAnotherSend("failed"), false);
    assert.equal(blocksAnotherSend(null), false);
  });
});

describe("schedule", () => {
  it("uses the two Hobby UTC hours and does not also declare a timezone schedule", () => {
    const vercel = JSON.parse(
      readFileSync(new URL("../../vercel.json", import.meta.url), "utf8"),
    ) as {
      crons?: { path: string; schedule: string }[];
      schedules?: unknown;
    };
    assert.equal(vercel.schedules, undefined);
    assert.deepEqual(vercel.crons, [
      { path: "/api/cron/premarket-wire", schedule: "0 12 * * 1-5" },
      { path: "/api/cron/premarket-wire", schedule: "0 13 * * 1-5" },
    ]);
  });
});

describe("wire trace", () => {
  it("keeps a cron expression and drops credential-shaped text", () => {
    assert.equal(safeCronSchedule("0 12 * * 1-5"), "0 12 * * 1-5");
    assert.equal(safeCronSchedule("10 8 * * 1-5"), "10 8 * * 1-5");
    assert.equal(safeCronSchedule("Bearer desk-secret"), null);
    assert.equal(safeCronSchedule("0 12 * * 1-5; KIT_API_KEY=secret"), null);
    const detail = wireTraceDetail([
      "method=GET",
      "schedule=0 12 * * 1-5",
      "Authorization: Bearer desk-secret",
      "key sk_live_abc123",
      "api-key=xkeysib-abc123def456-xyz789",
      "fresh=2/6",
    ]);
    assert.equal(detail?.includes("desk-secret"), false);
    assert.equal(detail?.includes("sk_live_abc123"), false);
    assert.equal(detail?.includes("xkeysib-"), false);
    assert.match(detail ?? "", /method=GET/);
    assert.match(detail ?? "", /schedule=0 12 \* \* 1-5/);
    assert.match(detail ?? "", /bearer \[redacted\]/);
    assert.match(detail ?? "", /fresh=2\/6/);
  });
});

describe("cron auth", () => {
  it("compares the bearer token and rejects a missing secret", () => {
    const previous = process.env.CRON_SECRET;
    process.env.CRON_SECRET = "desk-secret";
    const ok = cronAuthorized(
      new Request("https://news.algoswamp.com/api/cron/premarket-wire", {
        headers: { authorization: "Bearer desk-secret" },
      }),
    );
    const wrong = cronAuthorized(
      new Request("https://news.algoswamp.com/api/cron/premarket-wire", {
        headers: { authorization: "Bearer other" },
      }),
    );
    const bare = cronAuthorized(new Request("https://news.algoswamp.com/api/cron/premarket-wire"));
    delete process.env.CRON_SECRET;
    const unset = cronAuthorized(
      new Request("https://news.algoswamp.com/api/cron/premarket-wire", {
        headers: { authorization: "Bearer desk-secret" },
      }),
    );
    if (previous === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = previous;
    assert.equal(ok, true);
    assert.equal(wrong, false);
    assert.equal(bare, false);
    assert.equal(unset, false);
  });
});
