import { formatMoney, OPEN_TAPE, PLANS } from "./plans.ts";
import type { Story } from "./scan.ts";

/** A line counts as fresh when it was published inside this window. */
export const FRESH_HOURS = 36;
/** Send only when at least this many of the public six are fresh. */
export const MIN_FRESH = 4;

export const DESK_URL = "https://news.algoswamp.com/join?plan=monthly";
export const FROM_EMAIL = "chris@algoswamp.com";
export const SITE_URL = "https://news.algoswamp.com";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

export type EtParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  /** 0 = Sunday … 6 = Saturday, in America/New_York. */
  weekday: number;
  /** YYYY-MM-DD in America/New_York. */
  ymd: string;
  /** Short label, e.g. "Thu, Oct 22". */
  label: string;
};

export function etParts(now: Date): EtParts {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    weekday: "short",
    hourCycle: "h23",
  });
  const bag: Record<string, string> = {};
  for (const part of fmt.formatToParts(now)) {
    if (part.type !== "literal") bag[part.type] = part.value;
  }
  let hour = Number(bag.hour);
  if (hour === 24) hour = 0;
  const year = Number(bag.year);
  const month = Number(bag.month);
  const day = Number(bag.day);
  const minute = Number(bag.minute);
  const weekday = WEEKDAYS.indexOf((bag.weekday ?? "").slice(0, 3) as (typeof WEEKDAYS)[number]);
  const ymd = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  const label = `${WEEKDAYS[weekday] ?? "Day"}, ${MONTHS[month - 1] ?? ""} ${day}`;
  return { year, month, day, hour, minute, weekday, ymd, label };
}

/**
 * 8:00–9:20am America/New_York, inclusive of 9:20.
 * Hobby cron fires any time in the scheduled UTC hour, so the window is the
 * whole 8am hour plus a short overlap into 9am.
 */
export function inSendWindow(parts: EtParts): boolean {
  if (parts.hour === 8) return true;
  return parts.hour === 9 && parts.minute <= 20;
}

export function isWeekday(parts: EtParts): boolean {
  return parts.weekday >= 1 && parts.weekday <= 5;
}

/** Anonymous Gregorian computus. Month is 1–12. */
export function easterSunday(year: number): { month: number; day: number } {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return { month, day };
}

