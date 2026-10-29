import { createFileRoute, Link } from "@tanstack/react-router";
import { ExternalLink } from "lucide-react";
import { KitEmailForm } from "@/components/kit-email-form";
import { Masthead } from "@/components/masthead";
import { ROAD_MAP_FORM_ID } from "@/lib/kit-subscribe";
import { MONTHLY_TRIAL_DAYS, formatMoney } from "@/lib/plans";
import { TOOLS_PAGE, routeHead } from "@/lib/seo";
import {
  BUNDLE_LINE,
  MOTHER_BAR_LEVELS_PAGE_COPY,
  MOTHER_BAR_SWEEP_SCAN_PAGE_COPY,
  studyPriceUsd,
} from "@/lib/studies/catalog";

export const Route = createFileRoute("/tools/")({
  head: () => routeHead(TOOLS_PAGE),
  component: ToolsPage,
});

const focusRing =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal";

const ROAD_MAP_PRO_URL = "https://algo-swamp.kit.com/products/road-map-pro-thinkorswim";
const LIVE_SHOW_URL = "https://www.youtube.com/@ALGO_Swamp";

function ToolsPage() {
  const levelsPrice = studyPriceUsd(MOTHER_BAR_LEVELS_PAGE_COPY.id);
  const scanPrice = studyPriceUsd(MOTHER_BAR_SWEEP_SCAN_PAGE_COPY.id);

  return (
    <div className="min-h-screen">
      <Masthead />
      <main>
        <section className="mx-auto max-w-6xl px-4 py-10 md:px-8 md:py-14">
          <p className="text-xs font-medium tracking-widest text-muted uppercase">Tools</p>
          <h1 className="mt-3 max-w-3xl font-display text-5xl text-balance text-fg">Road Map</h1>
          <p className="mt-4 max-w-xl text-base text-pretty text-muted">
            A thinkorswim study. Inside bars and outside bars get their own colors.
          </p>
          <img
            src="/road-map.webp"
            alt="thinkorswim chart with yellow inside bars and an orange outside bar"
            width={1600}
            height={900}
            className="mt-8 w-full max-w-3xl rounded-card border border-line"
          />

          <div className="mt-8 grid items-stretch gap-4 md:grid-cols-2">
            <KitEmailForm
              className="h-full"
              formId={ROAD_MAP_FORM_ID}
              titleId="road-map-free-title"
              inputId="road-map-email"
              statusId="road-map-status"
              kicker="Free"
              title="Road Map"
              description="Inside bars paint yellow. Outside bars paint orange. The study arrives by email, and the signup adds the pre-market wire. Unsubscribe anytime."
              buttonLabel="Send the study"
              confirmTitle="Confirm your Road Map signup"
            />
            <article className="flex h-full flex-col rounded-card border border-line bg-surface px-5 py-5">
              <p className="text-xs font-medium tracking-widest text-muted uppercase">One-time</p>
              <h2 className="mt-2 font-display text-2xl text-fg">Road Map Pro</h2>
              <p className="mt-4 font-display text-4xl text-fg tabular-nums">
                $39
                <span className="ml-2 font-sans text-sm font-medium text-muted">once</span>
              </p>
              <ul className="mt-4 space-y-2 text-sm text-fg">
                <li>Custom colors for inside and outside bars</li>
                <li>Optional colors for 2-up and 2-down bars</li>
                <li>A sequence label, such as 2U-1-3</li>
                <li>Alerts, a scan, and a watchlist column</li>
              </ul>
              <p className="mt-4 text-sm text-pretty text-muted">
                How to trade it is taught on the{" "}
                <a
                  href={LIVE_SHOW_URL}
                  target="_blank"
                  rel="noreferrer"
                  className={`text-fg hover:text-signal ${focusRing}`}
                >
                  ALGO Swamp live show
                  <ExternalLink
                    className="ml-1 inline size-3.5 align-baseline text-muted"
                    aria-hidden="true"
                  />
                </a>
                .
              </p>
              <a
                href={ROAD_MAP_PRO_URL}
                target="_blank"
                rel="noreferrer"
                className={`mt-6 inline-flex min-h-11 items-center justify-center rounded-full bg-fg px-4 text-sm font-semibold text-bg ${focusRing}`}
              >
                Buy Road Map Pro
              </a>
            </article>
            <article className="flex h-full flex-col rounded-card border border-line bg-surface px-5 py-5">
              <p className="text-xs font-medium tracking-widest text-muted uppercase">One-time</p>
              <h2 className="mt-2 font-display text-2xl text-fg">Mother Bar Levels</h2>
              <p className="mt-4 font-display text-4xl text-fg tabular-nums">
                {formatMoney(levelsPrice)}
                <span className="ml-2 font-sans text-sm font-medium text-muted">once</span>
              </p>
              <p className="mt-4 text-sm text-pretty text-fg">
                Marks the latest mother bar. High and low are solid dark orange lines. Open and
                close are dashed. Alerts when the close crosses them.
              </p>
              <p className="mt-3 text-sm text-muted">Not included with the desk.</p>
              <Link
                to="/tools/mother-bar-levels"
                className={`mt-6 inline-flex min-h-11 items-center justify-center rounded-full bg-fg px-4 text-sm font-semibold text-bg ${focusRing}`}
              >
                See Mother Bar Levels
              </Link>
            </article>
            <article className="flex h-full flex-col rounded-card border border-line bg-surface px-5 py-5">
              <p className="text-xs font-medium tracking-widest text-muted uppercase">One-time</p>
              <h2 className="mt-2 font-display text-2xl text-fg">Mother Bar Sweep Scan</h2>
              <p className="mt-4 font-display text-4xl text-fg tabular-nums">
                {formatMoney(scanPrice)}
                <span className="ml-2 font-sans text-sm font-medium text-muted">once</span>
              </p>
              <p className="mt-4 text-sm text-pretty text-fg">
                A Stock Hacker scan. By default it finds a bar that trades under the mother low and
                closes back above it, within 10 bars of the inside bar.
              </p>
              <p className="mt-3 text-sm text-muted">Not included with the desk.</p>
              <Link
                to="/tools/mother-bar-sweep-scan"
                className={`mt-6 inline-flex min-h-11 items-center justify-center rounded-full bg-fg px-4 text-sm font-semibold text-bg ${focusRing}`}
              >
                See the sweep scan
              </Link>
            </article>
          </div>
          <p className="mt-4 max-w-2xl text-sm text-pretty text-muted">{BUNDLE_LINE}</p>

          <div className="mt-8 max-w-2xl border-t border-line pt-6">
            <p className="text-sm text-pretty text-fg">
              The desk scores the headlines. The Road Map shows the chart structure.
            </p>
            <Link
              to="/join"
              search={{ plan: "monthly" }}
              className={`mt-2 inline-flex min-h-11 items-center text-sm font-medium text-signal ${focusRing}`}
            >
              Try the full desk · {MONTHLY_TRIAL_DAYS} days free
            </Link>
            <p className="mt-4 text-sm text-pretty text-fg">
              New to options?{" "}
              <Link to="/learn/options-101" className={`font-medium text-signal ${focusRing}`}>
                Start Options 101 free
              </Link>
            </p>
            <p className="mt-2 text-sm text-pretty text-fg">
              Trading spreads?{" "}
              <Link to="/learn/options-201" className={`font-medium text-signal ${focusRing}`}>
                Options 201: Vertical Spreads
              </Link>
            </p>
          </div>
        </section>
      </main>
      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-5 gap-y-1 px-4 py-6 text-xs text-muted md:px-8">
          <p>
            Not financial advice. A chart study or scan, not a recommendation to trade. Not
            affiliated with or endorsed by Charles Schwab or thinkorswim.
          </p>
          <Link to="/learn" className={`inline-flex min-h-11 items-center ${focusRing}`}>
            Classes
          </Link>
        </div>
      </footer>
    </div>
  );
}
