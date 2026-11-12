import { useServerFn } from "@tanstack/react-start";
import { KitEmailForm } from "@/components/kit-email-form";
import type { KitSubscribeOutcome } from "@/lib/kit-subscribe";
import { subscribeToFreeWire } from "@/lib/wire-subscribe.functions";

const ALREADY = "You're already on the free wire.";

export function FreeWireSignup() {
  const subscribe = useServerFn(subscribeToFreeWire);
  return (
    <KitEmailForm
      titleId="free-wire-title"
      inputId="free-wire-email"
      statusId="free-wire-status"
      kicker="Daily wire"
      title="Get the pre-market wire, free"
      description="Six scored headlines in your inbox before the open, every trading day. Free. Unsubscribe anytime."
      buttonLabel="Get the free wire"
      confirmTitle="Confirm your free wire subscription"
      subscribe={async (email): Promise<KitSubscribeOutcome> => {
        try {
          const result = await subscribe({ data: { email } });
          if (!result.ok) return { kind: "error", raw: null };
          if (!result.confirm) return { kind: "success", raw: null, notice: ALREADY };
          return { kind: "success", raw: null };
        } catch {
          return { kind: "error", raw: null };
        }
      }}
    />
  );
}
