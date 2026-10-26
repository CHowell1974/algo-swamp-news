import { Link } from "@tanstack/react-router";
import { UserButton } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";

const focusRing =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal";

export function Masthead() {
  const { user, isPending } = useCurrentUserState();

  return (
    <header className="border-b border-line">
      <div className="mx-auto flex max-w-6xl items-center gap-1 px-2 py-3 min-[380px]:px-3 sm:gap-2 sm:px-4 md:gap-3 md:px-8">
        <a
          href="https://algoswamp.com"
          className={`shrink-0 font-display text-base leading-none text-fg min-[380px]:text-lg sm:text-xl ${focusRing}`}
        >
          ALGO <span className="italic text-signal">Swamp</span>
        </a>
        <nav
          aria-label="Desk"
          className="flex min-w-0 flex-1 items-center justify-end gap-0.5 overflow-x-auto sm:gap-1"
        >
          <Link
            to="/desk"
            className={`inline-flex min-h-11 shrink-0 items-center rounded-full px-2 text-sm font-medium text-fg sm:px-3 ${focusRing}`}
          >
            Desk
          </Link>
          <Link
            to="/"
            hash="pricing"
            className={`inline-flex min-h-11 shrink-0 items-center rounded-full px-2 text-sm font-medium text-muted sm:px-3 ${focusRing}`}
          >
            Pricing
          </Link>
          <Link
            to="/learn"
            className={`inline-flex min-h-11 shrink-0 items-center rounded-full px-2 text-sm font-medium text-muted sm:px-3 ${focusRing}`}
          >
            Learn
          </Link>
          <Link
            to="/tools"
            className={`inline-flex min-h-11 shrink-0 items-center rounded-full px-2 text-sm font-medium text-muted sm:px-3 ${focusRing}`}
          >
            Tools
          </Link>
          {user ? (
            <Link
              to="/account"
              className={`inline-flex min-h-11 shrink-0 items-center rounded-full px-2 text-sm font-medium text-muted sm:px-3 ${focusRing}`}
            >
              Plan
            </Link>
          ) : null}
          <div className="ml-0.5 flex min-h-11 shrink-0 items-center sm:ml-1">
            {isPending ? <div className="h-8 w-24 animate-pulse rounded-full bg-surface" /> : null}
            {!isPending && !user ? (
              <Link
                to="/login"
                search={{ next: "/desk" }}
                className={`inline-flex min-h-11 shrink-0 items-center rounded-full bg-surface px-2.5 text-sm font-medium text-fg sm:px-3 ${focusRing}`}
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
