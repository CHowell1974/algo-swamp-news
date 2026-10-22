import { useEffect, useMemo, useState } from "react";
import { Link, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Bookmark, ExternalLink, Radio, RefreshCw, Search, Snowflake, Flame } from "lucide-react";
import { FounderLine } from "@/components/founder-line";
import { FreeWireSignup } from "@/components/free-wire-signup";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { briefWire, fetchMemberWire, fetchWire } from "@/lib/news.functions";
import { formatMoney, MONTHLY_TRIAL_DAYS, PLANS } from "@/lib/plans";
import { LANES, rankTickers, type LaneId, type Story } from "@/lib/scan";
import { useDesk } from "@/lib/desk-store";

type Wire = {
  ok: boolean;
  stories: Story[];
  fetchedAt: string;
  cached: boolean;
  error: string | null;
  access: "desk" | "open";
};

type SortMode = "heat" | "newest" | "saved";

const focusRing =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal";

function ago(iso: string): string {
  const minutes = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.round(minutes / 60);
  if (hours < 36) return `${hours}h`;
  return `${Math.round(hours / 24)}d`;
}

function toneLabel(tone: Story["tone"]): string {
  if (tone === "hot") return "Hot";
  if (tone === "cold") return "Cold";
  return "Steady";
}

export function ScannerDesk({
  initial,
  refreshToken = 0,
}: {
  initial: Wire;
  refreshToken?: number;
}) {
  const refreshWire = useServerFn(fetchWire);
  const refreshMember = useServerFn(fetchMemberWire);
  const readBrief = useServerFn(briefWire);
  const router = useRouter();
  const { user, isPending } = useCurrentUserState();
  const [wire, setWire] = useState(initial);
  const [checking, setChecking] = useState(false);
  const [lane, setLane] = useState<LaneId | "all">("all");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortMode>("heat");
  const [ticker, setTicker] = useState<string | null>(null);
  const [watchOnly, setWatchOnly] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [brief, setBrief] = useState<string | null>(null);
  const [briefError, setBriefError] = useState<string | null>(null);
  const [briefing, setBriefing] = useState(false);
  const saved = useDesk((state) => state.saved);
  const watch = useDesk((state) => state.watch);
  const toggleSaved = useDesk((state) => state.toggleSaved);
  const toggleWatch = useDesk((state) => state.toggleWatch);

  useEffect(() => {
    void useDesk.persist.rehydrate();
  }, []);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    setChecking(true);
    refreshMember()
      .then((next) => {
        if (!cancelled) setWire(next);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setChecking(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user?.id, refreshToken, refreshMember]);

  const deskOpen = wire.access === "desk";
  const locked = !deskOpen && !checking && !isPending;

  const savedIds = useMemo(() => new Set(saved.map((story) => story.id)), [saved]);
  const pool = sort === "saved" ? saved : wire.stories;

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const rows = pool.filter((story) => {
      if (lane !== "all" && sort !== "saved" && !story.lanes.includes(lane)) return false;
      if (ticker && !story.tickers.includes(ticker)) return false;
      if (watchOnly && !story.tickers.some((symbol) => watch.includes(symbol))) return false;
      if (!q) return true;
      return (
        story.title.toLowerCase().includes(q) ||
        story.source.toLowerCase().includes(q) ||
        story.tickers.some((symbol) => symbol.toLowerCase().includes(q))
      );
    });
    if (sort === "newest") {
      return [...rows].sort((a, b) => +new Date(b.publishedAt) - +new Date(a.publishedAt));
    }
    if (sort === "heat") {
      return [...rows].sort(
        (a, b) => b.heat - a.heat || +new Date(b.publishedAt) - +new Date(a.publishedAt),
      );
    }
    return rows;
  }, [pool, lane, query, ticker, watchOnly, watch, sort]);

  const tape = useMemo(
    () =>
      rankTickers(
        lane === "all" ? wire.stories : wire.stories.filter((s) => s.lanes.includes(lane)),
      ),
    [wire.stories, lane],
  );

  async function refresh() {
    setRefreshing(true);
    try {
      const next = user?.id ? await refreshMember() : await refreshWire();
      setWire(next);
      void router.invalidate();
    } finally {
      setRefreshing(false);
    }
  }

  async function readDesk() {
    const headlines = (visible.length ? visible : wire.stories)
      .slice(0, 12)
      .map((story) => story.title);
    setBriefing(true);
    setBriefError(null);
    try {
      const result = await readBrief({ data: { headlines } });
      if (!result.ok) setBriefError(result.error);
      else setBrief(result.text);
    } catch {
      setBriefError("The desk read failed. The wire is still up.");
    } finally {
      setBriefing(false);
    }
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-line">
        <div className="mx-auto flex max-w-6xl flex-col gap-5 px-4 py-5 md:px-8 md:py-7">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="flex items-center gap-2 text-xs font-medium tracking-widest text-signal uppercase">
                <span
                  className="swamp-pulse inline-block size-2 rounded-full bg-signal"
                  aria-hidden="true"
                />
                The desk
              </p>
              <h1 className="mt-2 font-display text-4xl leading-none text-fg md:text-6xl">
                ALGO <span className="italic text-signal">Swamp</span>
              </h1>
              <p className="mt-3 max-w-md text-sm text-muted md:text-base">
                Financial headlines scored for heat, named tickers, and tone — before you open them.
              </p>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-2 sm:flex-row">
              {deskOpen ? (
                <button
                  type="button"
                  onClick={() => void readDesk()}
                  disabled={briefing || !wire.stories.length}
                  className={`inline-flex min-h-11 items-center gap-2 rounded-full bg-signal px-4 text-sm font-semibold text-bg transition-opacity duration-200 disabled:opacity-50 ${focusRing}`}
                >
                  <Radio className="size-4" aria-hidden="true" />
                  {briefing ? "Reading…" : "Read the desk"}
                </button>
              ) : (
                <Link
                  to="/join"
                  search={{ plan: "annual" }}
                  className={`inline-flex min-h-11 items-center gap-2 rounded-full bg-signal px-4 text-sm font-semibold text-bg ${focusRing}`}
                >
                  Start the desk
                </Link>
              )}
              <button
                type="button"
                onClick={() => void refresh()}
                disabled={refreshing}
                className={`inline-flex min-h-11 items-center gap-2 rounded-full bg-surface px-4 text-sm font-medium text-fg transition-colors duration-200 hover:bg-surface-2 disabled:opacity-50 ${focusRing}`}
              >
                <RefreshCw
                  className={`size-4 ${refreshing ? "swamp-pulse" : ""}`}
                  aria-hidden="true"
                />
                Refresh
              </button>
            </div>
          </div>

          {brief || briefError ? (
            <section className="rounded-card border border-line bg-surface px-4 py-4 md:px-5">
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-display text-xl text-fg">Night note</h2>
                <button
                  type="button"
                  onClick={() => {
                    setBrief(null);
                    setBriefError(null);
                  }}
                  className={`text-sm text-muted ${focusRing}`}
                >
                  Dismiss
                </button>
              </div>
              {briefError ? <p className="mt-2 text-sm text-heat">{briefError}</p> : null}
              {brief ? (
                <div className="mt-2 space-y-2 text-sm leading-relaxed text-fg">
                  {brief
                    .split("\n")
                    .map((line) => line.trim())
                    .filter(Boolean)
                    .map((line) => (
                      <p key={line}>{line.replace(/^[-•*]\s*/, "")}</p>
                    ))}
                </div>
              ) : null}
            </section>
          ) : null}
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl gap-6 px-4 py-5 md:px-8 md:py-7 lg:grid-cols-[11rem_minmax(0,1fr)_16rem]">
        <nav
          aria-label="Lanes"
          className="flex gap-2 overflow-x-auto lg:flex-col lg:overflow-visible"
        >
          <LaneButton active={lane === "all"} onClick={() => setLane("all")}>
            All wires
          </LaneButton>
          {LANES.map((item) => (
            <LaneButton key={item.id} active={lane === item.id} onClick={() => setLane(item.id)}>
              {item.label}
            </LaneButton>
          ))}
        </nav>

        <section>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <label className="relative min-w-0 flex-1">
              <span className="sr-only">Search headlines</span>
              <Search
                className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted"
                aria-hidden="true"
              />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search a name, source, or ticker"
                className={`min-h-11 w-full rounded-full border border-line bg-surface pr-4 pl-10 text-sm text-fg outline-none placeholder:text-muted ${focusRing}`}
              />
            </label>
            <div className="flex gap-2">
              {(
                [
                  ["heat", "Heat"],
                  ["newest", "Newest"],
                  ["saved", "Saved"],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setSort(id)}
                  className={`min-h-11 rounded-full px-3 text-sm font-medium transition-colors duration-200 ${focusRing} ${
                    sort === id ? "bg-fg text-bg" : "bg-surface text-muted hover:text-fg"
                  }`}
                >
                  {label}
                  {id === "saved" && saved.length ? ` ${saved.length}` : ""}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setWatchOnly((value) => !value)}
              className={`min-h-11 rounded-full px-3 text-sm font-medium transition-colors duration-200 ${focusRing} ${
                watchOnly ? "bg-signal text-bg" : "bg-surface text-muted hover:text-fg"
              }`}
            >
              Watchlist{watch.length ? ` ${watch.length}` : ""}
            </button>
            {ticker ? (
              <button
                type="button"
                onClick={() => setTicker(null)}
                className={`min-h-11 rounded-full bg-surface-2 px-3 text-sm text-fg ${focusRing}`}
              >
                {ticker} ×
              </button>
            ) : null}
            <p className="text-xs text-muted">
              {visible.length} on the desk
              {wire.fetchedAt ? (
                <span suppressHydrationWarning> · {ago(wire.fetchedAt)} old pull</span>
              ) : null}
            </p>
          </div>

          {wire.error ? <p className="mt-4 text-sm text-heat">{wire.error}</p> : null}

          {visible.length === 0 ? (
            <div className="mt-6 rounded-card border border-dashed border-line px-5 py-10 text-center">
              <p className="font-display text-2xl text-fg">Nothing in this cut.</p>
              <p className="mt-2 text-sm text-muted">
                {sort === "saved"
                  ? "Pin a headline and it stays on this side of the desk."
                  : "Widen the lane or clear the search."}
              </p>
            </div>
          ) : (
            <ul className="mt-4 space-y-3">
              {visible.map((story) => (
                <StoryCard
                  key={story.id}
                  story={story}
                  pinned={savedIds.has(story.id)}
                  onPin={() => toggleSaved(story)}
                  onTicker={(symbol) =>
                    setTicker((current) => (current === symbol ? null : symbol))
                  }
                />
              ))}
            </ul>
          )}

          {locked ? (
            <div className="mt-4 grid items-start gap-3 lg:grid-cols-2">
              <section className="rounded-card border border-line bg-surface px-5 py-6">
                <p className="text-xs font-medium tracking-widest text-signal uppercase">
                  Open tape
                </p>
                <h2 className="mt-2 font-display text-3xl text-balance text-fg">
                  The rest of the wire is the desk plan.
                </h2>
                <p className="mt-2 max-w-lg text-sm text-pretty text-muted">
                  Six headlines stay public. The full desk opens every lane, the full heat sort, and
                  the night note.
                </p>
                <p className="mt-2 max-w-lg text-sm text-pretty text-fg">
                  Try the full desk free for {MONTHLY_TRIAL_DAYS} days, then{" "}
                  {formatMoney(PLANS.monthly.price)}/mo. Cancel anytime.
                </p>
                <FounderLine className="mt-2 text-sm text-signal" />
                <div className="mt-4 flex flex-wrap gap-2">
                  <Link
                    to="/join"
                    search={{ plan: "monthly" }}
                    className={`inline-flex min-h-11 items-center rounded-full bg-signal px-4 text-sm font-semibold text-bg ${focusRing}`}
                  >
                    Monthly desk
                  </Link>
                  <Link
                    to="/join"
                    search={{ plan: "annual" }}
                    className={`inline-flex min-h-11 items-center rounded-full bg-surface-2 px-4 text-sm font-medium text-fg ${focusRing}`}
                  >
                    Annual desk
                  </Link>
                </div>
              </section>
              <FreeWireSignup />
            </div>
          ) : null}
        </section>

        <aside className="space-y-4">
          <section className="rounded-card border border-line bg-surface p-4">
            <h2 className="text-xs font-medium tracking-widest text-muted uppercase">
              Named in the wire
            </h2>
            {tape.length === 0 ? (
              <p className="mt-3 text-sm text-muted">No clear tickers in this cut.</p>
            ) : (
              <ul className="mt-3 space-y-1">
                {tape.map((row) => (
                  <li key={row.symbol} className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setTicker((current) => (current === row.symbol ? null : row.symbol))
                      }
                      className={`flex min-h-11 flex-1 items-center justify-between rounded-lg px-2 text-left text-sm transition-colors duration-200 ${focusRing} ${
                        ticker === row.symbol ? "bg-signal text-bg" : "text-fg hover:bg-surface-2"
                      }`}
                    >
                      <span className="font-semibold">{row.symbol}</span>
                      <span className={ticker === row.symbol ? "text-bg" : "text-muted"}>
                        {row.count}
                      </span>
                    </button>
                    <button
                      type="button"
                      aria-label={
                        watch.includes(row.symbol)
                          ? `Remove ${row.symbol} from watchlist`
                          : `Watch ${row.symbol}`
                      }
                      onClick={() => toggleWatch(row.symbol)}
                      className={`inline-flex size-11 items-center justify-center rounded-lg ${focusRing} ${
                        watch.includes(row.symbol) ? "text-signal" : "text-muted hover:text-fg"
                      }`}
                    >
                      <Bookmark
                        className="size-4"
                        fill={watch.includes(row.symbol) ? "currentColor" : "none"}
                      />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <p className="px-1 text-xs leading-relaxed text-muted">
            Heat mixes freshness, sharp language, and whether a real name is in the headline. It is
            a sort, not advice.
          </p>
        </aside>
      </main>
    </div>
  );
}

function LaneButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-11 shrink-0 rounded-full px-4 text-left text-sm font-medium transition-colors duration-200 lg:w-full ${focusRing} ${
        active ? "bg-signal text-bg" : "bg-surface text-fg hover:bg-surface-2"
      }`}
    >
      {children}
    </button>
  );
}

function StoryCard({
  story,
  pinned,
  onPin,
  onTicker,
}: {
  story: Story;
  pinned: boolean;
  onPin: () => void;
  onTicker: (symbol: string) => void;
}) {
  const ToneIcon = story.tone === "hot" ? Flame : story.tone === "cold" ? Snowflake : Radio;
  const toneClass = story.tone === "hot" ? "text-heat" : "text-muted";

  return (
    <li className="rounded-card border border-line bg-surface px-4 py-4">
      <div className="mb-3 h-1 overflow-hidden rounded-full bg-surface-2">
        <div
          className={`h-full ${story.tone === "hot" ? "bg-heat" : "bg-muted"}`}
          style={{ width: `${story.heat}%` }}
        />
      </div>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p
            className={`flex items-center gap-2 text-xs font-medium tracking-wide uppercase ${toneClass}`}
          >
            <ToneIcon className="size-3.5" aria-hidden="true" />
            {toneLabel(story.tone)} · {story.heat}
            <span className="text-muted" suppressHydrationWarning>
              · {ago(story.publishedAt)} · {story.source}
            </span>
          </p>
          <a
            href={story.url}
            target="_blank"
            rel="noreferrer"
            className={`mt-1 block font-display text-xl leading-snug text-fg transition-colors duration-200 hover:text-signal md:text-2xl ${focusRing}`}
          >
            {story.title}
            <ExternalLink
              className="ml-1 inline size-3.5 align-baseline text-muted"
              aria-hidden="true"
            />
          </a>
          <p className="mt-2 text-sm text-muted">{story.why}</p>
          {story.tickers.length ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {story.tickers.map((symbol) => (
                <button
                  key={symbol}
                  type="button"
                  onClick={() => onTicker(symbol)}
                  className={`min-h-9 rounded-full bg-surface-2 px-3 text-xs font-semibold text-fg hover:text-signal ${focusRing}`}
                >
                  {symbol}
                </button>
              ))}
            </div>
          ) : null}
        </div>
        <button
          type="button"
          aria-pressed={pinned}
          aria-label={pinned ? "Remove saved headline" : "Save headline"}
          onClick={onPin}
          className={`inline-flex size-11 shrink-0 items-center justify-center rounded-full ${focusRing} ${
            pinned ? "bg-signal text-bg" : "bg-surface-2 text-muted hover:text-fg"
          }`}
        >
          <Bookmark className="size-4" fill={pinned ? "currentColor" : "none"} />
        </button>
      </div>
    </li>
  );
}
