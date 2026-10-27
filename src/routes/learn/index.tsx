import { useEffect } from "react";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { CourseShell, focusRing } from "@/components/course-ui";
import { CLASSES_PAGE, routeHead } from "@/lib/seo";

export const Route = createFileRoute("/learn/")({
  validateSearch: (search: Record<string, unknown>): { session_id?: string } => {
    const raw = typeof search.session_id === "string" ? search.session_id : "";
    return raw.startsWith("cs_") ? { session_id: raw } : {};
  },
  head: () => routeHead(CLASSES_PAGE),
  component: ClassesPage,
});

function ClassesPage() {
  const { session_id: sessionId } = Route.useSearch();
  const router = useRouter();

  useEffect(() => {
    if (!sessionId) return;
    void router.navigate({
      to: "/learn/options-101",
      search: { session_id: sessionId },
      replace: true,
    });
  }, [sessionId, router]);

  return (
    <CourseShell>
      <main className="mx-auto max-w-6xl px-4 py-8 md:px-8 md:py-12">
        <h1 className="font-display text-5xl text-balance text-fg md:text-7xl">
          Options Trading Classes
        </h1>
        <p className="mt-3 font-display text-2xl text-signal italic md:text-3xl">Wait. Then Bite.</p>
        <p className="mt-4 max-w-2xl text-sm text-pretty text-muted">
          Two self-paced options classes from ALGO Swamp. Start with Options 101 if you're new to
          options, then move on to Options 201: Vertical Spreads. Every class has short lessons,
          worked examples, thinkorswim tips, quizzes, and a final exam. Educational content, not
          financial advice.
        </p>
        <div className="mt-10 grid gap-6 md:grid-cols-2">
          <article className="rounded-card border border-line bg-surface p-6">
            <h2 className="font-display text-3xl text-fg">
              Options 101: Options Trading for Beginners
            </h2>
            <p className="mt-3 text-sm text-pretty text-muted">
              Beginner · 8 modules · Modules 1–2 free · $39 once or included with the desk
            </p>
            <div className="mt-4 flex flex-col items-start">
              <Link
                to="/learn/options-101"
                className={`inline-flex min-h-11 items-center text-sm font-medium text-signal ${focusRing}`}
              >
                See the Options 101 course
              </Link>
              <Link
                to="/learn/options-101/$moduleId"
                params={{ moduleId: "m1-what-is-an-option" }}
                className={`inline-flex min-h-11 items-center text-sm font-medium text-fg ${focusRing}`}
              >
                Start free: What is an option?
              </Link>
            </div>
          </article>
          <article className="rounded-card border border-line bg-surface p-6">
            <h2 className="font-display text-3xl text-fg">Options 201: Vertical Spreads</h2>
            <p className="mt-3 text-sm text-pretty text-muted">
              Intermediate · 8 modules · Modules 1–3 free · $39 once or included with the desk
            </p>
            <p className="mt-2 text-sm text-fg">Prerequisite: Options 101</p>
            <div className="mt-4 flex flex-col items-start">
              <Link
                to="/learn/options-201"
                className={`inline-flex min-h-11 items-center text-sm font-medium text-signal ${focusRing}`}
              >
                See the Options 201 course
              </Link>
              <Link
                to="/learn/options-201/$moduleId"
                params={{ moduleId: "m1-what-is-a-vertical" }}
                className={`inline-flex min-h-11 items-center text-sm font-medium text-fg ${focusRing}`}
              >
                Start free: What is a vertical spread?
              </Link>
            </div>
          </article>
        </div>
        <section className="mt-12" aria-labelledby="which-class">
          <h2 id="which-class" className="font-display text-3xl text-fg">
            Which class should I take?
          </h2>
          <p className="mt-3 max-w-2xl text-sm text-pretty text-muted">
            New to options? Take Options 101 first. It covers calls and puts, strikes, the Greeks,
            and position sizing. Already comfortable with single calls and puts? Options 201 shows
            you how to combine them into vertical spreads with defined risk.
          </p>
        </section>
      </main>
    </CourseShell>
  );
}
