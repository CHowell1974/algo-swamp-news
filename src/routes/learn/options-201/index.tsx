import { createFileRoute } from "@tanstack/react-router";
import { CourseLanding } from "@/components/course-home";
import { getCourseHome } from "@/lib/course.functions";
import { OPTIONS_201_FAQ, OPTIONS_201_PAGE, routeHead } from "@/lib/seo";

const OUTCOMES = [
  "What a vertical spread is",
  "Debit verticals: bull call and bear put",
  "Credit verticals: bull put and bear call",
  "Choosing strikes, width, and expiration",
  "Max profit, max loss, and break-even",
  "The Greeks on verticals",
  "Managing, closing, and rolling",
  "Building verticals in thinkorswim",
];

export const Route = createFileRoute("/learn/options-201/")({
  validateSearch: (search: Record<string, unknown>): { session_id?: string } => {
    const raw = typeof search.session_id === "string" ? search.session_id : "";
    return raw.startsWith("cs_") ? { session_id: raw } : {};
  },
  loader: () => getCourseHome({ data: { courseId: "options-201" } }),
  head: () => routeHead(OPTIONS_201_PAGE),
  component: Options201Page,
});

function Options201Page() {
  const initial = Route.useLoaderData();
  const { session_id: sessionId } = Route.useSearch();
  return (
    <CourseLanding
      initial={initial}
      sessionId={sessionId}
      subtitle="Vertical spreads"
      startLabel="Start Module 1 free"
      outcomes={OUTCOMES}
      faqTitle="Options 201 FAQ"
      faq={OPTIONS_201_FAQ}
    />
  );
}
