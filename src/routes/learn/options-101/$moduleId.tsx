import { createFileRoute, notFound } from "@tanstack/react-router";
import { LessonNotFound, ModuleLesson } from "@/components/course-lesson";
import { getModulePage } from "@/lib/course.functions";
import { moduleRobots, moduleSeo } from "@/lib/course/catalog";
import { OG_LEARN_IMAGE, moduleJsonLd, routeHead } from "@/lib/seo";

export const Route = createFileRoute("/learn/options-101/$moduleId")({
  loader: async ({ params }) => {
    if (!moduleSeo(params.moduleId)) throw notFound();
    return getModulePage({ data: { courseId: "options-101", moduleId: params.moduleId } });
  },
  head: ({ loaderData }) => {
    const seo = loaderData ? moduleSeo(loaderData.id) : undefined;
    if (!loaderData || !seo) {
      return routeHead({
        title: "Lesson not found — Options 101 — ALGO Swamp",
        description: "That Options 101 lesson does not exist. Start from the course outline.",
        pathname: "/learn/options-101",
        robots: "noindex,follow",
      });
    }
    return routeHead({
      title: seo.title,
      description: seo.description,
      pathname: `/learn/options-101/${seo.id}`,
      robots: moduleRobots(loaderData.index),
      ogImage: OG_LEARN_IMAGE,
      jsonLd: moduleJsonLd(loaderData.index, seo),
    });
  },
  notFoundComponent: () => <LessonNotFound courseId="options-101" />,
  component: function ModuleRoute() {
    return <ModuleLesson page={Route.useLoaderData()} />;
  },
});
