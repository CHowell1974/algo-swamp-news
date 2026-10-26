import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { CourseMarkdown, InlineMarkdown } from "@/components/course-markdown";
import { CourseQuiz } from "@/components/course-quiz";
import {
  CourseBreadcrumb,
  CourseCheckoutButton,
  CourseDisclaimer,
  CourseShell,
  focusRing,
} from "@/components/course-ui";
import { getModulePage } from "@/lib/course.functions";
import { moduleRobots, moduleSeo } from "@/lib/course/catalog";
import type { ModulePage } from "@/lib/course/types";
import { OG_LEARN_IMAGE, moduleJsonLd, routeHead } from "@/lib/seo";

export const Route = createFileRoute("/learn/$moduleId")({
  loader: async ({ params }) => {
    if (!moduleSeo(params.moduleId)) throw notFound();
    return getModulePage({ data: { moduleId: params.moduleId } });
  },
  head: ({ loaderData }) => {
    const seo = loaderData ? moduleSeo(loaderData.id) : undefined;
    if (!loaderData || !seo) {
      return routeHead({
        title: "Lesson not found — Options 101 — ALGO Swamp",
        description:
          "That Options 101 lesson does not exist. Start from the course outline.",
        pathname: "/learn",
        robots: "noindex,follow",
      });
    }
    return routeHead({
      title: seo.title,
      description: seo.description,
      pathname: `/learn/${seo.id}`,
      robots: moduleRobots(loaderData.index),
      ogImage: OG_LEARN_IMAGE,
      jsonLd: moduleJsonLd(loaderData.index, seo),
    });
  },
  notFoundComponent: LessonNotFound,
  component: ModuleLesson,
});

function LessonNotFound() {
  return (
    <CourseShell>
      <main className="mx-auto max-w-3xl px-4 py-16 md:px-8">
        <h1 className="font-display text-4xl text-fg">Lesson not found</h1>
        <p className="mt-3 text-sm text-muted">
          That Options 101 lesson does not exist.
        </p>
        <Link
          to="/learn"
          className={`mt-6 inline-flex min-h-11 items-center text-sm font-medium text-signal ${focusRing}`}
        >
          Back to Options 101
        </Link>
      </main>
    </CourseShell>
  );
}

function ModuleLesson() {
  const page = Route.useLoaderData();
  const seo = moduleSeo(page.id);
  return (
    <CourseShell>
      <main className="mx-auto max-w-3xl px-4 py-8 md:px-8 md:py-12">
        <CourseDisclaimer text={page.disclaimer} />
        <CourseBreadcrumb
          current={`Module ${page.index + 1} of ${page.moduleCount}`}
        />
        <h1 className="mt-3 font-display text-4xl text-balance text-fg md:text-5xl">
          {seo?.h1 ?? page.title}
        </h1>
        {page.access === "locked" ? (
          <LockedModule page={page} />
        ) : (
          <OpenModule page={page} />
        )}
        <ModulePager page={page} />
      </main>
    </CourseShell>
  );
}

