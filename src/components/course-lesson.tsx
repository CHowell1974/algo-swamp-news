import { Link } from "@tanstack/react-router";
import { CourseMarkdown, InlineMarkdown } from "@/components/course-markdown";
import { CourseQuiz } from "@/components/course-quiz";
import {
  CourseBreadcrumb,
  CourseCheckoutButton,
  CourseDisclaimer,
  CourseExamLink,
  CourseHomeLink,
  CourseModuleLink,
  CourseShell,
  focusRing,
} from "@/components/course-ui";
import { freePreviewLabel } from "@/lib/course/access";
import { courseModulePath, isOptions201 } from "@/lib/course/paths";
import { moduleSeo as moduleSeo101 } from "@/lib/course/catalog";
import { moduleSeo201 } from "@/lib/course/catalog-options-201";
import type { ModulePage } from "@/lib/course/types";

function seoFor(courseId: string, moduleId: string) {
  return isOptions201(courseId) ? moduleSeo201(moduleId) : moduleSeo101(moduleId);
}

export function ModuleLesson({ page }: { page: ModulePage }) {
  const seo = seoFor(page.courseId, page.id);
  return (
    <CourseShell>
      <main className="mx-auto max-w-3xl px-4 py-8 md:px-8 md:py-12">
        <CourseDisclaimer text={page.disclaimer} />
        <CourseBreadcrumb
          courseId={page.courseId}
          current={`Module ${page.index + 1} of ${page.moduleCount}`}
        />
        <h1 className="mt-3 font-display text-4xl text-balance text-fg md:text-5xl">
          {seo?.h1 ?? page.title}
        </h1>
        {page.access === "locked" ? <LockedModule page={page} /> : <OpenModule page={page} />}
        <ModulePager page={page} />
      </main>
    </CourseShell>
  );
}

function OpenModule({ page }: { page: Extract<ModulePage, { access: "open" }> }) {
  const nextIsFree = page.index < page.freeThroughIndex && page.next;
  const showCheckout = page.index === page.freeThroughIndex && !page.entitled;
  return (
    <>
      {page.id === "m1-what-is-a-vertical" ? (
        <p className="mt-6 text-sm text-fg">
          New to calls and puts?{" "}
          <CourseModuleLink
            courseId="options-101"
            moduleId="m2-calls-and-puts"
            className={`font-medium text-signal ${focusRing}`}
          >
            Calls and puts explained
          </CourseModuleLink>{" "}
          (free, Options 101).
        </p>
      ) : null}
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
        <p className="text-xs font-medium tracking-widest text-signal uppercase">Worked example</p>
        <h2 className="mt-2 font-display text-2xl text-fg">{page.workedExample.title}</h2>
        <p className="mt-3 text-sm text-pretty text-fg">{page.workedExample.scenario}</p>
        <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm text-fg">
          {page.workedExample.steps.map((step) => (
            <li key={step}>
              <InlineMarkdown text={step} />
            </li>
          ))}
        </ol>
        <p className="mt-4 text-sm font-medium text-pretty text-fg">{page.workedExample.result}</p>
      </section>
      <section className="mt-8 rounded-card border border-heat/40 bg-surface px-4 py-5">
        <p className="text-xs font-medium tracking-widest text-heat uppercase">
          {page.tosTip.platform}
        </p>
        <h2 className="mt-2 font-display text-2xl text-fg">{page.tosTip.title}</h2>
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
        courseId={page.courseId}
        moduleId={page.id}
        moduleNumber={page.index + 1}
        initialBest={page.bestCorrect}
        initialAttempts={page.attempts}
        signedIn={page.signedIn}
        signInNext={courseModulePath(page.courseId, page.id)}
      />
      {nextIsFree && page.next ? (
        <section className="mt-10 border-t border-line pt-6">
          <h2 className="font-display text-2xl text-fg">Next up</h2>
          <p className="mt-3 text-sm text-fg">
            <CourseModuleLink
              courseId={page.courseId}
              moduleId={page.next.id}
              className={`font-medium text-signal ${focusRing}`}
            >
              {page.next.id === "m2-calls-and-puts"
                ? "Calls and puts explained"
                : (seoFor(page.courseId, page.next.id)?.h1 ?? page.next.title)}
            </CourseModuleLink>
          </p>
        </section>
      ) : null}
      {showCheckout ? (
        <div className="mt-10 border-t border-line pt-6">
          <CourseCheckoutButton
            courseId={page.courseId}
            signedIn={page.signedIn}
            next={courseModulePath(page.courseId, page.id)}
            priceUsd={page.priceUsd}
          />
        </div>
      ) : null}
      {page.id === "m5-buying-vs-selling" ? (
        <p className="mt-8 text-sm text-fg">
          Go deeper:{" "}
          <CourseModuleLink
            courseId="options-201"
            moduleId="m3-credit-verticals"
            className={`font-medium text-signal ${focusRing}`}
          >
            bull put and bear call credit spreads
          </CourseModuleLink>{" "}
          in Options 201.
        </p>
      ) : null}
      {page.courseId === "options-101" && page.showExamLink ? (
        <section className="mt-10 border-t border-line pt-6">
          <h2 className="font-display text-2xl text-fg">Next: Options 201: Vertical Spreads</h2>
          <p className="mt-3 text-sm text-fg">
            Put two options together with defined risk.{" "}
            <Link to="/learn/options-201" className={`font-medium text-signal ${focusRing}`}>
              Start Options 201: Vertical Spreads
            </Link>
          </p>
        </section>
      ) : null}
    </>
  );
}

