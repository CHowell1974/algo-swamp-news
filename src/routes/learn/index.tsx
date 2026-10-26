import { useEffect, useState } from "react";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Lock } from "lucide-react";
import { CourseMarkdown } from "@/components/course-markdown";
import {
  CourseCheckoutButton,
  CourseDisclaimer,
  CourseProgress,
  CourseShell,
  focusRing,
} from "@/components/course-ui";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { confirmCourseCheckout, getCourseHome } from "@/lib/course.functions";
import { continueTarget } from "@/lib/course/access";
import type { CourseHome } from "@/lib/course/types";
import { formatMoney } from "@/lib/plans";
import { COURSE_FAQ, LEARN_PAGE, routeHead } from "@/lib/seo";

export const Route = createFileRoute("/learn/")({
  validateSearch: (
    search: Record<string, unknown>,
  ): { session_id?: string } => {
    const raw = typeof search.session_id === "string" ? search.session_id : "";
    return raw.startsWith("cs_") ? { session_id: raw } : {};
  },
  loader: () => getCourseHome(),
  head: () => routeHead(LEARN_PAGE),
  component: LearnPage,
});

function LearnPage() {
  const initial = Route.useLoaderData();
  const { session_id: sessionId } = Route.useSearch();
  const router = useRouter();
  const { user, isPending } = useCurrentUserState();
  const confirm = useServerFn(confirmCourseCheckout);
  const [home, setHome] = useState<CourseHome>(initial);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    setHome(initial);
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
        setHome(next);
        setNotice("Options 101 is unlocked.");
        await router.navigate({ to: "/learn", search: {}, replace: true });
      })
      .catch((cause: unknown) => {
        if (!cancelled) {
          setNotice(
            cause instanceof Error
              ? cause.message
              : "Checkout could not be confirmed.",
          );
        }
      });
    return () => {
      cancelled = true;
    };
  }, [sessionId, user?.id, isPending, confirm, router]);

  const target = continueTarget(home.modules, home.exam.passed);
  const firstId = home.modules[0]?.id;

  return (
    <CourseShell>
      <main className="mx-auto max-w-6xl px-4 py-8 md:px-8 md:py-12">
        <CourseDisclaimer text={home.disclaimer} />
        {notice ? <p className="mt-4 text-sm text-heat">{notice}</p> : null}
        <p className="mt-8 text-xs font-medium tracking-widest text-signal uppercase">
          {home.level}
        </p>
        <h1 className="mt-3 font-display text-5xl text-balance text-fg md:text-7xl">
          {home.title}
          <span className="sr-only">: </span>
          <span className="block text-2xl text-muted md:text-3xl">
            Options trading for beginners
          </span>
        </h1>
        <p className="mt-3 font-display text-2xl text-signal italic md:text-3xl">
          {home.tagline}
        </p>
        <div className="mt-6 max-w-2xl">
          <CourseMarkdown text={home.intro} />
        </div>
        <p className="mt-6 text-sm text-muted">
          <span className="font-display text-4xl text-fg tabular-nums">
            {formatMoney(home.priceUsd)}
          </span>
          <span className="ml-2">once</span>
          <span className="mx-2">·</span>
          included with an active desk
        </p>
        <div className="mt-6 flex flex-col items-start gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          {target.kind === "module" && firstId ? (
            <Link
              to="/learn/$moduleId"
              params={{ moduleId: target.id }}
              className={`inline-flex min-h-11 items-center rounded-full bg-signal px-5 text-sm font-semibold text-bg ${focusRing}`}
            >
              {target.label === "start" ? "Start Modules 1–2 free" : "Continue"}
            </Link>
          ) : null}
          {target.kind === "exam" ? (
            <Link
              to="/learn/exam"
              className={`inline-flex min-h-11 items-center rounded-full bg-signal px-5 text-sm font-semibold text-bg ${focusRing}`}
            >
              Take the final exam
            </Link>
          ) : null}
          {target.kind === "certificate" ? (
            <Link
              to="/learn/certificate"
              className={`inline-flex min-h-11 items-center rounded-full bg-signal px-5 text-sm font-semibold text-bg ${focusRing}`}
            >
              View certificate
            </Link>
          ) : null}
          {target.kind === "locked" && firstId ? (
            <Link
              to="/learn/$moduleId"
              params={{ moduleId: firstId }}
              className={`inline-flex min-h-11 items-center text-sm font-medium text-fg ${focusRing}`}
            >
              Review Module 1
            </Link>
          ) : null}
          {home.entitled ? (
            <p className="text-sm font-medium text-signal">
              {home.accessVia === "desk"
                ? "Included with your desk."
                : "You own this course."}
            </p>
          ) : (
            <CourseCheckoutButton
              signedIn={home.signedIn}
              next="/learn"
              priceUsd={home.priceUsd}
            />
          )}
        </div>

        <section className="mt-10" aria-labelledby="learn-outcomes">
          <h2 id="learn-outcomes" className="font-display text-3xl text-fg">
            What you'll learn
          </h2>
          <ul className="mt-4 grid gap-2 text-sm text-fg sm:grid-cols-2">
            {[
              "What an option is",
              "Calls and puts",
              "Strike price, expiration, and premium",
              "Intrinsic vs. extrinsic value",
              "The risk of buying vs. selling options",
              "The Greeks: delta, theta, vega, and gamma",
              "Reading an option chain in thinkorswim",
              "Position sizing from max loss",
            ].map((item) => (
              <li key={item} className="flex gap-2">
                <span className="text-signal" aria-hidden="true">
                  ·
                </span>
                {item}
              </li>
            ))}
          </ul>
        </section>

        <div className="mt-10 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <section aria-labelledby="outline-title">
            <h2 id="outline-title" className="font-display text-3xl text-fg">
              Course outline: {home.modules.length} modules
            </h2>
            <ol className="mt-4 divide-y divide-line border-y border-line">
              {home.modules.map((module, index) => (
                <li key={module.id}>
                  <Link
                    to="/learn/$moduleId"
                    params={{ moduleId: module.id }}
                    className={`flex items-start justify-between gap-4 py-4 ${focusRing}`}
                  >
                    <span>
                      <span className="text-xs font-medium tracking-widest text-muted uppercase">
                        Module {index + 1}
                        {module.free ? " · Free" : ""}
                        {module.completed ? " · Quiz saved" : ""}
                      </span>
                      <span className="mt-1 block font-display text-2xl text-fg">
                        {module.title}
                      </span>
                      <span className="mt-2 block text-sm text-pretty text-muted">
                        {module.learningObjectives.join(" · ")}
                      </span>
                    </span>
                    {module.locked ? (
                      <Lock
                        className="mt-1 size-4 shrink-0 text-muted"
                        aria-label="Locked"
                      />
                    ) : null}
                  </Link>
                </li>
              ))}
              <li className="flex items-start justify-between gap-4 py-4">
                <span>
                  <span className="text-xs font-medium tracking-widest text-muted uppercase">
                    Final exam · {home.exam.passingScoreCount} of{" "}
                    {home.exam.questionCount} to pass
                  </span>
                  <span className="mt-1 block font-display text-2xl text-fg">
                    {home.entitled ? (
                      <Link to="/learn/exam" className={focusRing}>
                        Final exam
                      </Link>
                    ) : (
                      "Final exam"
                    )}
                  </span>
                </span>
                {home.entitled ? null : (
                  <Lock
                    className="mt-1 size-4 shrink-0 text-muted"
                    aria-label="Locked"
                  />
                )}
              </li>
            </ol>
          </section>
          <CourseProgress home={home} />
        </div>

        <section className="mt-14" aria-labelledby="course-faq">
          <h2 id="course-faq" className="font-display text-3xl text-fg">
            Options 101 FAQ
          </h2>
          <div className="mt-4 divide-y divide-line border-y border-line">
            {COURSE_FAQ.map((item) => (
              <div key={item.question} className="py-4">
                <h3 className="font-display text-xl text-fg">
                  {item.question}
                </h3>
                <p className="mt-2 max-w-3xl text-sm text-pretty text-muted">
                  {item.answer}
                </p>
              </div>
            ))}
          </div>
        </section>
      </main>
    </CourseShell>
  );
}
