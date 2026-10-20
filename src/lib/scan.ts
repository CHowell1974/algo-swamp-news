export const LANES = [
  { id: "markets", label: "Markets" },
  { id: "macro", label: "Macro" },
  { id: "tech", label: "Tech" },
  { id: "crypto", label: "Crypto" },
  { id: "energy", label: "Energy" },
  { id: "earnings", label: "Earnings" },
] as const;

export type LaneId = (typeof LANES)[number]["id"];

export type Tone = "hot" | "cold" | "steady";

export type Story = {
  id: string;
  title: string;
  url: string;
  source: string;
  publishedAt: string;
  lanes: LaneId[];
  tickers: string[];
  heat: number;
  tone: Tone;
  tags: string[];
  why: string;
};

export const LANE_QUERIES: Record<LaneId, string> = {
  markets: "stock market OR Wall Street OR S&P 500 OR Dow Jones",
  macro: "Federal Reserve OR inflation OR Treasury yields OR jobs report",
  tech: "Nvidia OR semiconductor OR Apple OR Microsoft OR AI stocks",
  crypto: "bitcoin OR ethereum OR crypto market",
  energy: "crude oil OR OPEC OR natural gas OR Exxon",
  earnings: "earnings beat OR earnings miss OR quarterly guidance",
};

const NAMES: [RegExp, string][] = [
  [/\bnvidia\b/i, "NVDA"],
  [/\bapple\b/i, "AAPL"],
  [/\bmicrosoft\b/i, "MSFT"],
  [/\bamazon\b/i, "AMZN"],
  [/\bgoogle\b|\balphabet\b/i, "GOOGL"],
  [/\bmeta\b|\bfacebook\b/i, "META"],
  [/\btesla\b/i, "TSLA"],
  [/\bbroadcom\b/i, "AVGO"],
  [/\bintel\b/i, "INTC"],
  [/\bamd\b/i, "AMD"],
  [/\bmicron\b/i, "MU"],
  [/\bpalantir\b/i, "PLTR"],
  [/\bcrowdstrike\b/i, "CRWD"],
  [/\boracle\b/i, "ORCL"],
  [/\bsalesforce\b/i, "CRM"],
  [/\bnetflix\b/i, "NFLX"],
  [/\bcoinbase\b/i, "COIN"],
  [/\brobinhood\b/i, "HOOD"],
  [/\bbitcoin\b/i, "BTC"],
  [/\bethereum\b/i, "ETH"],
  [/\bexxon\b/i, "XOM"],
  [/\bchevron\b/i, "CVX"],
  [/\bconocophillips\b/i, "COP"],
  [/\bschlumberger\b|\bslb\b/i, "SLB"],
  [/\bjp\s?morgan\b/i, "JPM"],
  [/\bgoldman\b/i, "GS"],
  [/\bmorgan stanley\b/i, "MS"],
  [/\bbank of america\b/i, "BAC"],
  [/\bwells fargo\b/i, "WFC"],
  [/\bblackrock\b/i, "BLK"],
  [/\bberkshire\b/i, "BRK"],
  [/\bunitedhealth\b/i, "UNH"],
  [/\beli lilly\b|\blilly\b/i, "LLY"],
  [/\bpfizer\b/i, "PFE"],
  [/\bboeing\b/i, "BA"],
  [/\blockheed\b/i, "LMT"],
  [/\bwalmart\b/i, "WMT"],
  [/\bcostco\b/i, "COST"],
  [/\bhome depot\b/i, "HD"],
  [/\bstarbucks\b/i, "SBUX"],
  [/\bnike\b/i, "NKE"],
  [/\bdisney\b/i, "DIS"],
  [/\buber\b/i, "UBER"],
  [/\btsmc\b|\btaiwan semi/i, "TSM"],
  [/\basml\b/i, "ASML"],
  [/\bsuper micro\b/i, "SMCI"],
  [/\bapplied materials\b/i, "AMAT"],
  [/\bqualcomm\b/i, "QCOM"],
];

const SYMBOLS = new Set(NAMES.map(([, symbol]) => symbol));

const HOT = [
  ["surge", "surges"],
  ["soar", "soars"],
  ["rally", "rallies"],
  ["record"],
  ["beat", "beats"],
  ["upgrade", "upgrades"],
  ["jump", "jumps"],
  ["boom"],
  ["breakthrough"],
  ["outperform"],
];
const COLD = [
  ["plunge", "plunges"],
  ["crash", "crashes"],
  ["miss", "misses"],
  ["downgrade", "downgrades"],
  ["sink", "sinks"],
  ["slump", "slumps"],
  ["bankruptcy"],
  ["layoff", "layoffs"],
  ["warning"],
  ["selloff", "sell-off"],
  ["tumble", "tumbles"],
  ["halt", "halted"],
];
const ALERT = [["breaking"], ["fed"], ["rate", "rates"], ["war"], ["sanction", "sanctions"], ["default"], ["investigation"]];

function hitGroups(title: string, groups: string[][]): string[] {
  const found: string[] = [];
  for (const group of groups) {
    const pattern = new RegExp(`\\b(?:${group.map((word) => word.replace("-", "\\-")).join("|")})\\b`, "i");
    if (pattern.test(title)) found.push(group[0] ?? "");
  }
  return found.filter(Boolean);
}

export function storyId(title: string, source: string): string {
  const s = `${source}|${title}`.toLowerCase();
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36);
}

