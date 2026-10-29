import { createFileRoute } from "@tanstack/react-router";
import { StudyProductPage } from "@/components/study-product-page";
import { getStudyPage } from "@/lib/studies.functions";
import { MOTHER_BAR_LEVELS_PAGE_COPY } from "@/lib/studies/catalog";
import { motherBarLevelsPage, routeHead } from "@/lib/seo";

export const Route = createFileRoute("/tools/mother-bar-levels")({
  validateSearch: (search: Record<string, unknown>): { session_id?: string } => {
    const raw = typeof search.session_id === "string" ? search.session_id : "";
    return raw.startsWith("cs_") ? { session_id: raw } : {};
  },
  loader: () => getStudyPage({ data: { productId: MOTHER_BAR_LEVELS_PAGE_COPY.id } }),
  head: () => routeHead(motherBarLevelsPage()),
  component: MotherBarLevelsPage,
});

function MotherBarLevelsPage() {
  const initial = Route.useLoaderData();
  const { session_id: sessionId } = Route.useSearch();
  return (
    <StudyProductPage copy={MOTHER_BAR_LEVELS_PAGE_COPY} initial={initial} sessionId={sessionId} />
  );
}
