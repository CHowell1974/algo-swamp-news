import { createFileRoute, notFound, redirect } from "@tanstack/react-router";
import { moduleSeo } from "@/lib/course/catalog";
import { routeHead } from "@/lib/seo";

export const Route = createFileRoute("/learn/$moduleId")({
  beforeLoad: ({ params }) => {
    if (moduleSeo(params.moduleId)) {
      throw redirect({
        to: "/learn/options-101/$moduleId",
        params: { moduleId: params.moduleId },
        statusCode: 301,
      });
    }
    throw notFound();
  },
  head: () =>
    routeHead({
      title: "Lesson not found — Options 101 — ALGO Swamp",
      description: "That Options 101 lesson does not exist. Start from the course outline.",
      pathname: "/learn/options-101",
      robots: "noindex,follow",
    }),
});
