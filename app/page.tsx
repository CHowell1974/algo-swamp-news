"use client";

import { useEffect, useMemo, useState } from "react";
import { LANES, rankTickers, type LaneId, type Story } from "../lib/scan";

type Wire = { ok: boolean; stories: Story[]; fetchedAt?: string; error?: string | null };

function ago(iso: string): string {
  const minutes = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.round(minutes / 60);
  return hours < 36 ? `${hours}h` : `${Math.round(hours / 24)}d`;
}

export default function Home() {
  const [stories, setStories] = useState<Story[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [lane, setLane] = useState<LaneId | "all">("all");
  const [query, setQuery] = useState("");
  const [ticker, setTicker] = useState<string | null>(null);
  const [saved, setSaved] = useState<string[]>([]);
  const [showSaved, setShowSaved] = useState(false);

  useEffect(() => {
    const raw = localStorage.getItem("algo-swamp-saved");
    if (raw) setSaved(JSON.parse(raw) as string[]);
  }, []);

  useEffect(() => {
    let cancel = false;
    fetch("/api/wire")
      .then((res) => res.json())
      .then((wire: Wire) => {
        if (cancel) return;
        setStories(wire.stories ?? []);
        setError(wire.error ?? null);
      })
      .catch(() => {
        if (!cancel) setError("The wire is down.");
      })
      .finally(() => {
        if (!cancel) setLoading(false);
      });
    return () => {
      cancel = true;
    };
  }, []);

  function toggleSaved(id: string) {
    const next = saved.includes(id) ? saved.filter((item) => item !== id) : [id, ...saved].slice(0, 40);
    setSaved(next);
    localStorage.setItem("algo-swamp-saved", JSON.stringify(next));
  }

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return stories.filter((story) => {
      if (showSaved && !saved.includes(story.id)) return false;
      if (!showSaved && lane !== "all" && !story.lanes.includes(lane)) return false;
      if (ticker && !story.tickers.includes(ticker)) return false;
      if (!q) return true;
      return story.title.toLowerCase().includes(q) || story.tickers.some((symbol) => symbol.toLowerCase().includes(q));
    });
  }, [stories, lane, query, ticker, showSaved, saved]);

  const tape = useMemo(
    () => rankTickers(lane === "all" ? stories : stories.filter((story) => story.lanes.includes(lane))),
    [stories, lane],
  );

  return (
    <div className="min-h-screen">
      <header className="border-b border-line">
        <div className="mx-auto max-w-6xl px-4 py-6 md:px-8">
          <p className="text-xs font-medium tracking-widest text-signal uppercase">The desk</p>
          <h1 className="mt-2 font-display text-4xl leading-none text-fg md:text-6xl">
            ALGO <span className="italic text-signal">Swamp</span>
          </h1>
          <p className="mt-3 max-w-md text-sm text-muted">
            Financial headlines scored for heat, named tickers, and tone — before you open them.
          </p>
        </div>
      </header>
      <main className="mx-auto grid max-w-6xl gap-6 px-4 py-6 md:px-8 lg:grid-cols-[11rem_minmax(0,1fr)_16rem]">
        <nav className="flex gap-2 overflow-x-auto lg:flex-col" aria-label="Lanes">
          <LaneButton active={lane === "all" && !showSaved} onClick={() => { setLane("all"); setShowSaved(false); }}>
            All wires
          </LaneButton>
          {LANES.map((item) => (
            <LaneButton key={item.id} active={lane === item.id && !showSaved} onClick={() => { setLane(item.id); setShowSaved(false); }}>
              {item.label}
            </LaneButton>
          ))}
        </nav>
        <section>
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search a name or ticker"
              aria-label="Search headlines"
              className="min-h-11 flex-1 rounded-full border border-line bg-surface px-4 text-sm text-fg outline-none placeholder:text-muted"
            />
            <button
              type="button"
              onClick={() => setShowSaved(true)}
              className={`min-h-11 rounded-full px-4 text-sm font-medium ${showSaved ? "bg-fg text-bg" : "bg-surface text-muted"}`}
            >
              Saved{saved.length ? ` ${saved.length}` : ""}
            </button>
          </div>
          {ticker ? (
            <button type="button" onClick={() => setTicker(null)} className="mt-3 min-h-11 rounded-full bg-surface-2 px-3 text-sm text-fg">
              {ticker} ×
            </button>
          ) : null}
          {error ? <p className="mt-4 text-sm text-heat">{error}</p> : null}
          {loading ? <p className="mt-6 text-sm text-muted">Pulling the wire…</p> : null}
          {!loading && visible.length === 0 ? (
            <p className="mt-6 font-display text-2xl text-fg">Nothing in this cut.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {visible.map((story) => (
                <li key={story.id} className="rounded-card border border-line bg-surface px-4 py-4">
                  <div className="mb-3 h-1 overflow-hidden rounded-full bg-surface-2">
                    <div className={`h-full ${story.tone === "hot" ? "bg-heat" : "bg-muted"}`} style={{ width: `${story.heat}%` }} />
                  </div>
                  <p className={`text-xs font-medium tracking-wide uppercase ${story.tone === "hot" ? "text-heat" : "text-muted"}`}>
                    {story.tone} · {story.heat} · {ago(story.publishedAt)} · {story.source}
                  </p>
                  <a href={story.url} target="_blank" rel="noreferrer" className="mt-1 block font-display text-xl leading-snug text-fg hover:text-signal md:text-2xl">
                    {story.title}
                  </a>
                  <p className="mt-2 text-sm text-muted">{story.why}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {story.tickers.map((symbol) => (
                      <button key={symbol} type="button" onClick={() => setTicker(symbol)} className="min-h-9 rounded-full bg-surface-2 px-3 text-xs font-semibold text-fg">
                        {symbol}
                      </button>
                    ))}
                    <button type="button" onClick={() => toggleSaved(story.id)} className="min-h-9 rounded-full px-3 text-xs font-medium text-signal">
                      {saved.includes(story.id) ? "Saved" : "Save"}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
        <aside className="rounded-card border border-line bg-surface p-4">
          <h2 className="text-xs font-medium tracking-widest text-muted uppercase">Named in the wire</h2>
          <ul className="mt-3 space-y-1">
            {tape.map((row) => (
              <li key={row.symbol}>
                <button
                  type="button"
                  onClick={() => setTicker(row.symbol)}
                  className="flex min-h-11 w-full items-center justify-between rounded-lg px-2 text-sm text-fg hover:bg-surface-2"
                >
                  <span className="font-semibold">{row.symbol}</span>
                  <span className="text-muted">{row.count}</span>
                </button>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs leading-relaxed text-muted">Heat is a sort, not advice. Finnhub joins the wire when its key is set.</p>
        </aside>
      </main>
    </div>
  );
}

function LaneButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-11 shrink-0 rounded-full px-4 text-sm font-medium lg:w-full lg:text-left ${active ? "bg-signal text-bg" : "bg-surface text-fg"}`}
    >
      {children}
    </button>
  );
}
