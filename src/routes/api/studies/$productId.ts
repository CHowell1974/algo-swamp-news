import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/studies/$productId")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const { studyDownloadResponse } = await import("@/lib/studies/download.server");
        return studyDownloadResponse(params.productId);
      },
    },
  },
});
