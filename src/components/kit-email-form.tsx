import { useEffect, useState, type FormEvent } from "react";
import { isValidEmail, subscribeToKitForm } from "@/lib/kit-subscribe";

const focusRing =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal";

const SUCCESS = "Almost there. Check your inbox to confirm.";
const RETRY = "That didn't go through. Check the address and try again.";
const INVALID = "Enter a valid email address.";
const CHECK = "One more step. Confirm below so the opt-in email can send.";

type Phase = "idle" | "submitting" | "success" | "error" | "check";

function kitMessage(data: unknown): { name?: string; height?: number } | null {
  if (!data || typeof data !== "object") return null;
  const record = data as { name?: unknown; height?: unknown };
  if (typeof record.name !== "string") return null;
  return {
    name: record.name,
    height: typeof record.height === "number" ? record.height : undefined,
  };
}

export function KitEmailForm({
  formId,
  titleId,
  inputId,
  statusId,
  kicker,
  title,
  description,
  buttonLabel,
  confirmTitle,
  className = "",
}: {
  formId: string;
  titleId: string;
  inputId: string;
  statusId: string;
  kicker: string;
  title: string;
  description: string;
  buttonLabel: string;
  confirmTitle: string;
  className?: string;
}) {
  const [email, setEmail] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [notice, setNotice] = useState("");
  const [checkUrl, setCheckUrl] = useState<string | null>(null);
  const [frameHeight, setFrameHeight] = useState(440);

  useEffect(() => {
    if (phase !== "check") return;
    function onMessage(event: MessageEvent) {
      if (event.origin !== "https://app.kit.com") return;
      const message = kitMessage(event.data);
      if (!message) return;
      if (message.name === "ckjs:guard:size" && message.height) {
        setFrameHeight(Math.min(560, Math.max(240, Math.ceil(message.height) + 8)));
      }
      if (message.name === "ckjs:guard:confirmed") {
        setCheckUrl(null);
        setPhase("success");
        setNotice(SUCCESS);
      }
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [phase]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const next = email.trim();
    if (!isValidEmail(next)) {
      setPhase("error");
      setNotice(INVALID);
      return;
    }
    setPhase("submitting");
    setNotice("");
    const outcome = await subscribeToKitForm(formId, next);
    if (outcome.kind === "success") {
      setPhase("success");
      setNotice(SUCCESS);
      return;
    }
    if (outcome.kind === "check") {
      setCheckUrl(outcome.url);
      setPhase("check");
      setNotice(CHECK);
      return;
    }
    setPhase("error");
    setNotice(RETRY);
  }

  const statusClass =
    phase === "error" ? "text-heat" : phase === "success" ? "text-signal" : "text-muted";

  return (
    <section
      className={`rounded-card border border-line bg-surface px-5 py-5 ${className}`}
      aria-labelledby={titleId}
    >
      <p className="text-xs font-medium tracking-widest text-muted uppercase">{kicker}</p>
      <h2 id={titleId} className="mt-2 font-display text-2xl text-balance text-fg">
        {title}
      </h2>
      {phase === "success" ? null : (
        <p className="mt-2 text-sm text-pretty text-muted">{description}</p>
      )}

      {phase === "check" && checkUrl ? (
        <iframe
          title={confirmTitle}
          src={checkUrl}
          className="mt-4 w-full rounded-lg border border-line bg-fg"
          style={{ height: frameHeight }}
        />
      ) : null}

      {phase === "success" || phase === "check" ? null : (
        <form className="mt-4" noValidate onSubmit={(event) => void onSubmit(event)}>
          <label htmlFor={inputId} className="text-xs font-medium text-muted">
            Email
          </label>
          <div className="mt-1.5 flex flex-col gap-2">
            <input
              id={inputId}
              name="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              autoCapitalize="none"
              spellCheck={false}
              value={email}
              disabled={phase === "submitting"}
              aria-invalid={phase === "error"}
              aria-describedby={statusId}
              placeholder="you@desk.com"
              onChange={(event) => {
                setEmail(event.target.value);
                if (phase === "error") {
                  setPhase("idle");
                  setNotice("");
                }
              }}
              className={`min-h-11 w-full rounded-full border border-line bg-bg px-4 text-sm text-fg outline-none placeholder:text-muted disabled:opacity-50 ${focusRing}`}
            />
            <button
              type="submit"
              disabled={phase === "submitting"}
              aria-busy={phase === "submitting"}
              className={`inline-flex min-h-11 items-center justify-center rounded-full bg-fg px-4 text-sm font-semibold text-bg transition-opacity duration-200 disabled:opacity-50 ${focusRing}`}
            >
              {phase === "submitting" ? "Sending…" : buttonLabel}
            </button>
          </div>
        </form>
      )}

      <p
        id={statusId}
        role="status"
        aria-live="polite"
        className={`mt-3 min-h-5 text-sm ${statusClass}`}
      >
        {notice}
      </p>
    </section>
  );
}
