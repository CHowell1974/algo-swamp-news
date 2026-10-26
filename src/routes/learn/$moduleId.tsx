import { createFileRoute, Link } from "@tanstack/react-router";
import { CourseMarkdown, InlineMarkdown } from "@/components/course-markdown";
import { CourseQuiz } from "@/components/course-quiz";
import {
  CourseCheckoutButton,
  CourseDisclaimer,
  CourseShell,
  focusRing,
} from "@/components/course-ui";
import { getModulePage } from "@/lib/course.functions";
import type { ModulePage } from "@/lib/course/types";
import { routeHead } from "@/lib/seo";

export const Route = createFileRoute("/learn/$moduleId")({
  loader: ({ params }) =>
    getModulePage({ data: { moduleId: params.moduleId } }),
  head: ({ loaderData, params }) =>
    routeHead({
      title: loaderData
        ? `${loaderData.title} — ${loaderData.courseTitle} — ALGO Swamp`
        : "Options 101 — ALGO Swamp",
      description:
        loaderData?.learningObjectives[0] ??
        "Options 101 lesson. Not financial advice.",
      pathname: `/learn/${loaderData?.id ?? params.moduleId}`,
    }),
  component: ModuleLesson,
});

function ModuleLesson() {
  const page = Route.useLoaderData();
  return (
    <CourseShell>
      <main className="mx-auto max-w-3xl px-4 py-8 md:px-8 md:py-12">
        <CourseDisclaimer text={page.disclaimer} />
        <p className="mt-8 text-xs font-medium tracking-widest text-muted uppercase">
          <Link to="/learn" className={`text-signal ${focusRing}`}>
            {page.courseTitle}
          </Link>
          {" · "}Module {page.index + 1} of {page.moduleCount}
        </p>
        <h1 className="mt-3 font-display text-4xl text-balance text-fg md:text-5xl">
          {page.title}
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
          You'll be able to
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
        initialBest={page.bestCorrect}
        initialAttempts={page.attempts}
        signedIn={page.signedIn}
        signInNext={`/learn/${page.id}`}
      />
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
        Module 1 is free. This module stays locked until you buy{" "}
        {page.courseTitle} or your desk plan is active, including a trial.
      </p>
      <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-muted">
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

function ModulePager({ page }: { page: ModulePage }) {
  return (
    <nav className="mt-10 flex flex-col gap-3 border-t border-line pt-6 text-sm sm:flex-row sm:justify-between">
      {page.prev ? (
        <Link
          to="/learn/$moduleId"
          params={{ moduleId: page.prev.id }}
          className={`min-h-11 text-fg ${focusRing}`}
        >
          ← {page.prev.title}
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
          {page.next.title} →
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
