import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/learn/exam")({
  beforeLoad: () => {
    throw redirect({ to: "/learn/options-101/exam", statusCode: 301 });
  },
});
