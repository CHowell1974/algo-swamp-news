import { createFileRoute } from "@tanstack/react-router";
import { AuthPanel } from "@/components/auth-panel";
import { Masthead } from "@/components/masthead";
import { SignInGate } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { LOGIN_PAGE, routeHead } from "@/lib/seo";

export const Route = createFileRoute("/login")({
  head: () => routeHead(LOGIN_PAGE),
  validateSearch: (search: Record<string, unknown>): { next: string } => {
    const next = typeof search.next === "string" ? search.next : "/desk";
    return {
      next: next.startsWith("/") && !next.startsWith("//") ? next : "/desk",
    };
  },
  component: LoginPage,
});

function LoginPage() {
  const { next } = Route.useSearch();
  const { isPending } = useCurrentUserState();

  return (
    <div className="min-h-screen">
      <Masthead />
      <main className="mx-auto max-w-md px-4 py-12 md:px-8">
        <h1 className="font-display text-4xl text-balance text-fg">
          Sign in to the desk
        </h1>
        <p className="mt-3 text-sm text-pretty text-muted">
          Google, X, or email. Your plan is stored on the account, not in this
          browser.
        </p>
        <div className="mt-8">
          {isPending ? (
            <div className="h-11 animate-pulse rounded-full bg-surface" />
          ) : null}
          <SignInGate fallback={<AuthPanel callbackURL={next} />}>
            <p className="text-sm text-muted">
              You are already signed in. Open the desk or the plan page from the
              bar.
            </p>
          </SignInGate>
        </div>
      </main>
    </div>
  );
}
