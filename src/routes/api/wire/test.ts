import { createFileRoute } from "@tanstack/react-router";
import { singleTestRecipient } from "@/lib/brevo";
import { cronAuthorized } from "@/lib/cron-auth";

export const Route = createFileRoute("/api/wire/test")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { recordUnauthorizedWire, runPremarketWireTest } =
          await import("@/lib/premarket-wire.server");
        if (!cronAuthorized(request)) {
          console.log("[premarket-wire] test skip: unauthorized");
          await recordUnauthorizedWire();
          return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
        }
        const to = singleTestRecipient(new URL(request.url).searchParams.getAll("to"));
        if (!to) {
          return Response.json({ ok: false, error: "Enter one email address." }, { status: 400 });
        }
        const result = await runPremarketWireTest(to);
        return Response.json(result, { status: result.ok ? 200 : 500 });
      },
    },
  },
});