function ymd(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function shift(
  year: number,
  month: number,
  day: number,
  delta: number,
): { year: number; month: number; day: number } {
  const dt = new Date(Date.UTC(year, month - 1, day + delta));
  return { year: dt.getUTCFullYear(), month: dt.getUTCMonth() + 1, day: dt.getUTCDate() };
}

function nthWeekday(
  year: number,
  month: number,
  weekday: number,
  n: number,
): { month: number; day: number } {
  const first = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  const day = 1 + ((weekday - first + 7) % 7) + (n - 1) * 7;
  return { month, day };
}

function lastWeekday(year: number, month: number, weekday: number): { month: number; day: number } {
  const lastDate = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const lastDow = new Date(Date.UTC(year, month - 1, lastDate)).getUTCDay();
  const day = lastDate - ((lastDow - weekday + 7) % 7);
  return { month, day };
}

/** Saturday holidays are observed Friday; Sunday holidays are observed Monday. */
function observed(year: number, month: number, day: number): string {
  const dow = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  if (dow === 6) {
    const prev = shift(year, month, day, -1);
    return ymd(prev.year, prev.month, prev.day);
  }
  if (dow === 0) {
    const next = shift(year, month, day, 1);
    return ymd(next.year, next.month, next.day);
  }
  return ymd(year, month, day);
}

/** Full-day NYSE closures for one calendar year. Early closes stay open. */
export function nyseHolidays(year: number): Set<string> {
  const set = new Set<string>();
  for (const [month, day] of [
    [1, 1],
    [6, 19],
    [7, 4],
    [12, 25],
  ] as const) {
    set.add(observed(year, month, day));
  }
  const mlk = nthWeekday(year, 1, 1, 3);
  set.add(ymd(year, mlk.month, mlk.day));
  const presidents = nthWeekday(year, 2, 1, 3);
  set.add(ymd(year, presidents.month, presidents.day));
  const easter = easterSunday(year);
  const goodFriday = shift(year, easter.month, easter.day, -2);
  set.add(ymd(goodFriday.year, goodFriday.month, goodFriday.day));
  const memorial = lastWeekday(year, 5, 1);
  set.add(ymd(year, memorial.month, memorial.day));
  const labor = nthWeekday(year, 9, 1, 1);
  set.add(ymd(year, labor.month, labor.day));
  const thanksgiving = nthWeekday(year, 11, 4, 4);
  set.add(ymd(year, thanksgiving.month, thanksgiving.day));
  return set;
}

const holidayCache = new Map<number, Set<string>>();

export function isNyseHoliday(day: string): boolean {
  const year = Number(day.slice(0, 4));
  for (const candidate of [year - 1, year, year + 1]) {
    let set = holidayCache.get(candidate);
    if (!set) {
      set = nyseHolidays(candidate);
      holidayCache.set(candidate, set);
    }
    if (set.has(day)) return true;
  }
  return false;
}

export type SendGate =
  | { ok: true; parts: EtParts }
  | { ok: false; reason: "weekend" | "nyse-holiday" | "outside-send-window"; tradingDay: string };

/**
 * Weekday, not an NYSE holiday, and inside 8:00–9:20am Eastern.
 * A miss here must not write the once-a-day row: the other UTC hour may be the one that lands in the window.
 */
export function gateSend(now: Date): SendGate {
  const parts = etParts(now);
  if (!isWeekday(parts)) return { ok: false, reason: "weekend", tradingDay: parts.ymd };
  if (isNyseHoliday(parts.ymd)) return { ok: false, reason: "nyse-holiday", tradingDay: parts.ymd };
  if (!inSendWindow(parts))
    return { ok: false, reason: "outside-send-window", tradingDay: parts.ymd };
  return { ok: true, parts };
}

export function freshCount(
  stories: { publishedAt: string }[],
  now: Date,
  hours = FRESH_HOURS,
): number {
  const cutoff = now.getTime() - hours * 60 * 60 * 1000;
  return stories.filter((story) => {
    const published = Date.parse(story.publishedAt);
    return (
      Number.isFinite(published) &&
      published >= cutoff &&
      published <= now.getTime() + 5 * 60 * 1000
    );
  }).length;
}

export function tapeIsFresh(stories: { publishedAt: string }[], now: Date): boolean {
  const lines = stories.slice(0, OPEN_TAPE);
  return lines.length >= OPEN_TAPE && freshCount(lines, now) >= MIN_FRESH;
}

/** A finished send, or one already in flight, closes the day. Anything else can still send. */
export function blocksAnotherSend(status: string | null | undefined): boolean {
  return status === "sent" || status === "pending";
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function clip(text: string, max: number): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max - 1).trimEnd()}…`;
}

export function wireSubject(parts: EtParts, topTitle: string): string {
  const headline = clip(topTitle || "Markets", 80);
  return `Pre-market wire · ${parts.label}: ${headline}`;
}

export function wirePreviewText(): string {
  return "Six scored headlines before the open.";
}

export function wireDescription(parts: EtParts): string {
  return `Pre-market wire ${parts.ymd}`;
}

function toneLabel(tone: Story["tone"]): string {
  if (tone === "hot") return "Hot";
  if (tone === "cold") return "Cold";
  return "Steady";
}

/**
 * HTML fragment for Kit's Classic template. The template wraps this body and adds
 * the unsubscribe link and the postal-address footer. Starting Point templates
 * are not used: the API will not send them unless the body already contains those tags.
 */
export function wireEmailFragment(stories: Story[], parts: EtParts): string {
  const lines = stories.slice(0, OPEN_TAPE);
  const price = formatMoney(PLANS.monthly.price);
  const rows = lines
    .map((story, index) => {
      const title = escapeHtml(story.title);
      const href = escapeHtml(story.url);
      const source = escapeHtml(story.source);
      const heat = escapeHtml(String(story.heat));
      const tone = escapeHtml(toneLabel(story.tone));
      return `<tr>
          <td style="padding:16px 0;border-bottom:1px solid #2a3d32;">
            <div style="font-family:Arial,Helvetica,sans-serif;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:#d6f25c;">${index + 1} · ${tone} · ${heat}</div>
            <a href="${href}" style="font-family:Georgia,'Times New Roman',serif;font-size:20px;line-height:1.35;color:#e8f2e4;text-decoration:none;">${title}</a>
            <div style="font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.4;color:#8ea396;padding-top:4px;">${source}</div>
          </td>
        </tr>`;
    })
    .join("");

  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0c1410;margin:0;padding:0;">
  <tr>
    <td align="center" style="padding:28px 16px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
        <tr>
          <td style="font-family:Arial,Helvetica,sans-serif;font-size:12px;letter-spacing:0.18em;text-transform:uppercase;color:#d6f25c;padding-bottom:10px;">ALGO Swamp</td>
        </tr>
        <tr>
          <td style="font-family:Georgia,'Times New Roman',serif;font-size:32px;line-height:1.15;color:#e8f2e4;padding-bottom:8px;">Pre-market wire</td>
        </tr>
        <tr>
          <td style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.5;color:#8ea396;padding-bottom:8px;">${escapeHtml(parts.label)} · six scored headlines before the open.</td>
        </tr>
        ${rows}
        <tr>
          <td style="padding-top:24px;">
            <a href="${DESK_URL}" style="display:inline-block;background:#d6f25c;color:#0c1410;font-family:Arial,Helvetica,sans-serif;font-size:16px;font-weight:bold;line-height:1;text-decoration:none;padding:14px 18px;border-radius:6px;">Open the full desk · ${price}/mo</a>
          </td>
        </tr>
        <tr>
          <td style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.5;color:#8ea396;padding-top:14px;">The rest of the wire, the night note, and every lane are on the desk plan.</td>
        </tr>
      </table>
    </td>
  </tr>
</table>`;
}

