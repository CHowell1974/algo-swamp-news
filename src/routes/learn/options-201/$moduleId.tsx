import { createFileRoute, notFound } from "@tanstack/react-router";
import { LessonNotFound, ModuleLesson } from "@/components/course-lesson";
import { getModulePage } from "@/lib/course.functions";
import { moduleRobots201, moduleSeo201 } from "@/lib/course/catalog-options-201";
import { OG_LEARN_201_IMAGE, module201JsonLd, routeHead } from "@/lib/seo";

export const Route = createFileRoute("/learn/options-201/$moduleId")({
  loader: async ({ params }) => {
    if (!moduleSeo201(params.moduleId)) throw notFound();
    return getModulePage({ data: { courseId: "options-201", moduleId: params.moduleId } });
  },
  head: ({ loaderData }) => {
    const seo = loaderData ? moduleSeo201(loaderData.id) : undefined;
    if (!loaderData || !seo) {
      return routeHead({
        title: "Lesson not found — Options 201 — ALGO Swamp",
        description: "That Options 201 lesson does not exist. Start from the course outline.",
        pathname: "/learn/options-201",
        robots: "noindex,follow",
      });
    }
    return routeHead({
      title: seo.title,
      description: seo.description,
      pathname: `/learn/options-201/${seo.id}`,
      robots: moduleRobots201(loaderData.index),
      ogImage: OG_LEARN_201_IMAGE,
      jsonLd: module201JsonLd(loaderData.index, seo),
    });
  },
  notFoundComponent: () => <LessonNotFound courseId="options-201" />,
  component: function ModuleRoute() {
    return <ModuleLesson page={Route.useLoaderData()} />;
  },
});
