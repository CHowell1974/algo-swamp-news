import { useState, type FormEvent } from "react";
import { useRouter } from "@tanstack/react-router";
import { GROK_PROVIDERS, authClient, signIn } from "@/lib/auth/client";

const focusRing =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal";

export function AuthPanel({ callbackURL }: { callbackURL: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<"in" | "up">("up");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError("Use at least 8 characters.");
      return;
    }
    setPending(true);
    const result =
      mode === "up"
        ? await authClient.signUp.email({
            email,
            password,
            name: name.trim() || email.split("@")[0] || "Reader",
            callbackURL,
          })
        : await authClient.signIn.email({ email, password, callbackURL });
    setPending(false);
    if (result.error) {
      setError(result.error.message ?? "That sign-in did not go through.");
      return;
    }
    await router.invalidate();
    await router.navigate({ href: callbackURL });
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-2">
        {GROK_PROVIDERS.map((provider) => (
          <button
            key={provider.providerId}
            type="button"
            onClick={() => signIn(provider.providerId, { callbackURL })}
            className={`min-h-11 rounded-full border border-line bg-surface px-4 text-sm font-medium text-fg transition-colors duration-200 hover:bg-surface-2 ${focusRing}`}
          >
            Continue with {provider.label}
          </button>
        ))}
      </div>
      <form onSubmit={(event) => void onSubmit(event)} className="space-y-3">
        <p className="text-xs font-medium tracking-widest text-muted uppercase">Or email</p>
        {mode === "up" ? (
          <label className="block text-sm text-muted">
            Name
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              autoComplete="name"
              className={`mt-1 min-h-11 w-full rounded-xl border border-line bg-bg px-3 text-fg outline-none ${focusRing}`}
            />
          </label>
        ) : null}
        <label className="block text-sm text-muted">
          Email
          <input
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            className={`mt-1 min-h-11 w-full rounded-xl border border-line bg-bg px-3 text-fg outline-none ${focusRing}`}
          />
        </label>
        <label className="block text-sm text-muted">
          Password
          <input
            type="password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete={mode === "up" ? "new-password" : "current-password"}
            className={`mt-1 min-h-11 w-full rounded-xl border border-line bg-bg px-3 text-fg outline-none ${focusRing}`}
          />
        </label>
        {error ? <p className="text-sm text-heat">{error}</p> : null}
        <button
          type="submit"
          disabled={pending}
          className={`min-h-11 w-full rounded-full bg-fg text-sm font-semibold text-bg disabled:opacity-50 ${focusRing}`}
        >
          {pending ? "Working…" : mode === "up" ? "Create account" : "Sign in"}
        </button>
        <button
          type="button"
          onClick={() => {
            setMode((current) => (current === "up" ? "in" : "up"));
            setError(null);
          }}
          className={`text-sm text-muted ${focusRing}`}
        >
          {mode === "up" ? "Already have an account? Sign in" : "New here? Create an account"}
        </button>
      </form>
    </div>
  );
}
