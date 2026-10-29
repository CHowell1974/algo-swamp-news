import { createFileRoute } from "@tanstack/react-router";
import { StudyProductPage } from "@/components/study-product-page";
import { getStudyPage } from "@/lib/studies.functions";
import { MOTHER_BAR_SWEEP_SCAN_PAGE_COPY } from "@/lib/studies/catalog";
import { motherBarSweepScanPage, routeHead } from "@/lib/seo";

export const Route = createFileRoute("/tools/mother-bar-sweep-scan")({
  validateSearch: (search: Record<string, unknown>): { session_id?: string } => {
    const raw = typeof search.session_id === "string" ? search.session_id : "";
    return raw.startsWith("cs_") ? { session_id: raw } : {};
  },
  loader: () => getStudyPage({ data: { productId: MOTHER_BAR_SWEEP_SCAN_PAGE_COPY.id } }),
  head: () => routeHead(motherBarSweepScanPage()),
  component: MotherBarSweepScanPage,
});

function MotherBarSweepScanPage() {
  const initial = Route.useLoaderData();
  const { session_id: sessionId } = Route.useSearch();
  return (
    <StudyProductPage
      copy={MOTHER_BAR_SWEEP_SCAN_PAGE_COPY}
      initial={initial}
      sessionId={sessionId}
    />
  );
}