function LockedModule({ page }: { page: Extract<ModulePage, { access: "locked" }> }) {
  const freeLabel = freePreviewLabel(page.freeThroughIndex);
  return (
    <section className="mt-6 rounded-card border border-line bg-surface px-4 py-5">
      <p className="text-sm text-pretty text-fg">
        {freeLabel} This module stays locked until you buy {page.courseTitle} or your desk plan is
        active, including a trial.
      </p>
      <h2 className="mt-4 font-display text-2xl text-fg">What this module covers</h2>
      <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-muted">
        {page.learningObjectives.map((objective) => (
          <li key={objective}>{objective}</li>
        ))}
      </ul>
      <div className="mt-6">
        <CourseCheckoutButton
          courseId={page.courseId}
          signedIn={page.signedIn}
          next={courseModulePath(page.courseId, page.id)}
          priceUsd={page.priceUsd}
        />
      </div>
    </section>
  );
}

function lessonLabel(courseId: string, id: string, fallback: string): string {
  return seoFor(courseId, id)?.h1 ?? fallback;
}

function ModulePager({ page }: { page: ModulePage }) {
  return (
    <nav className="mt-10 flex flex-col gap-3 border-t border-line pt-6 text-sm sm:flex-row sm:justify-between">
      {page.prev ? (
        <CourseModuleLink
          courseId={page.courseId}
          moduleId={page.prev.id}
          className={`min-h-11 text-fg ${focusRing}`}
        >
          ← Module {page.index}: {lessonLabel(page.courseId, page.prev.id, page.prev.title)}
        </CourseModuleLink>
      ) : (
        <CourseHomeLink courseId={page.courseId} className={`min-h-11 text-fg ${focusRing}`}>
          ← Course outline
        </CourseHomeLink>
      )}
      {page.next ? (
        <CourseModuleLink
          courseId={page.courseId}
          moduleId={page.next.id}
          className={`min-h-11 text-signal sm:text-right ${focusRing}`}
        >
          Next: Module {page.index + 2}: {lessonLabel(page.courseId, page.next.id, page.next.title)}{" "}
          →
        </CourseModuleLink>
      ) : page.access === "open" && page.showExamLink ? (
        <CourseExamLink
          courseId={page.courseId}
          className={`min-h-11 text-signal sm:text-right ${focusRing}`}
        >
          Final exam →
        </CourseExamLink>
      ) : (
        <CourseHomeLink
          courseId={page.courseId}
          className={`min-h-11 text-signal sm:text-right ${focusRing}`}
        >
          Course outline →
        </CourseHomeLink>
      )}
    </nav>
  );
}

export function LessonNotFound({ courseId }: { courseId: string }) {
  const name = isOptions201(courseId) ? "Options 201" : "Options 101";
  return (
    <CourseShell>
      <main className="mx-auto max-w-3xl px-4 py-16 md:px-8">
        <h1 className="font-display text-4xl text-fg">Lesson not found</h1>
        <p className="mt-3 text-sm text-muted">That {name} lesson does not exist.</p>
        <CourseHomeLink
          courseId={courseId}
          className={`mt-6 inline-flex min-h-11 items-center text-sm font-medium text-signal ${focusRing}`}
        >
          Back to {name}
        </CourseHomeLink>
        <p className="mt-2">
          <Link to="/learn" className={`text-sm text-muted ${focusRing}`}>
            All classes
          </Link>
        </p>
      </main>
    </CourseShell>
  );
}
