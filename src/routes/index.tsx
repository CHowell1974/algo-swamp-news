import { createFileRoute, Link } from "@tanstack/react-router";
import { FounderLine } from "@/components/founder-line";
import { Masthead } from "@/components/masthead";
import { fetchWire } from "@/lib/news.functions";
import { OPTIONS_101_PRICE_USD } from "@/lib/course/access";
import {
  annualSavings,
  formatMoney,
  MONTHLY_TRIAL_DAYS,
  PLANS,
} from "@/lib/plans";
import type { Story } from "@/lib/scan";
import { HOME_PAGE, routeHead } from "@/lib/seo";

export const Route = createFileRoute("/")({
  head: () => routeHead(HOME_PAGE),
  loader: () => fetchWire(),
  component: MarketHome,
});

const focusRing =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal";

function MarketHome() {
  const wire = Route.useLoaderData();
  const preview = wire.stories.slice(0, 3);
  const save = annualSavings();

  return (
    <div className="min-h-screen">
      <Masthead />
      <main>
        <section className="mx-auto grid max-w-6xl gap-10 px-4 py-10 md:px-8 md:py-16 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:items-end">
          <div>
            <p className="flex items-center gap-2 text-xs font-medium tracking-widest text-signal uppercase">
              <span
                className="swamp-pulse inline-block size-2 rounded-full bg-signal"
                aria-hidden="true"
              />
              Markets wire
            </p>
            <h1 className="mt-4 font-display text-5xl leading-none text-balance text-fg md:text-7xl">
              Read the heat before the open.
            </h1>
            <p className="mt-5 max-w-xl text-base text-pretty text-muted md:text-lg">
              ALGO Swamp scores public headlines for freshness, sharp language,
              and named tickers. The open tape is free. The monthly desk is free
              for {MONTHLY_TRIAL_DAYS} days, then{" "}
              {formatMoney(PLANS.monthly.price)} a month.
            </p>
            <div className="mt-7 flex flex-col items-start gap-3">
              <Link
                to="/join"
                search={{ plan: "monthly" }}
                className={`inline-flex min-h-11 items-center rounded-full bg-signal px-5 text-sm font-semibold text-bg ${focusRing}`}
              >
                Try the full desk · {MONTHLY_TRIAL_DAYS} days free
              </Link>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                <Link
                  to="/join"
                  search={{ plan: "annual" }}
                  className={`inline-flex min-h-11 items-center text-sm font-medium text-fg ${focusRing}`}
                >
                  or {formatMoney(PLANS.annual.price)}/yr, save{" "}
                  {formatMoney(save)}
                </Link>
                <Link
                  to="/desk"
                  className={`inline-flex min-h-11 items-center text-sm text-muted ${focusRing}`}
                >
                  Open the tape
                </Link>
              </div>
            </div>
          </div>
          <Tape preview={preview} failed={!wire.ok} />
        </section>

        <section className="border-y border-line">
          <div className="mx-auto grid max-w-6xl md:grid-cols-3">
            {[
              [
                "01",
                "Heat",
                "Freshness, sharp verbs, and whether a real name is in the line. A sort, not a signal.",
              ],
              [
                "02",
                "Lanes",
                "Markets, macro, tech, crypto, energy, and earnings — cut from the same wire.",
              ],
              [
                "03",
                "Night note",
                "On the desk plan, ask for a four-line read of whatever is on screen.",
              ],
            ].map(([index, title, copy]) => (
              <article
                key={title}
                className="border-b border-line px-4 py-8 md:border-b-0 md:border-l md:px-8 first:md:border-l-0"
              >
                <p className="font-display text-xl text-signal italic">
                  {index}
                </p>
                <h2 className="mt-3 font-display text-3xl text-fg">{title}</h2>
                <p className="mt-2 text-sm text-pretty text-muted">{copy}</p>
              </article>
            ))}
          </div>
        </section>

        <section
          id="pricing"
          className="mx-auto max-w-6xl scroll-mt-6 px-4 py-14 md:px-8"
        >
          <div className="max-w-xl">
            <p className="text-xs font-medium tracking-widest text-muted uppercase">
              Pricing
            </p>
            <h2 className="mt-3 font-display text-4xl text-balance text-fg md:text-5xl">
              One desk. Two ways to keep it.
            </h2>
            <p className="mt-3 text-sm text-pretty text-muted">
              Monthly is free for {MONTHLY_TRIAL_DAYS} days, then{" "}
              {formatMoney(PLANS.monthly.price)} a month. Annual is{" "}
              {formatMoney(save)} less than twelve monthly payments, with no
              trial. Cancel and the desk stays up through the trial or the
              period you started.
            </p>
          </div>
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            <PlanCard
              plan="monthly"
              kicker="Month to month"
              price={formatMoney(PLANS.monthly.price)}
              cadence={PLANS.monthly.cadence}
              detail={PLANS.monthly.detail}
              emphasized
            />
            <PlanCard
              plan="annual"
              kicker="Best rate"
              price={formatMoney(PLANS.annual.price)}
              cadence={PLANS.annual.cadence}
              detail={PLANS.annual.detail}
              note={`Save ${formatMoney(save)} versus twelve months.`}
            />
          </div>
          <dl className="mt-8 grid gap-px overflow-hidden rounded-card border border-line bg-line sm:grid-cols-2">
            <Compare
              title="Open tape"
              items={["Six headlines", "Heat score on each", "No night note"]}
            />
            <Compare
              title="Desk plan"
              items={[
                "Full wire and all six lanes",
                "Ticker tape, pins, watchlist",
                "Night note on the stories in view",
              ]}
            />
          </dl>
        </section>

        <section className="border-t border-line">
          <div className="mx-auto max-w-6xl px-4 py-14 md:px-8">
            <h2 className="font-display text-4xl text-fg">Before you start</h2>
            <div className="mt-6 divide-y divide-line border-y border-line">
              <Faq q="Is this trading advice?">
                No. Heat is a way to sort public headlines. It is not a
                recommendation, a price target, or a signal to trade.
              </Faq>
              <Faq q="What stays free?">
                The open tape: six headlines with heat, tone, and tickers.
                Search and lanes work inside that cut.
              </Faq>
              <Faq q="What happens if I cancel?">
                During the 7-day monthly trial, cancel in Stripe and the desk
                stays open until the trial ends. You are not charged. After a
                paid period starts, the desk stays open until that period ends.
              </Faq>
            </div>
          </div>
        </section>

        <section
          aria-labelledby="course-teaser-title"
          className="border-t border-line"
        >
          <div className="mx-auto max-w-6xl px-4 py-10 md:px-8 md:py-12">
            <p className="text-xs font-medium tracking-widest text-muted uppercase">
              Course
            </p>
            <h2
              id="course-teaser-title"
              className="mt-2 font-display text-3xl text-fg"
            >
              Options 101: options trading for beginners
            </h2>
            <p className="mt-2 max-w-xl text-sm text-pretty text-muted">
              Wait. Then Bite. Eight short modules on calls, puts, and risk,
              with quizzes and a final exam. Modules 1–2 are free.{" "}
              {formatMoney(OPTIONS_101_PRICE_USD)} once, or included with the
              desk.
            </p>
            <div className="mt-2 flex flex-col items-start">
              <Link
                to="/learn/$moduleId"
                params={{ moduleId: "m1-what-is-an-option" }}
                className={`inline-flex min-h-11 items-center text-sm font-medium text-signal ${focusRing}`}
              >
                Start Modules 1–2 free: What is an option?
              </Link>
              <Link
                to="/learn"
                className={`inline-flex min-h-11 items-center text-sm font-medium text-fg ${focusRing}`}
              >
                See all 8 modules of Options 101
              </Link>
            </div>
          </div>
        </section>

        <section
          aria-labelledby="tools-teaser-title"
          className="border-t border-line"
        >
          <div className="mx-auto grid max-w-6xl items-center gap-5 px-4 py-10 md:grid-cols-[11rem_minmax(0,1fr)] md:px-8 md:py-12">
            <img
              src="/road-map.webp"
              alt="thinkorswim chart with yellow inside bars and an orange outside bar"
              width={1600}
              height={900}
              loading="lazy"
              decoding="async"
              className="w-full rounded-card border border-line"
            />
            <div>
              <p className="text-xs font-medium tracking-widest text-muted uppercase">
                Tools
              </p>
              <h2
                id="tools-teaser-title"
                className="mt-2 font-display text-3xl text-fg"
              >
                Road Map
              </h2>
              <p className="mt-2 max-w-xl text-sm text-pretty text-muted">
                A thinkorswim study. Inside bars in yellow, outside bars in
                orange. Free, or $39 once for Pro.
              </p>
              <Link
                to="/tools"
                className={`mt-2 inline-flex min-h-11 items-center text-sm font-medium text-signal ${focusRing}`}
              >
                See the tools
              </Link>
            </div>
          </div>
        </section>
      </main>
      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-5 gap-y-1 px-4 py-6 text-xs text-muted md:px-8">
          <p>Public wires only. A sort, not a signal.</p>
          <Link
            to="/learn"
            className={`inline-flex min-h-11 items-center ${focusRing}`}
          >
            Classes
          </Link>
          <Link
            to="/tools"
            className={`inline-flex min-h-11 items-center ${focusRing}`}
          >
            Tools
          </Link>
        </div>
      </footer>
    </div>
  );
}

