import { useEffect, useState } from "react";
import { Link, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { CourseCheckoutButton, CourseShell, focusRing } from "@/components/course-ui";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { MOTHER_BAR_LEVELS_ID } from "@/lib/course/access";
import { confirmStudyCheckout } from "@/lib/studies.functions";
import {
  BUNDLE_LINE,
  STUDY_DISCLAIMER,
  studyPriceUsd,
  type StudyPageCopy,
} from "@/lib/studies/catalog";
import { formatMoney } from "@/lib/plans";

export function StudyProductPage({
  copy,
  initial,
  sessionId,
}: {
  copy: StudyPageCopy;
  initial: { productId: string; signedIn: boolean; owned: boolean };
  sessionId?: string;
}) {
  const router = useRouter();
  const { user, isPending } = useCurrentUserState();
  const confirm = useServerFn(confirmStudyCheckout);
  const [owned, setOwned] = useState(initial.owned);
  const [signedIn, setSignedIn] = useState(initial.signedIn);
  const [notice, setNotice] = useState<string | null>(null);
  const price = studyPriceUsd(copy.id);

  useEffect(() => {
    setOwned(initial.owned);
    setSignedIn(initial.signedIn);
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
        if (next.productId !== copy.id) {
          setNotice("This checkout is for a different product.");
          return;
        }
        setOwned(true);
        setSignedIn(true);
        setNotice("Payment received. The file is ready to download.");
        if (copy.id === MOTHER_BAR_LEVELS_ID) {
          await router.navigate({
            to: "/tools/mother-bar-levels",
            search: {},
            replace: true,
          });
        } else {
          await router.navigate({
            to: "/tools/mother-bar-sweep-scan",
            search: {},
            replace: true,
          });
        }
      })
      .catch((cause: unknown) => {
        if (!cancelled) {
          setNotice(cause instanceof Error ? cause.message : "Checkout could not be confirmed.");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [sessionId, user?.id, isPending, confirm, router, copy.id]);

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

        <p className="mt-8 text-xs font-medium tracking-widest text-muted uppercase">
          <Link to="/tools" className={`hover:text-fg ${focusRing}`}>
            Tools
          </Link>
          <span aria-hidden="true"> · </span>
          {copy.eyebrow}
        </p>
        <h1 className="mt-3 max-w-3xl font-display text-5xl text-balance text-fg md:text-6xl">
          {copy.h1}
        </h1>
        <p className="mt-3 font-display text-2xl text-signal italic md:text-3xl">{copy.hook}</p>
        <p className="mt-4 max-w-2xl text-base text-pretty text-muted">{copy.lede}</p>

        <div className="mt-8 grid gap-4 lg:grid-cols-2">
          {copy.images.map((image) => (
            <figure key={image.src} className="overflow-hidden rounded-card border border-line">
              <img
                src={image.src}
                alt={image.alt}
                width={image.width}
                height={image.height}
                className="w-full"
              />
            </figure>
          ))}
          {copy.placeholder ? (
            <div
              className="flex min-h-64 items-center justify-center rounded-card border border-dashed border-line bg-surface px-6 py-16 text-center"
              role="img"
              aria-label={copy.placeholder}
            >
              <p className="font-display text-2xl text-muted">{copy.placeholder}</p>
            </div>
          ) : null}
        </div>

        <p className="mt-8 text-sm text-muted">
          <span className="font-display text-4xl text-fg tabular-nums">{formatMoney(price)}</span>
          <span className="ml-2">once</span>
        </p>
        <div className="mt-6 flex flex-col items-start gap-3">
          {owned ? (
            <>
              <p className="text-sm font-medium text-signal">You own this file.</p>
              <a
                href={`/api/studies/${copy.id}`}
                className={`inline-flex min-h-11 items-center justify-center rounded-full bg-signal px-5 text-sm font-semibold text-bg ${focusRing}`}
              >
                {copy.downloadLabel}
              </a>
            </>
          ) : (
            <CourseCheckoutButton
              courseId={copy.id}
              signedIn={signedIn || Boolean(user)}
              next={copy.pathname}
              priceUsd={price}
            />
          )}
        </div>

        <section className="mt-12 max-w-3xl" aria-labelledby="study-details">
          <h2 id="study-details" className="font-display text-3xl text-fg">
            {copy.detailTitle}
          </h2>
          <ul className="mt-4 space-y-2 text-sm text-fg">
            {copy.details.map((item) => (
              <li key={item} className="flex gap-2">
                <span className="text-signal" aria-hidden="true">
                  ·
                </span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-12 max-w-3xl" aria-labelledby="study-install">
          <h2 id="study-install" className="font-display text-3xl text-fg">
            {copy.installTitle}
          </h2>
          <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm text-fg">
            {copy.install.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </section>

        <section className="mt-12 max-w-3xl" aria-labelledby="study-faq">
          <h2 id="study-faq" className="font-display text-3xl text-fg">
            Questions
          </h2>
          <div className="mt-4 divide-y divide-line border-y border-line">
            {copy.faqs.map((item) => (
              <div key={item.question} className="py-4">
                <h3 className="font-display text-xl text-fg">{item.question}</h3>
                <p className="mt-2 text-sm text-pretty text-muted">{item.answer}</p>
              </div>
            ))}
          </div>
        </section>

        <p className="mt-10 max-w-2xl text-sm text-pretty text-fg">{BUNDLE_LINE}</p>
        <section className="mt-8 max-w-3xl" aria-labelledby="study-related">
          <h2 id="study-related" className="font-display text-2xl text-fg">
            Related
          </h2>
          <ul className="mt-3 space-y-2 text-sm text-fg">
            <li>
              <Link to={copy.relatedHref} className={`font-medium text-signal ${focusRing}`}>
                {copy.relatedLabel}
              </Link>
            </li>
            <li>
              <Link to="/tools" className={`font-medium text-signal ${focusRing}`}>
                Road Map — free thinkorswim study that paints inside and outside bars
              </Link>
            </li>
            <li>
              New to options?{" "}
              <Link to="/learn/options-101" className={`font-medium text-signal ${focusRing}`}>
                Options 101
              </Link>{" "}
              ·{" "}
              <Link to="/learn/options-201" className={`font-medium text-signal ${focusRing}`}>
                Options 201: Vertical Spreads
              </Link>
            </li>
          </ul>
        </section>
      </main>
    </CourseShell>
  );
}
