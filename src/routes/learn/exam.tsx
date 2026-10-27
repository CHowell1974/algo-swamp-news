import { createFileRoute } from "@tanstack/react-router";
import { CourseQuiz } from "@/components/course-quiz";
import {
  CourseBreadcrumb,
  CourseCheckoutButton,
  CourseClosing,
  CourseDisclaimer,
  CourseShell,
} from "@/components/course-ui";
import { getExamPage } from "@/lib/course.functions";
import { LEARN_EXAM_PAGE, routeHead } from "@/lib/seo";

export const Route = createFileRoute("/learn/exam")({
  loader: () => getExamPage({ data: { courseId: "options-101" } }),
  head: () => routeHead(LEARN_EXAM_PAGE),
  component: ExamPage,
});

function ExamPage() {
  const page = Route.useLoaderData();
  return (
    <CourseShell>
      <main className="mx-auto max-w-3xl px-4 py-8 md:px-8 md:py-12">
        <CourseDisclaimer text={page.disclaimer} />
        <CourseBreadcrumb courseId={page.courseId} current="Final exam" />
        <h1 className="mt-3 font-display text-4xl text-balance text-fg md:text-5xl">
          Options 101 Final Exam
        </h1>
        {page.access === "locked" ? (
          <section className="mt-6 rounded-card border border-line bg-surface px-4 py-5">
            <p className="text-sm text-pretty text-fg">
              The final exam is locked until you buy {page.courseTitle} or your desk plan is active,
              including a trial. {page.passingScoreCount} of {page.questionCount} correct passes.
            </p>
            <div className="mt-6">
              <CourseCheckoutButton
                courseId={page.courseId}
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
              courseId={page.courseId}
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
