import assert from "node:assert/strict";
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
  kitBroadcastPayload,
  tapeIsFresh,
  wireEmailFragment,
  wireRss,
  wireSubject,
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
  it("accepts 12:30 UTC during EDT and rejects the 13:30 UTC slot", () => {
    const open = gateSend(new Date("2026-07-15T12:30:00Z"));
    const late = gateSend(new Date("2026-07-15T13:30:00Z"));
    assert.equal(open.ok, true);
    if (open.ok) assert.equal(open.parts.ymd, "2026-07-15");
    assert.deepEqual(late, { ok: false, reason: "outside-send-window", tradingDay: "2026-07-15" });
  });

  it("accepts 13:30 UTC during EST and rejects the 12:30 UTC slot", () => {
    const early = gateSend(new Date("2026-01-15T12:30:00Z"));
    const open = gateSend(new Date("2026-01-15T13:30:00Z"));
    assert.deepEqual(early, { ok: false, reason: "outside-send-window", tradingDay: "2026-01-15" });
    assert.equal(open.ok, true);
    if (open.ok) {
      assert.equal(open.parts.hour, 8);
      assert.equal(open.parts.minute, 30);
    }
  });

  it("follows the DST switch in March and November", () => {
    assert.equal(gateSend(new Date("2026-03-09T12:30:00Z")).ok, true);
    assert.equal(gateSend(new Date("2026-03-09T13:30:00Z")).ok, false);
    assert.equal(gateSend(new Date("2026-11-02T12:30:00Z")).ok, false);
    assert.equal(gateSend(new Date("2026-11-02T13:30:00Z")).ok, true);
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

  it("schedules a private broadcast to the whole list", () => {
    const now = new Date("2026-10-22T12:30:00Z");
    const payload = kitBroadcastPayload({
      subject: "Pre-market wire · Thu, Oct 22: Fed holds",
      content: "<p>hi</p>",
      description: "Pre-market wire 2026-10-22",
      previewText: "Six scored headlines before the open.",
      now,
    });
    assert.equal(payload.public, false);
    assert.equal(payload.email_address, "chris@algoswamp.com");
    assert.deepEqual(payload.subscriber_filter, []);
    assert.equal(payload.send_at, "2026-10-22T12:31:00.000Z");
    assert.equal(payload.content, "<p>hi</p>");
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
  it("blocks a second send after sent, dry-run, skip, or an in-flight pending row", () => {
    assert.equal(blocksAnotherSend("sent"), true);
    assert.equal(blocksAnotherSend("dry_run"), true);
    assert.equal(blocksAnotherSend("skipped"), true);
    assert.equal(blocksAnotherSend("pending"), true);
    assert.equal(blocksAnotherSend("failed"), false);
    assert.equal(blocksAnotherSend(null), false);
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
