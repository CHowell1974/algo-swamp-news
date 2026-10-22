import { Link } from "@tanstack/react-router";
import { UserButton } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";

const focusRing =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal";

export function Masthead() {
  const { user, isPending } = useCurrentUserState();

  return (
    <header className="border-b border-line">
      <div className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-3 md:gap-3 md:px-8">
        <a
          href="https://algoswamp.com"
          className={`shrink-0 font-display text-xl leading-none text-fg ${focusRing}`}
        >
          ALGO <span className="italic text-signal">Swamp</span>
        </a>
        <nav
          aria-label="Desk"
          className="flex min-w-0 flex-1 items-center justify-end gap-1 overflow-x-auto"
        >
          <Link
            to="/desk"
            className={`inline-flex min-h-11 shrink-0 items-center rounded-full px-3 text-sm font-medium text-fg ${focusRing}`}
          >
            Desk
          </Link>
          <Link
            to="/"
            hash="pricing"
            className={`inline-flex min-h-11 shrink-0 items-center rounded-full px-3 text-sm font-medium text-muted ${focusRing}`}
          >
            Pricing
          </Link>
          <Link
            to="/tools"
            className={`inline-flex min-h-11 shrink-0 items-center rounded-full px-3 text-sm font-medium text-muted ${focusRing}`}
          >
            Tools
          </Link>
          {user ? (
            <Link
              to="/account"
              className={`inline-flex min-h-11 shrink-0 items-center rounded-full px-3 text-sm font-medium text-muted ${focusRing}`}
            >
              Plan
            </Link>
          ) : null}
          <div className="ml-1 flex min-h-11 items-center">
            {isPending ? <div className="h-8 w-24 animate-pulse rounded-full bg-surface" /> : null}
            {!isPending && !user ? (
              <Link
                to="/login"
                search={{ next: "/desk" }}
                className={`inline-flex min-h-11 shrink-0 items-center rounded-full bg-surface px-3 text-sm font-medium text-fg ${focusRing}`}
              >
                Sign in
              </Link>
            ) : null}
            {!isPending && user ? (
              <div className="shrink-0 text-fg">
                <UserButton />
              </div>
            ) : null}
          </div>
        </nav>
      </div>
    </header>
  );
}
