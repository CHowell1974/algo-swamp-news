import { NextResponse } from "next/server";
import { LANES, LANE_QUERIES, mergeStories, parseRss, scoreStory, type LaneId, type Story } from "../../../lib/scan";

export const dynamic = "force-dynamic";

async function pullLane(lane: LaneId): Promise<Story[]> {
  const q = `${LANE_QUERIES[lane]} when:2d`;
  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=en-US&gl=US&ceid=US:en`;
  const res = await fetch(url, {
    headers: { "User-Agent": "ALGOSwampNews/1.0 (personal headline scanner)", Accept: "application/xml" },
    signal: AbortSignal.timeout(12_000),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`${lane} wire returned ${res.status}`);
  return parseRss(await res.text(), lane).slice(0, 14);
}

async function pullFinnhub(): Promise<Story[]> {
  const apiKey = process.env.FINNHUB_API_KEY;
  if (!apiKey) return [];
  const res = await fetch(`https://finnhub.io/api/v1/news?category=general&token=${apiKey}`, {
    signal: AbortSignal.timeout(12_000),
    cache: "no-store",
  });
  if (!res.ok) return [];
  const data = (await res.json()) as { headline?: string; url?: string; source?: string; datetime?: number }[];
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

export async function GET() {
  const settled = await Promise.allSettled([...LANES.map((lane) => pullLane(lane.id)), pullFinnhub()]);
  const batches: Story[][] = [];
  for (const result of settled) {
    if (result.status === "fulfilled") batches.push(result.value);
  }
  const stories = mergeStories(batches).slice(0, 72);
  if (!stories.length) {
    return NextResponse.json({ ok: false, stories, error: "The wire came back empty." }, { status: 502 });
  }
  return NextResponse.json({ ok: true, stories, fetchedAt: new Date().toISOString(), error: null });
}
