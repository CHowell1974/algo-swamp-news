import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/wire.xml")({
  server: {
    handlers: {
      GET: async () => {
        const { renderWireFeed } = await import("@/lib/premarket-wire.server");
        const feed = await renderWireFeed();
        return new Response(feed.xml, {
          status: feed.status,
          headers: {
            "content-type": "application/rss+xml; charset=utf-8",
            "cache-control": "public, max-age=180",
          },
        });
      },
    },
  },
});