function Tape({ preview, failed }: { preview: Story[]; failed: boolean }) {
  return (
    <section className="rounded-card border border-line bg-surface p-4 md:p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xs font-medium tracking-widest text-muted uppercase">
          On the tape now
        </h2>
        <Link to="/desk" className={`text-sm text-signal ${focusRing}`}>
          Full tape
        </Link>
      </div>
      {failed || preview.length === 0 ? (
        <p className="mt-4 text-sm text-muted">
          The wire is quiet. The desk will fill when the next pull lands.
        </p>
      ) : (
        <ul className="mt-3 divide-y divide-line">
          {preview.map((story) => (
            <li key={story.id} className="py-3">
              <div className="mb-2 h-1 overflow-hidden rounded-full bg-surface-2">
                <div
                  className={`h-full ${story.tone === "hot" ? "bg-heat" : "bg-muted"}`}
                  style={{ width: `${story.heat}%` }}
                />
              </div>
              <p className="text-xs font-medium tracking-wide text-muted uppercase">
                {story.tone} · {story.heat}
                {story.tickers[0] ? ` · ${story.tickers[0]}` : ""}
              </p>
              <p className="mt-1 font-display text-xl leading-snug text-fg">
                {story.title}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function PlanCard({
  plan,
  kicker,
  price,
  cadence,
  detail,
  note,
  emphasized,
}: {
  plan: "monthly" | "annual";
  kicker: string;
  price: string;
  cadence: string;
  detail: string;
  note?: string;
  emphasized?: boolean;
}) {
  return (
    <article
      className={`flex flex-col rounded-card border p-5 ${emphasized ? "border-signal bg-surface" : "border-line bg-surface"}`}
    >
      <p className="text-xs font-medium tracking-widest text-signal uppercase">
        {kicker}
      </p>
      <h3 className="mt-3 font-display text-3xl text-fg">
        {plan === "annual" ? "Annual" : "Monthly"}
      </h3>
      <p className="mt-4 font-display text-5xl text-fg tabular-nums">
        {price}
        <span className="ml-2 font-sans text-sm font-medium text-muted">
          {cadence}
        </span>
      </p>
      {note ? (
        <p className="mt-2 text-sm font-medium text-signal">{note}</p>
      ) : null}
      <p className="mt-3 text-sm text-pretty text-muted">{detail}</p>
      {plan === "monthly" ? (
        <FounderLine className="mt-2 text-sm text-signal" />
      ) : null}
      <Link
        to="/join"
        search={{ plan }}
        className={`mt-6 inline-flex min-h-11 items-center justify-center rounded-full px-4 text-sm font-semibold ${focusRing} ${
          emphasized ? "bg-signal text-bg" : "bg-fg text-bg"
        }`}
      >
        Start {plan}
      </Link>
    </article>
  );
}

function Compare({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="bg-surface px-5 py-5">
      <dt className="text-xs font-medium tracking-widest text-muted uppercase">
        {title}
      </dt>
      <dd className="mt-3 space-y-2 text-sm text-fg">
        {items.map((item) => (
          <p key={item}>{item}</p>
        ))}
      </dd>
    </div>
  );
}

function Faq({ q, children }: { q: string; children: string }) {
  return (
    <details className="group py-4">
      <summary
        className={`cursor-pointer text-base font-medium text-fg ${focusRing}`}
      >
        {q}
      </summary>
      <p className="mt-2 max-w-2xl text-sm text-pretty text-muted">
        {children}
      </p>
    </details>
  );
}
