import { createFileRoute } from "@tanstack/react-router";
import { cronAuthorized } from "@/lib/cron-auth";

async function runCron(request: Request): Promise<Response> {
  const { recordUnauthorizedWire, runPremarketWire } = await import("@/lib/premarket-wire.server");
  if (!cronAuthorized(request)) {
    console.log("[premarket-wire] skip: unauthorized");
    await recordUnauthorizedWire();
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  const schedule = request.headers.get("x-vercel-cron-schedule");
  console.log(
    `[premarket-wire] invoked ${request.method}${schedule ? ` schedule=${schedule}` : ""}`,
  );
  const result = await runPremarketWire(new Date(), { method: request.method, schedule });
  return Response.json(result, { status: result.ok ? 200 : 500 });
}

export const Route = createFileRoute("/api/cron/premarket-wire")({
  server: {
    handlers: {
      // Hobby cron sends GET. POST stays accepted so a path schedule cannot miss the handler.
      GET: async ({ request }) => runCron(request),
      POST: async ({ request }) => runCron(request),
    },
  },
});
