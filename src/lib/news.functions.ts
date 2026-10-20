import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { readMembership } from "@/lib/membership.functions";
import { OPEN_TAPE } from "@/lib/plans";
import { LANES, LANE_QUERIES, mergeStories, parseRss, scoreStory, type LaneId, type Story } from "@/lib/scan";

const TTL_MS = 3 * 60 * 1000;
const SCORE_REV = 4;
let cache: { at: number; rev: number; stories: Story[] } | null = null;

const briefCache = new Map<string, { at: number; text: string }>();
const briefHits: number[] = [];

async function pullLane(lane: LaneId): Promise<Story[]> {
  const q = `${LANE_QUERIES[lane]} when:2d`;
  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=en-US&gl=US&ceid=US:en`;
  const res = await fetch(url, {
    headers: {
      "User-Agent": "ALGOSwampNews/1.0 (personal headline scanner)",
      Accept: "application/rss+xml, application/xml, text/xml",
    },
    signal: AbortSignal.timeout(12_000),
  });
  if (!res.ok) throw new Error(`${lane} wire returned ${res.status}`);
  return parseRss(await res.text(), lane).slice(0, 14);
}

async function pullFinnhub(): Promise<Story[]> {
  const apiKey = process.env.FINNHUB_API_KEY;
  if (!apiKey) return [];
  const res = await fetch(`https://finnhub.io/api/v1/news?category=general&token=${apiKey}`, {
    signal: AbortSignal.timeout(12_000),
  });
  if (!res.ok) return [];
  const data = (await res.json()) as {
    headline?: string;
    url?: string;
    source?: string;
    datetime?: number;
  }[];
  if (!Array.isArray(data)) return [];
  return data.slice(0, 20).flatMap((item) => {
    if (!item.headline || !item.url || !item.datetime) return [];
    return [
      scoreStory({
        title: item.headline,
        url: item.url,
        source: item.source || "Finnhub",
        publishedAt: new Date(item.datetime * 1000).toISOString(),
        lanes: ["markets"],
      }),
    ];
  });
}

type WirePayload = {
  ok: boolean;
  stories: Story[];
  fetchedAt: string;
  cached: boolean;
  error: string | null;
  access: "desk" | "open";
};

async function loadWire(): Promise<Omit<WirePayload, "access">> {
  if (cache && cache.rev === SCORE_REV && Date.now() - cache.at < TTL_MS) {
    return {
      ok: true,
      stories: cache.stories,
      fetchedAt: new Date(cache.at).toISOString(),
      cached: true,
      error: null,
    };
  }

  const settled = await Promise.allSettled([...LANES.map((lane) => pullLane(lane.id)), pullFinnhub()]);
  const batches: Story[][] = [];
  const failures: string[] = [];
  for (const result of settled) {
    if (result.status === "fulfilled") batches.push(result.value);
    else failures.push(result.reason instanceof Error ? result.reason.message : "lane failed");
  }

  const stories = mergeStories(batches).slice(0, 72);
  if (!stories.length) {
    return {
      ok: false,
      stories,
      fetchedAt: new Date().toISOString(),
      cached: false,
      error: failures[0] ?? "The wire came back empty.",
    };
  }

  cache = { at: Date.now(), rev: SCORE_REV, stories };
  return {
    ok: true,
    stories,
    fetchedAt: new Date(cache.at).toISOString(),
    cached: false,
    error: failures.length ? "A lane dropped out. Showing what came through." : null,
  };
}

async function composeWire(userId: string | null): Promise<WirePayload> {
  const loaded = await loadWire();
  let access: WirePayload["access"] = "open";
  if (userId) {
    const membership = await readMembership(userId);
    if (membership.active) access = "desk";
  }
  return {
    ...loaded,
    access,
    stories: access === "desk" ? loaded.stories : loaded.stories.slice(0, OPEN_TAPE),
  };
}

export const fetchWire = createServerFn({ method: "GET" }).handler(async () => {
  const { getSessionUser } = await import("@/lib/auth/verify.server");
  const user = await getSessionUser();
  return composeWire(user?.id ?? null);
});

export const fetchMemberWire = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => composeWire(context.userId));

export const briefWire = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { headlines?: string[] }) => {
    const headlines = (input?.headlines ?? [])
      .map((line) => String(line).replace(/\s+/g, " ").trim())
      .filter(Boolean)
      .slice(0, 12);
    if (!headlines.length) throw new Error("Nothing on the desk to scan.");
    return { headlines };
  })
  .handler(async ({ context, data }) => {
    const membership = await readMembership(context.userId);
    if (!membership.active) {
      return { ok: false as const, text: "", error: "Night notes are on the desk plan." };
    }

    const apiKey = process.env.XAI_API_KEY;
    if (!apiKey) return { ok: false as const, text: "", error: "Desk read is unavailable right now." };

    const key = data.headlines.join("|");
    const hit = briefCache.get(key);
    if (hit && Date.now() - hit.at < 20 * 60 * 1000) {
      return { ok: true as const, text: hit.text, error: null as string | null };
    }

    const now = Date.now();
    while (briefHits.length && now - briefHits[0]! > 3_600_000) briefHits.shift();
    if (briefHits.length >= 20) {
      return { ok: false as const, text: "", error: "Desk read is capped for this hour. Try again later." };
    }

    const res = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      signal: AbortSignal.timeout(25_000),
      body: JSON.stringify({
        model: "grok-4.5",
        max_tokens: 280,
        temperature: 0.3,
        messages: [
          {
            role: "system",
            content:
              "You are the night editor of a markets desk. Given headlines, write exactly 4 short bullets: what moved, the risk, the sector to watch, and one ticker implication. Start each line with a bullet. No preamble, no disclaimer.",
          },
          { role: "user", content: data.headlines.map((line, i) => `${i + 1}. ${line}`).join("\n") },
        ],
      }),
    });

    if (!res.ok) {
      return { ok: false as const, text: "", error: "The desk read failed. The wire is still up." };
    }

    briefHits.push(now);
    const body = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const text = body.choices?.[0]?.message?.content?.trim() ?? "";
    if (!text) return { ok: false as const, text: "", error: "The desk read came back empty." };
    briefCache.set(key, { at: now, text });
    return { ok: true as const, text, error: null as string | null };
  });
