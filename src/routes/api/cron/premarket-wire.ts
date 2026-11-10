import { createFileRoute } from "@tanstack/react-router";
import { cronAuthorized } from "@/lib/cron-auth";

async function runCron(request: Request): Promise<Response> {
  if (!cronAuthorized(request)) {
    console.log("[premarket-wire] skip: unauthorized");
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  const schedule = request.headers.get("x-vercel-cron-schedule");
  console.log(
    `[premarket-wire] invoked ${request.method}${schedule ? ` schedule=${schedule}` : ""}`,
  );
  const { runPremarketWire } = await import("@/lib/premarket-wire.server");
  const result = await runPremarketWire();
  return Response.json(result, { status: result.ok ? 200 : 500 });
}

export const Route = createFileRoute("/api/cron/premarket-wire")({
  server: {
    handlers: {
      // The schedule is GET. POST is accepted too: a path schedule defaults to POST.
      GET: async ({ request }) => runCron(request),
      POST: async ({ request }) => runCron(request),
    },
  },
});
