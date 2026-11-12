import { createServerFn } from "@tanstack/react-start";
import type { WireSubscribeResult } from "@/lib/brevo";
import { isValidEmail } from "@/lib/kit-subscribe";

export type { WireSubscribeResult };

export const subscribeToFreeWire = createServerFn({ method: "POST" })
  .validator((input: { email?: string } | undefined): { email: string } => {
    const email = input?.email?.trim() ?? "";
    if (!isValidEmail(email)) throw new Error("Enter a valid email address.");
    return { email };
  })
  .handler(async ({ data }): Promise<WireSubscribeResult> => {
    const { subscribeWireContact } = await import("@/lib/brevo.server");
    return subscribeWireContact(data.email);
  });
