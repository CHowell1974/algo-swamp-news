import { createFileRoute } from "@tanstack/react-router";
import { CertificateView } from "@/components/course-certificate";
import { getCertificatePage } from "@/lib/course.functions";
import { OPTIONS_201_CERTIFICATE_PAGE, routeHead } from "@/lib/seo";

export const Route = createFileRoute("/learn/options-201/certificate")({
  loader: () => getCertificatePage({ data: { courseId: "options-201" } }),
  head: () => routeHead(OPTIONS_201_CERTIFICATE_PAGE),
  component: function Options201Certificate() {
    const page = Route.useLoaderData();
    return (
      <CertificateView
        page={page}
        heading="Options 201 certificate"
        examNext="/learn/options-201/certificate"
      />
    );
  },
});
