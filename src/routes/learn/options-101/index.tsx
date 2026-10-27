import { createFileRoute, Link } from "@tanstack/react-router";
import { CourseLanding } from "@/components/course-home";
import { focusRing } from "@/components/course-ui";
import { getCourseHome } from "@/lib/course.functions";
import { COURSE_FAQ, LEARN_PAGE, routeHead } from "@/lib/seo";

const OUTCOMES = [
  "What an option is",
  "Calls and puts",
  "Strike price, expiration, and premium",
  "Intrinsic vs. extrinsic value",
  "The risk of buying vs. selling options",
  "The Greeks: delta, theta, vega, and gamma",
  "Reading an option chain in thinkorswim",
  "Position sizing from max loss",
];

export const Route = createFileRoute("/learn/options-101/")({
  validateSearch: (search: Record<string, unknown>): { session_id?: string } => {
    const raw = typeof search.session_id === "string" ? search.session_id : "";
    return raw.startsWith("cs_") ? { session_id: raw } : {};
  },
  loader: () => getCourseHome({ data: { courseId: "options-101" } }),
  head: () => routeHead(LEARN_PAGE),
  component: Options101Page,
});

function Options101Page() {
  const initial = Route.useLoaderData();
  const { session_id: sessionId } = Route.useSearch();
  return (
    <CourseLanding
      initial={initial}
      sessionId={sessionId}
      subtitle="Options trading for beginners"
      startLabel="Start Modules 1–2 free"
      outcomes={OUTCOMES}
      faqTitle="Options 101 FAQ"
      faq={COURSE_FAQ}
      afterOutline={
        <p className="mt-4 text-sm text-fg">
          Finished Options 101?{" "}
          <Link to="/learn/options-201" className={`font-medium text-signal ${focusRing}`}>
            Next: Options 201: Vertical Spreads
          </Link>
        </p>
      }
    />
  );
}
