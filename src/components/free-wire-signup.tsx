import { KitEmailForm } from "@/components/kit-email-form";
import { KIT_FORM_ID } from "@/lib/kit-subscribe";

export function FreeWireSignup() {
  return (
    <KitEmailForm
      formId={KIT_FORM_ID}
      titleId="free-wire-title"
      inputId="free-wire-email"
      statusId="free-wire-status"
      kicker="Daily wire"
      title="Get the pre-market wire, free"
      description="Six scored headlines in your inbox before the open, every trading day. Free. Unsubscribe anytime."
      buttonLabel="Get the free wire"
      confirmTitle="Confirm your free wire subscription"
    />
  );
}
