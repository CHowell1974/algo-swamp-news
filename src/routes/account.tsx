import { useEffect, useState } from "react";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Masthead } from "@/components/masthead";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import {
  beginCheckout,
  cancelMembership,
  getMembership,
  openBillingPortal,
  resumeMembership,
  type Membership,
} from "@/lib/membership.functions";
import { formatMoney, formatWhen, PLANS, type PlanId } from "@/lib/plans";
import { ACCOUNT_PAGE, routeHead } from "@/lib/seo";

export const Route = createFileRoute("/account")({
  head: () => routeHead(ACCOUNT_PAGE),
  component: AccountPage,
});

const focusRing =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal";

function AccountPage() {
  const { user, isPending } = useCurrentUserState();
  const router = useRouter();
  const load = useServerFn(getMembership);
  const cancel = useServerFn(cancelMembership);
  const resume = useServerFn(resumeMembership);
  const checkout = useServerFn(beginCheckout);
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
        if (!cancelled) setError("Could not load the plan.");
      });
    return () => {
      cancelled = true;
    };
  }, [user?.id, load]);

  async function pay(plan: PlanId) {
    setPending(true);
    setError(null);
    try {
      const { url } = await checkout({ data: { plan } });
      window.location.assign(url);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Could not open checkout.",
      );
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
      setError(
        cause instanceof Error ? cause.message : "Could not open billing.",
      );
      setPending(false);
    }
  }

  async function run(action: () => Promise<Membership>) {
    setPending(true);
    setError(null);
    try {
      setMembership(await action());
      await router.invalidate();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "That change did not stick.",
      );
    } finally {
      setPending(false);
    }
  }

  if (isPending) {
    return (
      <div className="min-h-screen">
        <Masthead />
        <main className="mx-auto max-w-xl px-4 py-12">
          <div className="h-10 w-48 animate-pulse rounded-full bg-surface" />
        </main>
      </div>
    );
  }

  if (!user) return <RedirectToSignIn to="/login" />;

  const other: PlanId | null =
    membership?.plan === "annual"
      ? "monthly"
      : membership?.plan === "monthly"
        ? "annual"
        : null;

  return (
    <div className="min-h-screen">
      <Masthead />
      <main className="mx-auto max-w-xl px-4 py-12 md:px-8">
        <p className="text-xs font-medium tracking-widest text-muted uppercase">
          Plan
        </p>
        <h1 className="mt-3 font-display text-5xl text-balance text-fg">
          Your desk
        </h1>
        <p className="mt-3 text-sm text-muted">
          {user.primaryEmail ?? user.displayName ?? "Signed in"}
        </p>

        <section className="mt-8 rounded-card border border-line bg-surface p-5">
          {!membership ? (
            <div className="h-16 animate-pulse rounded-xl bg-surface-2" />
          ) : null}
          {membership && !membership.active ? (
            <>
              <h2 className="font-display text-3xl text-fg">No active desk</h2>
              <p className="mt-2 text-sm text-pretty text-muted">
                The open tape is still public. A monthly or annual plan opens
                the rest of the wire.
              </p>
              <Link
                to="/join"
                search={{ plan: "annual" }}
                className={`mt-5 inline-flex min-h-11 items-center rounded-full bg-signal px-5 text-sm font-semibold text-bg ${focusRing}`}
              >
                See annual · {formatMoney(PLANS.annual.price)}
              </Link>
            </>
          ) : null}
          {membership?.active && membership.plan ? (
            <>
              <p className="text-xs font-medium tracking-widest text-signal uppercase">
                {membership.cancelAtPeriodEnd ? "Ends this period" : "Active"}
              </p>
              <h2 className="mt-2 font-display text-3xl text-fg">
                {PLANS[membership.plan].label}
              </h2>
              <p className="mt-2 text-sm text-muted tabular-nums">
                {formatMoney(PLANS[membership.plan].price)}{" "}
                {PLANS[membership.plan].cadence}
                {membership.currentPeriodEnd
                  ? ` · ${membership.cancelAtPeriodEnd ? "ends" : "renews"} ${formatWhen(membership.currentPeriodEnd)}`
                  : ""}
              </p>
              {error ? <p className="mt-3 text-sm text-heat">{error}</p> : null}
              <div className="mt-5 flex flex-wrap gap-2">
                <Link
                  to="/desk"
                  className={`inline-flex min-h-11 items-center rounded-full bg-signal px-4 text-sm font-semibold text-bg ${focusRing}`}
                >
                  Open the desk
                </Link>
                {membership.managedByStripe ? (
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => void billing()}
                    className={`inline-flex min-h-11 items-center rounded-full bg-surface-2 px-4 text-sm font-medium text-fg disabled:opacity-50 ${focusRing}`}
                  >
                    {pending ? "Opening…" : "Manage billing"}
                  </button>
                ) : membership.cancelAtPeriodEnd ? (
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => void run(() => resume())}
                    className={`inline-flex min-h-11 items-center rounded-full bg-surface-2 px-4 text-sm font-medium text-fg disabled:opacity-50 ${focusRing}`}
                  >
                    Resume
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => void run(() => cancel())}
                    className={`inline-flex min-h-11 items-center rounded-full bg-surface-2 px-4 text-sm font-medium text-fg disabled:opacity-50 ${focusRing}`}
                  >
                    Cancel at period end
                  </button>
                )}
                {!membership.managedByStripe && membership.plan ? (
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => void pay(membership.plan as PlanId)}
                    className={`inline-flex min-h-11 items-center rounded-full px-4 text-sm text-muted disabled:opacity-50 ${focusRing}`}
                  >
                    Pay with Stripe
                  </button>
                ) : null}
                {other && !membership.managedByStripe ? (
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => void pay(other)}
                    className={`inline-flex min-h-11 items-center rounded-full px-4 text-sm text-muted disabled:opacity-50 ${focusRing}`}
                  >
                    Switch to {PLANS[other].label.toLowerCase()}
                  </button>
                ) : null}
              </div>
              {membership.managedByStripe ? (
                <p className="mt-3 text-xs text-muted">
                  Cancel in Stripe and the desk stays open until this date.
                  Cancelling during the monthly trial means no charge.
                </p>
              ) : (
                <p className="mt-3 text-xs text-muted">
                  This period is not a Stripe subscription. Pay with Stripe to
                  bill the {PLANS[membership.plan].label.toLowerCase()} desk.
                </p>
              )}
            </>
          ) : null}
          {error && !membership?.active ? (
            <p className="mt-3 text-sm text-heat">{error}</p>
          ) : null}
        </section>
      </main>
    </div>
  );
}
