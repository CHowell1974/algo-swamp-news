import { createFileRoute, notFound, redirect } from "@tanstack/react-router";
import { moduleSeo } from "@/lib/course/catalog";

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
});