/** Full document for the preview route. Kit receives the fragment, not this wrapper. */
export function wirePreviewDocument(stories: Story[], parts: EtParts): string {
  const subject = wireSubject(parts, stories[0]?.title ?? "Markets");
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background:#0c1410;">
${wireEmailFragment(stories, parts)}
</body>
</html>`;
}

export function wireRss(stories: Story[], now: Date): string {
  const parts = etParts(now);
  const items = stories.slice(0, OPEN_TAPE).map((story) => {
    const published = new Date(story.publishedAt);
    const pubDate = Number.isNaN(published.getTime()) ? now.toUTCString() : published.toUTCString();
    return `    <item>
      <title>${escapeHtml(story.title)}</title>
      <link>${escapeHtml(story.url)}</link>
      <guid isPermaLink="false">${escapeHtml(story.id)}</guid>
      <pubDate>${escapeHtml(pubDate)}</pubDate>
      <description>${escapeHtml(`${toneLabel(story.tone)} · ${story.heat} · ${story.source}`)}</description>
    </item>`;
  });
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>ALGO Swamp pre-market wire</title>
    <link>${SITE_URL}/wire.xml</link>
    <description>Six scored headlines before the open. ${escapeHtml(parts.label)}.</description>
    <lastBuildDate>${escapeHtml(now.toUTCString())}</lastBuildDate>
${items.join("\n")}
  </channel>
</rss>
`;
}

/**
 * Body for POST /v4/broadcasts.
 * `subscriber_filter: []` targets the whole account. Kit's filter only accepts
 * segment and tag ids, not a form id, and this account's list is form 10083135.
 * `public: false` keeps the wire off the creator profile. `send_at` is what schedules it.
 * The default Classic template supplies unsubscribe and the address footer.
 */
export function kitBroadcastPayload(input: {
  subject: string;
  content: string;
  description: string;
  previewText: string;
  now: Date;
}): {
  subject: string;
  content: string;
  description: string;
  preview_text: string;
  public: false;
  published_at: string;
  send_at: string;
  email_address: string;
  subscriber_filter: [];
} {
  return {
    subject: input.subject,
    content: input.content,
    description: input.description,
    preview_text: input.previewText,
    public: false,
    published_at: input.now.toISOString(),
    send_at: new Date(input.now.getTime() + 60_000).toISOString(),
    email_address: FROM_EMAIL,
    subscriber_filter: [],
  };
}
