import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/learn/certificate")({
  beforeLoad: () => {
    throw redirect({ to: "/learn/options-101/certificate", statusCode: 301 });
  },
});
