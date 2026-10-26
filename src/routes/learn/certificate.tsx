import { createFileRoute, Link } from "@tanstack/react-router";
import { CourseClosing, CourseDisclaimer, CourseShell, focusRing } from "@/components/course-ui";
import { getCertificatePage } from "@/lib/course.functions";
import { routeHead } from "@/lib/seo";

export const Route = createFileRoute("/learn/certificate")({
  loader: () => getCertificatePage(),
  head: () =>
    routeHead({
      title: "Options 101 certificate — ALGO Swamp",
      description: "Completion certificate for Options 101. Not financial advice.",
      pathname: "/learn/certificate",
      robots: "noindex,follow",
    }),
  component: CertificateRoute,
});

function CertificateRoute() {
  const page = Route.useLoaderData();
  return (
    <CourseShell>
      <main className="mx-auto max-w-3xl px-4 py-8 md:px-8 md:py-12">
        {page.passed ? (
          <>
            <article className="rounded-card border border-signal bg-surface px-6 py-10 text-center print:border-black print:bg-white print:text-black">
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
            <h1 className="mt-8 font-display text-4xl text-fg">Certificate</h1>
            <p className="mt-4 text-sm text-pretty text-muted">
              {page.signedIn
                ? `Pass the ${page.courseTitle} final exam to print a certificate with your name and the completion date.`
                : "Sign in, then pass the final exam, to print a certificate."}
            </p>
            <div className="mt-6 flex flex-col items-start gap-3 sm:flex-row">
              {page.signedIn ? (
                <Link
                  to="/learn/exam"
                  className={`inline-flex min-h-11 items-center rounded-full bg-signal px-5 text-sm font-semibold text-bg ${focusRing}`}
                >
                  Go to the final exam
                </Link>
              ) : (
                <Link
                  to="/login"
                  search={{ next: "/learn/certificate" }}
                  className={`inline-flex min-h-11 items-center rounded-full bg-signal px-5 text-sm font-semibold text-bg ${focusRing}`}
                >
                  Sign in
                </Link>
              )}
              <Link
                to="/learn"
                className={`inline-flex min-h-11 items-center text-sm text-fg ${focusRing}`}
              >
                Course outline
              </Link>
            </div>
          </>
        )}
      </main>
    </CourseShell>
  );
}
