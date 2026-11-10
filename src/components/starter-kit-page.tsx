import { useEffect, useState, type ReactNode } from "react";
import { Link, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { CourseCheckoutButton, CourseShell, focusRing } from "@/components/course-ui";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { STARTER_KIT_ID } from "@/lib/course/access";
import { formatMoney } from "@/lib/plans";
import { beginStarterKitDeskTrial, confirmStarterKitCheckout } from "@/lib/starter-kit.functions";
import {
  STARTER_KIT_DESK_TRIAL_COPY,
  STARTER_KIT_FAQ,
  STARTER_KIT_ITEMS,
  STARTER_KIT_LIST_USD,
  starterKitPriceUsd,
  starterKitPublicBonusLine,
  type StarterKitPageState,
} from "@/lib/starter-kit";
import { STUDY_DISCLAIMER } from "@/lib/studies/catalog";

function ItemLink({ id, children }: { id: string; children: ReactNode }) {
  const className = `font-medium text-fg hover:text-signal ${focusRing}`;
  if (id === "options-101") {
    return (
      <Link to="/learn/options-101" className={className}>
        {children}
      </Link>
    );
  }
  if (id === "options-201") {
    return (
      <Link to="/learn/options-201" className={className}>
        {children}
      </Link>
    );
  }
  if (id === "mother-bar-levels") {
    return (
      <Link to="/tools/mother-bar-levels" className={className}>
        {children}
      </Link>
    );
  }
  return (
    <Link to="/tools/mother-bar-sweep-scan" className={className}>
      {children}
    </Link>
  );
}

export function StarterKitPage({
  initial,
  sessionId,
}: {
  initial: StarterKitPageState;
  sessionId?: string;
}) {
  const router = useRouter();
  const { user, isPending } = useCurrentUserState();
  const confirm = useServerFn(confirmStarterKitCheckout);
  const startDesk = useServerFn(beginStarterKitDeskTrial);
  const [state, setState] = useState(initial);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const price = starterKitPriceUsd();
  const bonusLine = starterKitPublicBonusLine({
    owned: state.owned,
    bonusOpen: state.bonusOpen,
  });

  useEffect(() => {
    setState(initial);
  }, [initial]);

  useEffect(() => {
    if (!sessionId || isPending) return;
    if (!user?.id) {
      setNotice("Sign in with the same account to finish checkout.");
      return;
    }
    let cancelled = false;
    setNotice("Confirming payment…");
    confirm({ data: { sessionId } })
      .then(async (next) => {
        if (cancelled) return;
        setState(next);
        setNotice("Payment received. The kit is unlocked.");
        await router.navigate({ to: "/starter-kit", search: {}, replace: true });
      })
      .catch((cause: unknown) => {
        if (!cancelled) {
          setNotice(cause instanceof Error ? cause.message : "Checkout could not be confirmed.");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [sessionId, user?.id, isPending, confirm, router]);

  return (
    <CourseShell>
      <main className="mx-auto max-w-6xl px-4 py-10 md:px-8 md:py-14">
        <aside className="max-w-3xl border-l-2 border-heat bg-surface px-4 py-3 text-sm text-pretty text-muted">
          <p className="text-xs font-medium tracking-widest text-heat uppercase">
            Not financial advice
          </p>
          <p className="mt-1">{STUDY_DISCLAIMER}</p>
        </aside>
        {notice ? <p className="mt-4 text-sm text-heat">{notice}</p> : null}

        <p className="mt-8 text-xs font-medium tracking-widest text-signal uppercase">
          One-time bundle
        </p>
        <h1 className="mt-3 max-w-3xl font-display text-5xl text-balance text-fg md:text-7xl">
          Swamp Starter Kit
        </h1>
        <p className="mt-3 font-display text-2xl text-signal italic md:text-3xl">
          Four products. One checkout.
        </p>
        <p className="mt-4 max-w-2xl text-base text-pretty text-muted">
          Options 101, Options 201: Vertical Spreads, the Mother Bar Levels thinkorswim study, and
          the Mother Bar Sweep Scan. Each one still sells on its own. This is all four, once.
        </p>

        <div className="mt-8 grid items-start gap-6 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
          <section className="rounded-card border border-line bg-surface p-6">
            <p className="text-xs font-medium tracking-widest text-muted uppercase">
              {formatMoney(STARTER_KIT_LIST_USD)} value
            </p>
            <p className="mt-3 flex flex-wrap items-end gap-x-3 gap-y-1">
              <span className="sr-only">Was </span>
              <span className="font-display text-3xl text-muted line-through tabular-nums">
                {formatMoney(STARTER_KIT_LIST_USD)}
              </span>
              <span className="sr-only">, now </span>
              <span className="font-display text-6xl text-fg tabular-nums">
                {formatMoney(price)}
              </span>
              <span className="pb-2 text-sm text-muted">once</span>
            </p>
            {bonusLine ? <p className="mt-4 text-sm font-medium text-signal">{bonusLine}</p> : null}
            <div className="mt-6">
              {state.owned ? (
                <p className="text-sm font-medium text-signal">You own the Swamp Starter Kit.</p>
              ) : (
                <CourseCheckoutButton
                  courseId={STARTER_KIT_ID}
                  signedIn={state.signedIn || Boolean(user)}
                  next="/starter-kit"
                  priceUsd={price}
                />
              )}
            </div>
            <p className="mt-4 text-sm text-muted">One-time charge. Not a subscription.</p>
          </section>

          <section aria-labelledby="starter-kit-includes">
            <h2 id="starter-kit-includes" className="font-display text-3xl text-fg">
              Included
            </h2>
            <ul className="mt-4 divide-y divide-line border-y border-line">
              {STARTER_KIT_ITEMS.map((item) => (
                <li key={item.id} className="flex items-baseline justify-between gap-4 py-4">
                  <ItemLink id={item.id}>{item.name}</ItemLink>
                  <span className="shrink-0 text-sm text-muted line-through tabular-nums">
                    <span className="sr-only">Individual price </span>
                    {formatMoney(item.priceUsd)}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </div>

        {state.owned ? (
          <section className="mt-10 max-w-2xl" aria-labelledby="starter-kit-unlocked">
            <h2 id="starter-kit-unlocked" className="font-display text-3xl text-fg">
              Yours now
            </h2>
            <ul className="mt-4 space-y-2 text-sm">
              <li>
                <Link to="/learn/options-101" className={`font-medium text-signal ${focusRing}`}>
                  Open Options 101
                </Link>
              </li>
              <li>
                <Link to="/learn/options-201" className={`font-medium text-signal ${focusRing}`}>
                  Open Options 201: Vertical Spreads
                </Link>
              </li>
              <li>
                <a
                  href="/api/studies/mother-bar-levels"
                  className={`font-medium text-signal ${focusRing}`}
                >
                  Download MotherBarLevels.ts
                </a>
              </li>
              <li>
                <a
                  href="/api/studies/mother-bar-sweep-scan"
                  className={`font-medium text-signal ${focusRing}`}
                >
                  Download MotherBarSweepScan.ts
                </a>
              </li>
            </ul>
          </section>
        ) : null}

        {state.deskTrial === "offer" ? (
          <section className="mt-10 max-w-2xl rounded-card border border-line bg-surface p-6">
            <h2 className="font-display text-3xl text-fg">30 days of the desk</h2>
            <p className="mt-3 text-sm text-pretty text-muted">{STARTER_KIT_DESK_TRIAL_COPY}</p>
            <button
              type="button"
              className={`mt-5 inline-flex min-h-11 items-center justify-center rounded-full bg-fg px-5 text-sm font-semibold text-bg disabled:opacity-60 ${focusRing}`}
              disabled={pending}
              onClick={() => {
                setPending(true);
                setNotice(null);
                void startDesk()
                  .then(({ url }) => {
                    window.location.assign(url);
                  })
                  .catch((cause: unknown) => {
                    setNotice(
                      cause instanceof Error ? cause.message : "Could not open the desk trial.",
                    );
                    setPending(false);
                  });
              }}
            >
              {pending ? "Opening checkout…" : "Start 30 days of the desk"}
            </button>
          </section>
        ) : null}

        {state.deskTrial === "already-open" ? (
          <p className="mt-10 text-sm text-fg">
            Your desk is already open.{" "}
            <Link to="/desk" className={`font-medium text-signal ${focusRing}`}>
              Open the desk
            </Link>
          </p>
        ) : null}

        <section className="mt-12 max-w-3xl" aria-labelledby="starter-kit-faq">
          <h2 id="starter-kit-faq" className="font-display text-3xl text-fg">
            Questions
          </h2>
          <div className="mt-4 divide-y divide-line border-y border-line">
            {STARTER_KIT_FAQ.map((item) => (
              <div key={item.question} className="py-4">
                <h3 className="font-display text-xl text-fg">{item.question}</h3>
                <p className="mt-2 text-sm text-pretty text-muted">{item.answer}</p>
              </div>
            ))}
          </div>
        </section>
      </main>
    </CourseShell>
  );
}