function OpenModule({
  page,
}: {
  page: Extract<ModulePage, { access: "open" }>;
}) {
  return (
    <>
      <section className="mt-6">
        <h2 className="text-xs font-medium tracking-widest text-muted uppercase">
          What you'll learn in this module
        </h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-fg">
          {page.learningObjectives.map((objective) => (
            <li key={objective}>{objective}</li>
          ))}
        </ul>
      </section>
      <section className="mt-8">
        <h2 className="font-display text-3xl text-fg">Lesson</h2>
        <div className="mt-4">
          <CourseMarkdown text={page.lesson} />
        </div>
      </section>
      <section className="mt-8 rounded-card border border-line bg-surface px-4 py-5">
        <p className="text-xs font-medium tracking-widest text-signal uppercase">
          Worked example
        </p>
        <h2 className="mt-2 font-display text-2xl text-fg">
          {page.workedExample.title}
        </h2>
        <p className="mt-3 text-sm text-pretty text-fg">
          {page.workedExample.scenario}
        </p>
        <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm text-fg">
          {page.workedExample.steps.map((step) => (
            <li key={step}>
              <InlineMarkdown text={step} />
            </li>
          ))}
        </ol>
        <p className="mt-4 text-sm font-medium text-pretty text-fg">
          {page.workedExample.result}
        </p>
      </section>
      <section className="mt-8 rounded-card border border-heat/40 bg-surface px-4 py-5">
        <p className="text-xs font-medium tracking-widest text-heat uppercase">
          {page.tosTip.platform}
        </p>
        <h2 className="mt-2 font-display text-2xl text-fg">
          {page.tosTip.title}
        </h2>
        <p className="mt-3 text-sm text-pretty text-fg">{page.tosTip.text}</p>
      </section>
      {page.video ? (
        <section className="mt-8">
          <h2 className="font-display text-3xl text-fg">{page.video.title}</h2>
          <div className="mt-4 aspect-video overflow-hidden rounded-card border border-line">
            <iframe
              src={page.video.embedUrl}
              title={page.video.title}
              className="h-full w-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              referrerPolicy="strict-origin-when-cross-origin"
            />
          </div>
        </section>
      ) : null}
      <section className="mt-8">
        <h2 className="font-display text-3xl text-fg">Key takeaways</h2>
        <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-fg">
          {page.keyTakeaways.map((item) => (
            <li key={item}>
              <InlineMarkdown text={item} />
            </li>
          ))}
        </ul>
      </section>
      <CourseQuiz
        questions={page.quiz}
        mode="module"
        moduleId={page.id}
        moduleNumber={page.index + 1}
        initialBest={page.bestCorrect}
        initialAttempts={page.attempts}
        signedIn={page.signedIn}
        signInNext={`/learn/${page.id}`}
      />
      {page.index === 0 && page.next ? (
        <section className="mt-10 border-t border-line pt-6">
          <h2 className="font-display text-2xl text-fg">Next up</h2>
          <p className="mt-3 text-sm text-fg">
            <Link
              to="/learn/$moduleId"
              params={{ moduleId: page.next.id }}
              className={`font-medium text-signal ${focusRing}`}
            >
              Calls and puts explained
            </Link>
          </p>
        </section>
      ) : null}
      {page.index === 1 && !page.entitled ? (
        <div className="mt-10 border-t border-line pt-6">
          <CourseCheckoutButton
            signedIn={page.signedIn}
            next={`/learn/${page.id}`}
            priceUsd={page.priceUsd}
          />
        </div>
      ) : null}
    </>
  );
}

function LockedModule({
  page,
}: {
  page: Extract<ModulePage, { access: "locked" }>;
}) {
  return (
    <section className="mt-6 rounded-card border border-line bg-surface px-4 py-5">
      <p className="text-sm text-pretty text-fg">
        Modules 1–2 are free. This module stays locked until you buy{" "}
        {page.courseTitle} or your desk plan is active, including a trial.
      </p>
      <h2 className="mt-4 font-display text-2xl text-fg">
        What this module covers
      </h2>
      <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-muted">
        {page.learningObjectives.map((objective) => (
          <li key={objective}>{objective}</li>
        ))}
      </ul>
      <div className="mt-6">
        <CourseCheckoutButton
          signedIn={page.signedIn}
          next={`/learn/${page.id}`}
          priceUsd={page.priceUsd}
        />
      </div>
    </section>
  );
}

function lessonLabel(id: string, fallback: string): string {
  return moduleSeo(id)?.h1 ?? fallback;
}

function ModulePager({ page }: { page: ModulePage }) {
  return (
    <nav className="mt-10 flex flex-col gap-3 border-t border-line pt-6 text-sm sm:flex-row sm:justify-between">
      {page.prev ? (
        <Link
          to="/learn/$moduleId"
          params={{ moduleId: page.prev.id }}
          className={`min-h-11 text-fg ${focusRing}`}
        >
          ← Module {page.index}: {lessonLabel(page.prev.id, page.prev.title)}
        </Link>
      ) : (
        <Link to="/learn" className={`min-h-11 text-fg ${focusRing}`}>
          ← Course outline
        </Link>
      )}
      {page.next ? (
        <Link
          to="/learn/$moduleId"
          params={{ moduleId: page.next.id }}
          className={`min-h-11 text-signal sm:text-right ${focusRing}`}
        >
          Next: Module {page.index + 2}:{" "}
          {lessonLabel(page.next.id, page.next.title)} →
        </Link>
      ) : page.access === "open" && page.showExamLink ? (
        <Link
          to="/learn/exam"
          className={`min-h-11 text-signal sm:text-right ${focusRing}`}
        >
          Final exam →
        </Link>
      ) : (
        <Link
          to="/learn"
          className={`min-h-11 text-signal sm:text-right ${focusRing}`}
        >
          Course outline →
        </Link>
      )}
    </nav>
  );
}
