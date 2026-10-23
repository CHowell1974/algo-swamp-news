import { useEffect, useState } from "react";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Masthead } from "@/components/masthead";
import { ScannerDesk } from "@/components/scanner-desk";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { confirmCheckout } from "@/lib/membership.functions";
import { fetchWire } from "@/lib/news.functions";
import { DESK_PAGE, routeHead } from "@/lib/seo";

export const Route = createFileRoute("/desk")({
  validateSearch: (search: Record<string, unknown>): { session_id?: string } => {
    const raw = typeof search.session_id === "string" ? search.session_id : "";
    return raw.startsWith("cs_") ? { session_id: raw } : {};
  },
  head: () => routeHead(DESK_PAGE),
  loader: () => fetchWire(),
  component: DeskPage,
});

function DeskPage() {
  const wire = Route.useLoaderData();
  const { session_id: sessionId } = Route.useSearch();
  const { user, isPending } = useCurrentUserState();
  const confirm = useServerFn(confirmCheckout);
  const router = useRouter();
  const [notice, setNotice] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    if (!sessionId || isPending) return;
    if (!user?.id) {
      setNotice("Sign in with the same account to finish checkout.");
      return;
    }
    let cancelled = false;
    setNotice("Confirming payment…");
    confirm({ data: { sessionId } })
      .then(async () => {
        if (cancelled) return;
        setNotice(null);
        setRefreshToken((token) => token + 1);
        await router.navigate({ to: "/desk", search: {}, replace: true });
        await router.invalidate();
      })
      .catch((cause: unknown) => {
        if (!cancelled) setNotice(cause instanceof Error ? cause.message : "Checkout could not be confirmed.");
      });
    return () => {
      cancelled = true;
    };
  }, [sessionId, user?.id, isPending, confirm, router]);

  return (
    <>
      <Masthead />
      {notice ? (
        <p className="mx-auto max-w-6xl px-4 pt-4 text-sm text-heat md:px-8">{notice}</p>
      ) : null}
      <ScannerDesk initial={wire} refreshToken={refreshToken} />
    </>
  );
}