export function extractTickers(title: string): string[] {
  const found = new Set<string>();
  for (const [pattern, symbol] of NAMES) {
    if (pattern.test(title)) found.add(symbol);
  }
  for (const match of title.matchAll(/\$([A-Z]{1,5})\b/g)) {
    const symbol = match[1];
    if (symbol && SYMBOLS.has(symbol)) found.add(symbol);
  }
  for (const match of title.matchAll(/\b(?:NYSE|NASDAQ|AMEX):\s*([A-Z]{1,5})\b/g)) {
    const symbol = match[1];
    if (symbol) found.add(symbol);
  }
  return [...found].slice(0, 4);
}

export function scoreStory(input: {
  title: string;
  url: string;
  source: string;
  publishedAt: string;
  lanes: LaneId[];
}): Story {
  const tickers = extractTickers(input.title);
  const hot = hitGroups(input.title, HOT);
  const cold = hitGroups(input.title, COLD);
  const alert = hitGroups(input.title, ALERT);
  const ageMs = Math.max(0, Date.now() - new Date(input.publishedAt).getTime());
  const hours = ageMs / 3_600_000;

  let heat = 18;
  if (hours < 0.5) heat += 42;
  else if (hours < 2) heat += 30;
  else if (hours < 6) heat += 18;
  else if (hours < 24) heat += 8;
  heat += Math.min(24, (hot.length + cold.length) * 14);
  heat += Math.min(12, alert.length * 8);
  heat += Math.min(16, tickers.length * 8);
  if (/current price of|price today|\bstocks to buy\b|\bstocks that look\b/i.test(input.title)) heat -= 22;
  heat = Math.max(4, Math.min(99, heat));

  const tone: Tone =
    hot.length > cold.length ? "hot" : cold.length > hot.length ? "cold" : hot.length && cold.length ? "steady" : "steady";

  const tags = [...new Set([...hot, ...cold, ...alert])].slice(0, 2);
  const whyParts: string[] = [];
  if (tickers.length) whyParts.push(tickers.join(" · "));
  if (tags.length) whyParts.push(tags.join(", "));
  if (hours < 1) whyParts.push("under an hour old");
  else if (hours < 6) whyParts.push("still fresh");
  else whyParts.push("older print");

  return {
    id: storyId(input.title, input.source),
    title: input.title,
    url: input.url,
    source: input.source || "Wire",
    publishedAt: input.publishedAt,
    lanes: input.lanes,
    tickers,
    heat,
    tone: hot.length === 0 && cold.length === 0 ? "steady" : tone,
    tags,
    why: whyParts.join(" · "),
  };
}

const AMP = String.fromCharCode(38);

export function decodeXml(value: string): string {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replaceAll(AMP + "amp;", AMP)
    .replaceAll(AMP + "lt;", "<")
    .replaceAll(AMP + "gt;", ">")
    .replaceAll(AMP + "quot;", '"')
    .replaceAll(AMP + "#39;", "'")
    .replaceAll(AMP + "apos;", "'")
    .replace(new RegExp(AMP + "#(\\d+);", "g"), (_, n: string) => String.fromCharCode(Number(n)))
    .replace(/\s+/g, " ")
    .trim();
}

function tagText(block: string, tag: string): string {
  const match = block.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`, "i"));
  return match?.[1] ? decodeXml(match[1]) : "";
}

export function parseRss(xml: string, lane: LaneId): Story[] {
  const stories: Story[] = [];
  for (const match of xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)) {
    const block = match[1] ?? "";
    const link = tagText(block, "link");
    const source = tagText(block, "source");
    let title = tagText(block, "title");
    if (!title || !link) continue;
    if (source && title.endsWith(` - ${source}`)) {
      title = title.slice(0, -(source.length + 3)).trim();
    }
    const pub = tagText(block, "pubDate");
    const published = new Date(pub);
    if (Number.isNaN(published.getTime())) continue;
    stories.push(
      scoreStory({
        title,
        url: link,
        source: source || "Google News",
        publishedAt: published.toISOString(),
        lanes: [lane],
      }),
    );
  }
  return stories;
}

export function mergeStories(batches: Story[][]): Story[] {
  const byTitle = new Map<string, Story>();
  for (const batch of batches) {
    for (const story of batch) {
      const key = story.title.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
      const existing = byTitle.get(key);
      if (!existing) {
        byTitle.set(key, story);
        continue;
      }
      const lanes = [...new Set([...existing.lanes, ...story.lanes])];
      const heat = Math.max(existing.heat, story.heat);
      const tickers = [...new Set([...existing.tickers, ...story.tickers])].slice(0, 4);
      byTitle.set(key, heat >= existing.heat ? { ...story, lanes, heat, tickers } : { ...existing, lanes, heat, tickers });
    }
  }
  return [...byTitle.values()].sort((a, b) => {
    if (b.heat !== a.heat) return b.heat - a.heat;
    return +new Date(b.publishedAt) - +new Date(a.publishedAt);
  });
}

export type TickerCount = { symbol: string; count: number; heat: number };

export function rankTickers(stories: Story[]): TickerCount[] {
  const map = new Map<string, TickerCount>();
  for (const story of stories) {
    for (const symbol of story.tickers) {
      const row = map.get(symbol) ?? { symbol, count: 0, heat: 0 };
      row.count += 1;
      row.heat = Math.max(row.heat, story.heat);
      map.set(symbol, row);
    }
  }
  return [...map.values()].sort((a, b) => b.count - a.count || b.heat - a.heat).slice(0, 12);
}
