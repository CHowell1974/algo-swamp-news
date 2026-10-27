import { createFileRoute, Link } from "@tanstack/react-router";
import { CourseLanding } from "@/components/course-home";
import { focusRing } from "@/components/course-ui";
import { getCourseHome } from "@/lib/course.functions";
import { COURSE_201_FAQ, LEARN_201_PAGE, routeHead } from "@/lib/seo";

const OUTCOMES = [
  "What a vertical spread is",
  "Debit spreads: bull call and bear put",
  "Credit spreads: bull put and bear call",
  "Choosing strikes, width, and expiration",
  "Max profit, max loss, and break-even math",
  "The Greeks on vertical spreads",
  "Managing, closing, and rolling spreads",
  "Placing a vertical spread in thinkorswim",
];

export const Route = createFileRoute("/learn/options-201/")({
  validateSearch: (search: Record<string, unknown>): { session_id?: string } => {
    const raw = typeof search.session_id === "string" ? search.session_id : "";
    return raw.startsWith("cs_") ? { session_id: raw } : {};
  },
  loader: () => getCourseHome({ data: { courseId: "options-201" } }),
  head: () => routeHead(LEARN_201_PAGE),
  component: Options201Page,
});

function Options201Page() {
  const initial = Route.useLoaderData();
  const { session_id: sessionId } = Route.useSearch();
  return (
    <CourseLanding
      initial={initial}
      sessionId={sessionId}
      headline={initial.title}
      srSeparator=" — "
      subtitle="Bull call, bear put, and credit spreads explained"
      startLabel="Start Modules 1–3 free"
      outcomes={OUTCOMES}
      faqTitle="Options 201 FAQ"
      faq={COURSE_201_FAQ}
      lead={
        <section className="mt-8" aria-labelledby="options-201-recommended">
          <h2 id="options-201-recommended" className="font-display text-3xl text-fg">
            Recommended first: Options 101
          </h2>
          <p className="mt-3 max-w-2xl text-sm text-pretty text-fg">
            Options 201 assumes you know calls and puts, strike and expiration, the basic Greeks,
            and how to size a trade from max loss. If that's new, start with{" "}
            <Link to="/learn/options-101" className={`font-medium text-signal ${focusRing}`}>
              Options 101: Options Trading for Beginners
            </Link>
            , or{" "}
            <Link
              to="/learn/options-101/$moduleId"
              params={{ moduleId: "m2-calls-and-puts" }}
              className={`font-medium text-signal ${focusRing}`}
            >
              review calls and puts explained (free)
            </Link>
            .
          </p>
        </section>
      }
    />
  );
}
