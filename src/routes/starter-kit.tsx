import { createFileRoute } from "@tanstack/react-router";
import { StarterKitPage } from "@/components/starter-kit-page";
import { STARTER_KIT_PAGE, routeHead } from "@/lib/seo";
import { getStarterKitPage } from "@/lib/starter-kit.functions";

export const Route = createFileRoute("/starter-kit")({
  validateSearch: (search: Record<string, unknown>): { session_id?: string } => {
    const raw = typeof search.session_id === "string" ? search.session_id : "";
    return raw.startsWith("cs_") ? { session_id: raw } : {};
  },
  loader: () => getStarterKitPage(),
  head: () => routeHead(STARTER_KIT_PAGE),
  component: StarterKitRoute,
});

function StarterKitRoute() {
  const initial = Route.useLoaderData();
  const { session_id: sessionId } = Route.useSearch();
  return <StarterKitPage initial={initial} sessionId={sessionId} />;
}
