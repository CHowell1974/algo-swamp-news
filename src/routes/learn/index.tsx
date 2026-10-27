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
        <p className="text-xs font-medium tracking-widest text-signal uppercase">Classes</p>
        <h1 className="mt-3 font-display text-5xl text-balance text-fg md:text-7xl">
          Options classes
        </h1>
        <p className="mt-4 max-w-2xl text-sm text-pretty text-muted">
          Two courses. Options 101 is the beginner class. Options 201 builds vertical spreads on
          that foundation. Each course is $39 once, or included with an active desk.
        </p>
        <div className="mt-10 grid gap-6 md:grid-cols-2">
          <article className="rounded-card border border-line bg-surface p-6">
            <p className="text-xs font-medium tracking-widest text-muted uppercase">Beginner</p>
            <h2 className="mt-2 font-display text-4xl text-fg">Options 101</h2>
            <p className="mt-2 font-display text-xl text-signal italic">
              Options trading for beginners
            </p>
            <p className="mt-4 text-sm text-pretty text-muted">
              Calls, puts, strikes, the Greeks, and risk. Eight modules. Modules 1–2 are free.
            </p>
            <Link
              to="/learn/options-101"
              className={`mt-6 inline-flex min-h-11 items-center rounded-full bg-signal px-5 text-sm font-semibold text-bg ${focusRing}`}
            >
              Open Options 101
            </Link>
          </article>
          <article className="rounded-card border border-line bg-surface p-6">
            <p className="text-xs font-medium tracking-widest text-muted uppercase">Intermediate</p>
            <h2 className="mt-2 font-display text-4xl text-fg">Options 201</h2>
            <p className="mt-2 font-display text-xl text-signal italic">Vertical spreads</p>
            <p className="mt-4 text-sm text-pretty text-fg">101 recommended first.</p>
            <p className="mt-2 text-sm text-pretty text-muted">
              Debit and credit verticals, max profit, max loss, and break-even. Eight modules.
              Module 1 is free.
            </p>
            <Link
              to="/learn/options-201"
              className={`mt-6 inline-flex min-h-11 items-center rounded-full bg-heat px-5 text-sm font-semibold text-bg ${focusRing}`}
            >
              Open Options 201
            </Link>
          </article>
        </div>
      </main>
    </CourseShell>
  );
}
