import { createFileRoute, Link } from "@tanstack/react-router";
import { CourseQuiz } from "@/components/course-quiz";
import {
  CourseCheckoutButton,
  CourseClosing,
  CourseDisclaimer,
  CourseShell,
  focusRing,
} from "@/components/course-ui";
import { getExamPage } from "@/lib/course.functions";
import { routeHead } from "@/lib/seo";

export const Route = createFileRoute("/learn/exam")({
  loader: () => getExamPage(),
  head: () =>
    routeHead({
      title: "Options 101 final exam — ALGO Swamp",
      description: "15 questions. 12 correct passes Options 101. Not financial advice.",
      pathname: "/learn/exam",
      robots: "noindex,follow",
    }),
  component: ExamPage,
});

function ExamPage() {
  const page = Route.useLoaderData();
  return (
    <CourseShell>
      <main className="mx-auto max-w-3xl px-4 py-8 md:px-8 md:py-12">
        <CourseDisclaimer text={page.disclaimer} />
        <p className="mt-8 text-xs font-medium tracking-widest text-muted uppercase">
          <Link to="/learn" className={`text-signal ${focusRing}`}>
            {page.courseTitle}
          </Link>
        </p>
        <h1 className="mt-3 font-display text-4xl text-balance text-fg md:text-5xl">Final exam</h1>
        {page.access === "locked" ? (
          <section className="mt-6 rounded-card border border-line bg-surface px-4 py-5">
            <p className="text-sm text-pretty text-fg">
              The final exam is locked until you buy {page.courseTitle} or your desk plan is active,
              including a trial. {page.passingScoreCount} of {page.questionCount} correct passes.
            </p>
            <div className="mt-6">
              <CourseCheckoutButton
                signedIn={page.signedIn}
                next="/learn/exam"
                priceUsd={page.priceUsd}
              />
            </div>
          </section>
        ) : (
          <>
            <CourseQuiz
              questions={page.questions}
              mode="exam"
              passingScoreCount={page.passingScoreCount}
              initialBest={page.bestCorrect}
              initialAttempts={page.attempts}
              signedIn={page.signedIn}
              signInNext="/learn/exam"
            />
            <CourseClosing text={page.closingText} ctas={page.ctas} disclaimer={page.disclaimer} />
          </>
        )}
      </main>
    </CourseShell>
  );
}
