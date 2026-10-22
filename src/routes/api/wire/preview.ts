import { createFileRoute } from "@tanstack/react-router";
import { cronAuthorized } from "@/lib/cron-auth";

export const Route = createFileRoute("/api/wire/preview")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        if (!cronAuthorized(request)) {
          return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
        }
        const { renderWirePreview } = await import("@/lib/premarket-wire.server");
        const preview = await renderWirePreview();
        return new Response(preview.html, {
          status: preview.status,
          headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" },
        });
      },
    },
  },
});
