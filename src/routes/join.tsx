import { useEffect, useState } from "react";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { AuthPanel } from "@/components/auth-panel";
import { FounderLine } from "@/components/founder-line";
import { Masthead } from "@/components/masthead";
import { SignInGate } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import {
  getMembership,
  openBillingPortal,
  resumeMembership,
  beginCheckout,
  type Membership,
} from "@/lib/membership.functions";
import { formatMoney, formatWhen, MONTHLY_TRIAL_DAYS, PLANS, type PlanId } from "@/lib/plans";

export const Route = createFileRoute("/join")({
  validateSearch: (search: Record<string, unknown>): { plan: PlanId } => ({
    plan: search.plan === "monthly" ? "monthly" : "annual",
  }),
  component: JoinPage,
});

const focusRing =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal";

function JoinPage() {
  const { plan } = Route.useSearch();
  const chosen = PLANS[plan];
  const router = useRouter();
  const { user, isPending } = useCurrentUserState();
  const load = useServerFn(getMembership);
  const checkout = useServerFn(beginCheckout);
  const resume = useServerFn(resumeMembership);
  const portal = useServerFn(openBillingPortal);
  const [membership, setMembership] = useState<Membership | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    load()
      .then((next) => {
        if (!cancelled) setMembership(next);
      })
      .catch(() => {
        if (!cancelled) setError("Could not read the current plan.");
      });
    return () => {
      cancelled = true;
    };
  }, [user?.id, load]);

  const samePlan = membership?.active && membership.plan === plan;
  const callbackURL = `/join?plan=${plan}`;

  async function confirm() {
    setPending(true);
    setError(null);
    try {
      const { url } = await checkout({ data: { plan } });
      window.location.assign(url);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not open checkout.");
      setPending(false);
    }
  }

  async function billing() {
    setPending(true);
    setError(null);
    try {
      const { url } = await portal();
      window.location.assign(url);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not open billing.");
      setPending(false);
    }
  }

  async function resumePlan() {
    setPending(true);
    setError(null);
    try {
      const next = await resume();
      setMembership(next);
      await router.navigate({ to: "/desk" });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not resume the desk.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="min-h-screen">
      <Masthead />
      <main className="mx-auto grid max-w-6xl gap-8 px-4 py-10 md:px-8 lg:grid-cols-2">
        <section>
          <p className="text-xs font-medium tracking-widest text-signal uppercase">Start a desk</p>
          <h1 className="mt-3 font-display text-5xl text-balance text-fg">{chosen.label}</h1>
          <p className="mt-4 font-display text-6xl text-fg tabular-nums">
            {formatMoney(chosen.price)}
            <span className="ml-2 font-sans text-base text-muted">{chosen.cadence}</span>
          </p>
          <p className="mt-4 max-w-md text-sm text-pretty text-muted">{chosen.detail}</p>
          <ul className="mt-6 space-y-2 text-sm text-fg">
            <li>Full wire, all six lanes</li>
            <li>Heat sort, ticker tape, pins, and watchlist</li>
            <li>Night note on the stories in view</li>
          </ul>
          <p className="mt-6 text-sm text-muted">
            <Link to="/" hash="pricing" className={`text-signal ${focusRing}`}>
              See both rates
            </Link>
          </p>
        </section>
        <section className="rounded-card border border-line bg-surface p-5 md:p-6">
          {isPending ? <div className="h-11 animate-pulse rounded-full bg-surface-2" /> : null}
          <SignInGate fallback={<AuthPanel callbackURL={callbackURL} />}>
            <div className="space-y-4">
              <h2 className="font-display text-3xl text-fg">
                {samePlan ? "Already on this desk" : "Pay on Stripe"}
              </h2>
              {samePlan && membership?.cancelAtPeriodEnd ? (
                <p className="text-sm text-muted">
                  This plan is set to end{" "}
                  {membership.currentPeriodEnd ? formatWhen(membership.currentPeriodEnd) : "soon"}.
                  Resume it without starting a new period.
                </p>
              ) : null}
              {samePlan && !membership?.cancelAtPeriodEnd ? (
                <p className="text-sm text-muted">
                  You already have the {chosen.label.toLowerCase()} desk
                  {membership?.currentPeriodEnd
                    ? ` through ${formatWhen(membership.currentPeriodEnd)}`
                    : ""}
                  .
                </p>
              ) : null}
              {!samePlan && plan === "monthly" ? (
                <>
                  <p className="text-sm text-pretty text-muted">
                    Try the full desk free for {MONTHLY_TRIAL_DAYS} days, then{" "}
                    {formatMoney(PLANS.monthly.price)}/mo. Stripe collects a card now and charges
                    after the trial. Cancel anytime before then and you are not charged. The desk
                    opens as soon as checkout completes.
                  </p>
                  <FounderLine className="text-sm text-signal" />
                </>
              ) : null}
              {!samePlan && plan === "annual" ? (
                <p className="text-sm text-pretty text-muted">
                  Stripe hosts the card for the annual desk at {formatMoney(PLANS.annual.price)} a
                  year. There is no trial. The desk opens after payment.
                </p>
              ) : null}
              {error ? <p className="text-sm text-heat">{error}</p> : null}
              {samePlan && !membership?.cancelAtPeriodEnd ? (
                <Link
                  to="/desk"
                  className={`inline-flex min-h-11 items-center rounded-full bg-signal px-5 text-sm font-semibold text-bg ${focusRing}`}
                >
                  Open the desk
                </Link>
              ) : null}
              {samePlan && membership?.cancelAtPeriodEnd && membership.managedByStripe ? (
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => void billing()}
                  className={`inline-flex min-h-11 items-center rounded-full bg-signal px-5 text-sm font-semibold text-bg disabled:opacity-50 ${focusRing}`}
                >
                  {pending ? "Opening billing…" : "Manage billing"}
                </button>
              ) : null}
              {samePlan && membership?.cancelAtPeriodEnd && !membership.managedByStripe ? (
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => void resumePlan()}
                  className={`inline-flex min-h-11 items-center rounded-full bg-signal px-5 text-sm font-semibold text-bg disabled:opacity-50 ${focusRing}`}
                >
                  {pending ? "Working…" : "Resume this desk"}
                </button>
              ) : null}
              {!samePlan ? (
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => void confirm()}
                  className={`inline-flex min-h-11 items-center rounded-full bg-signal px-5 text-sm font-semibold text-bg disabled:opacity-50 ${focusRing}`}
                >
                  {pending ? "Working…" : `Continue to checkout`}
                </button>
              ) : null}
            </div>
          </SignInGate>
        </section>
      </main>
    </div>
  );
}
