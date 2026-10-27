import { createFileRoute } from "@tanstack/react-router";
import { CertificateView } from "@/components/course-certificate";
import { getCertificatePage } from "@/lib/course.functions";
import { courseCertificatePath } from "@/lib/course/paths";
import { LEARN_CERTIFICATE_PAGE, routeHead } from "@/lib/seo";

export const Route = createFileRoute("/learn/options-101/certificate")({
  loader: () => getCertificatePage({ data: { courseId: "options-101" } }),
  head: () => routeHead(LEARN_CERTIFICATE_PAGE),
  component: function CertificateRoute() {
    const page = Route.useLoaderData();
    return (
      <CertificateView
        page={page}
        heading="Options 101 certificate"
        examNext={courseCertificatePath(page.courseId)}
      />
    );
  },
});
