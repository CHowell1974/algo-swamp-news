import { useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Lock } from "lucide-react";
import { CourseMarkdown } from "@/components/course-markdown";
import { Masthead } from "@/components/masthead";
import { beginCourseCheckout } from "@/lib/course.functions";
import type { CourseHome, ResolvedCta } from "@/lib/course/types";
import { formatMoney } from "@/lib/plans";
import { progressPercent } from "@/lib/course/access";

export const focusRing =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal";

export function CourseShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen">
      <div className="print:hidden">
        <Masthead />
      </div>
      {children}
    </div>
  );
}

export function CourseDisclaimer({ text }: { text: string }) {
  return (
    <aside className="border-l-2 border-heat bg-surface px-4 py-3 text-sm text-pretty text-muted">
      <p className="text-xs font-medium tracking-widest text-heat uppercase">
        Not financial advice
      </p>
      <p className="mt-1">{text}</p>
    </aside>
  );
}

export function CourseCheckoutButton({
  signedIn,
  next,
  priceUsd,
  emphasized = true,
}: {
  signedIn: boolean;
  next: string;
  priceUsd: number;
  emphasized?: boolean;
}) {
  const checkout = useServerFn(beginCourseCheckout);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const label = `Buy Options 101 · ${formatMoney(priceUsd)}`;
  const className = `inline-flex min-h-11 items-center justify-center rounded-full px-5 text-sm font-semibold ${focusRing} ${
    emphasized ? "bg-heat text-bg" : "bg-fg text-bg"
  }`;

  if (!signedIn) {
    return (
      <Link to="/login" search={{ next }} className={className}>
        {label}
      </Link>
    );
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <button
        type="button"
        className={`${className} disabled:opacity-60`}
        disabled={pending}
        onClick={() => {
          setPending(true);
          setError(null);
          void checkout()
            .then(({ url }) => {
              window.location.assign(url);
            })
            .catch((cause: unknown) => {
              setError(cause instanceof Error ? cause.message : "Could not open checkout.");
              setPending(false);
            });
        }}
      >
        {pending ? "Opening checkout…" : label}
      </button>
      {error ? <p className="max-w-sm text-sm text-heat">{error}</p> : null}
    </div>
  );
}

export function CourseProgress({ home }: { home: CourseHome }) {
  const total = home.modules.length;
  const percent = progressPercent(home.completedCount, total);
  return (
    <section
      aria-labelledby="course-progress-title"
      className="rounded-card border border-line bg-surface p-5"
    >
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-medium tracking-widest text-muted uppercase">Progress</p>
          <h2 id="course-progress-title" className="mt-1 font-display text-3xl text-fg">
            {home.completedCount} of {total} modules
          </h2>
        </div>
        <p className="text-sm text-muted tabular-nums">{percent}%</p>
      </div>
      <div
        className="mt-4 h-2 overflow-hidden rounded-full bg-surface-2"
        role="progressbar"
        aria-valuenow={home.completedCount}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-label="Modules with a saved quiz"
      >
        <div className="h-full bg-signal" style={{ width: `${percent}%` }} />
      </div>
      {!home.signedIn ? (
        <p className="mt-4 text-sm text-muted">
          <Link
            to="/login"
            search={{ next: "/learn" }}
            className={`font-medium text-signal ${focusRing}`}
          >
            Sign in
          </Link>{" "}
          to save quiz scores.
        </p>
      ) : null}
      <ul className="mt-4 divide-y divide-line">
        {home.modules.map((module, index) => (
          <li key={module.id} className="flex items-center justify-between gap-3 py-2 text-sm">
            <Link
              to="/learn/$moduleId"
              params={{ moduleId: module.id }}
              className={`min-w-0 truncate text-fg ${focusRing}`}
            >
              {index + 1}. {module.title}
            </Link>
            <span className="shrink-0 text-muted tabular-nums">
              {module.locked ? (
                <span className="inline-flex items-center gap-1">
                  <Lock className="size-3.5" aria-hidden="true" />
                  Locked
                </span>
              ) : module.bestCorrect == null ? (
                "Not taken"
              ) : (
                `Best ${module.bestCorrect}/${module.questionCount}`
              )}
            </span>
          </li>
        ))}
        <li className="flex items-center justify-between gap-3 py-2 text-sm">
          {home.entitled ? (
            <Link to="/learn/exam" className={`text-fg ${focusRing}`}>
              Final exam
            </Link>
          ) : (
            <span className="text-muted">Final exam</span>
          )}
          <span className="text-muted tabular-nums">
            {home.entitled ? (
              home.exam.passed ? (
                `Passed ${home.exam.bestCorrect}/${home.exam.questionCount}`
              ) : home.exam.bestCorrect == null ? (
                `Need ${home.exam.passingScoreCount}`
              ) : (
                `Best ${home.exam.bestCorrect}/${home.exam.questionCount}`
              )
            ) : (
              <span className="inline-flex items-center gap-1">
                <Lock className="size-3.5" aria-hidden="true" />
                Locked
              </span>
            )}
          </span>
        </li>
      </ul>
      {home.exam.passed ? (
        <Link
          to="/learn/certificate"
          className={`mt-3 inline-flex min-h-11 items-center text-sm font-medium text-signal ${focusRing}`}
        >
          View certificate
        </Link>
      ) : null}
    </section>
  );
}

export function CourseClosing({
  text,
  ctas,
  disclaimer,
}: {
  text: string;
  ctas: ResolvedCta[];
  disclaimer: string;
}) {
  return (
    <section className="mt-10 border-t border-line pt-8">
      <h2 className="font-display text-3xl text-fg">What to do next</h2>
      <div className="mt-4">
        <CourseMarkdown text={text} />
      </div>
      <div className="mt-6 flex flex-col items-start gap-3 sm:flex-row sm:flex-wrap">
        {ctas.map((cta) => (
          <CtaLink key={cta.label} cta={cta} />
        ))}
      </div>
      <div className="mt-8">
        <CourseDisclaimer text={disclaimer} />
      </div>
    </section>
  );
}

function CtaLink({ cta }: { cta: ResolvedCta }) {
  const className = `inline-flex min-h-11 items-center justify-center rounded-full bg-signal px-5 text-sm font-semibold text-bg ${focusRing}`;
  if (cta.kind === "tools") {
    return (
      <Link to="/tools" className={className}>
        {cta.label}
      </Link>
    );
  }
  if (cta.kind === "desk-trial") {
    return (
      <Link to="/join" search={{ plan: "monthly" }} className={`${className} bg-fg`}>
        {cta.label}
      </Link>
    );
  }
  return (
    <a href={cta.href} className={className}>
      {cta.label}
    </a>
  );
}
