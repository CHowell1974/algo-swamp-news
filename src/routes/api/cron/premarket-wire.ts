import { createFileRoute } from "@tanstack/react-router";
import { cronAuthorized } from "@/lib/cron-auth";

export const Route = createFileRoute("/api/cron/premarket-wire")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        if (!cronAuthorized(request)) {
          return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
        }
        const { runPremarketWire } = await import("@/lib/premarket-wire.server");
        const result = await runPremarketWire();
        return Response.json(result, { status: result.ok ? 200 : 500 });
      },
    },
  },
});
