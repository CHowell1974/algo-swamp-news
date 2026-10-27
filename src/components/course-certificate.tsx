import { Link } from "@tanstack/react-router";
import {
  CourseBreadcrumb,
  CourseClosing,
  CourseDisclaimer,
  CourseExamLink,
  CourseHomeLink,
  CourseModuleLink,
  CourseShell,
  focusRing,
} from "@/components/course-ui";
import type { CertificatePage } from "@/lib/course/types";

export function CertificateView({
  page,
  heading,
  examNext,
}: {
  page: CertificatePage;
  heading: string;
  examNext: string;
}) {
  return (
    <CourseShell>
      <main className="mx-auto max-w-3xl px-4 py-8 md:px-8 md:py-12">
        {page.passed ? (
          <>
            <CourseBreadcrumb
              courseId={page.courseId}
              current="Certificate"
              className="print:hidden"
            />
            <article className="mt-6 rounded-card border border-signal bg-surface px-6 py-10 text-center print:border-black print:bg-white print:text-black">
              <p className="text-xs font-medium tracking-widest text-signal uppercase print:text-black">
                ALGO Swamp
              </p>
              <h1 className="mt-4 font-display text-4xl text-fg print:text-black md:text-5xl">
                Certificate of completion
              </h1>
              <p className="mt-8 text-sm text-muted print:text-black">This certifies that</p>
              <p className="mt-2 font-display text-4xl text-fg print:text-black">{page.name}</p>
              <p className="mt-6 text-sm text-muted print:text-black">completed</p>
              <p className="mt-2 font-display text-3xl text-signal italic print:text-black">
                {page.courseTitle}
              </p>
              <p className="mt-6 text-sm text-fg print:text-black">{page.completedOn}</p>
              <p className="mx-auto mt-8 max-w-md text-xs text-pretty text-muted print:text-black">
                Educational completion only. This is not a license, a credential to trade, or
                financial advice.
              </p>
            </article>
            <button
              type="button"
              onClick={() => window.print()}
              className={`mt-6 inline-flex min-h-11 items-center rounded-full bg-signal px-5 text-sm font-semibold text-bg print:hidden ${focusRing}`}
            >
              Print certificate
            </button>
            <div className="print:hidden">
              <CourseClosing
                text={page.closingText}
                ctas={page.ctas}
                disclaimer={page.disclaimer}
              />
            </div>
          </>
        ) : (
          <>
            <CourseDisclaimer text={page.disclaimer} />
            <CourseBreadcrumb courseId={page.courseId} current="Certificate" />
            <h1 className="mt-3 font-display text-4xl text-fg">{heading}</h1>
            <p className="mt-4 text-sm text-pretty text-muted">
              {page.signedIn
                ? `Pass the ${page.courseTitle} final exam to print a certificate with your name and the completion date.`
                : "Sign in, then pass the final exam, to print a certificate."}
            </p>
            <div className="mt-6 flex flex-col items-start gap-3 sm:flex-row">
              {page.signedIn ? (
                <CourseExamLink
                  courseId={page.courseId}
                  className={`inline-flex min-h-11 items-center rounded-full bg-signal px-5 text-sm font-semibold text-bg ${focusRing}`}
                >
                  Go to the final exam
                </CourseExamLink>
              ) : (
                <Link
                  to="/login"
                  search={{ next: examNext }}
                  className={`inline-flex min-h-11 items-center rounded-full bg-signal px-5 text-sm font-semibold text-bg ${focusRing}`}
                >
                  Sign in
                </Link>
              )}
              <CourseHomeLink
                courseId={page.courseId}
                className={`inline-flex min-h-11 items-center text-sm text-fg ${focusRing}`}
              >
                Course outline
              </CourseHomeLink>
            </div>
          </>
        )}
        {page.courseId === "options-101" ? (
          <section className="mt-10 border-t border-line pt-6 print:hidden">
            <h2 className="font-display text-2xl text-fg">Next: Options 201: Vertical Spreads</h2>
            <p className="mt-3 text-sm text-fg">
              <CourseModuleLink
                courseId="options-201"
                moduleId="m1-what-is-a-vertical"
                className={`font-medium text-signal ${focusRing}`}
              >
                Start Options 201 free: What is a vertical spread?
              </CourseModuleLink>
            </p>
          </section>
        ) : (
          <section className="mt-10 border-t border-line pt-6 print:hidden">
            <h2 className="font-display text-2xl text-fg">What's next</h2>
            <p className="mt-3 text-sm text-fg">
              <Link to="/learn" className={`font-medium text-signal ${focusRing}`}>
                All classes
              </Link>
            </p>
          </section>
        )}
      </main>
    </CourseShell>
  );
}
