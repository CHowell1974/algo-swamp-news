import { createServerFn } from "@tanstack/react-start";
import { authMiddleware, optionalAuthMiddleware } from "@/lib/auth/middleware";
import { STARTER_KIT_ID } from "@/lib/course/access";

function kitError(cause: unknown, fallback: string): Error {
  if (cause instanceof Error) {
    const message = cause.message;
    const passthrough = [
      "Stripe checkout is not switched on",
      "This checkout",
      "Checkout is not",
      "Payment is still",
      "You already own",
      "Your desk is already open",
      "The 30-day desk bonus",
      "That course",
    ];
    if (passthrough.some((prefix) => message.startsWith(prefix))) return cause;
  }
  return new Error(fallback);
}

export const getStarterKitPage = createServerFn({ method: "GET" })
  .middleware([optionalAuthMiddleware])
  .handler(async ({ context }) => {
    const { loadStarterKitPage } = await import("./starter-kit.server");
    return loadStarterKitPage(context.userId);
  });

export const confirmStarterKitCheckout = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { sessionId?: string }) => {
    const sessionId = input?.sessionId?.trim() ?? "";
    if (!sessionId.startsWith("cs_")) throw new Error("Missing checkout session.");
    return { sessionId };
  })
  .handler(async ({ context, data }) => {
    try {
      const { confirmCourseCheckoutSession } = await import("./stripe.server");
      const courseId = await confirmCourseCheckoutSession(context.userId, data.sessionId);
      if (courseId !== STARTER_KIT_ID) {
        throw new Error("This checkout is for a different product.");
      }
      const { loadStarterKitPage } = await import("./starter-kit.server");
      return loadStarterKitPage(context.userId);
    } catch (cause) {
      throw kitError(cause, "Could not confirm checkout.");
    }
  });

export const beginStarterKitDeskTrial = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    try {
      const { createCheckoutUrl } = await import("./stripe.server");
      const url = await createCheckoutUrl(context.userId, "monthly", { starterKitTrial: true });
      return { url };
    } catch (cause) {
      throw kitError(cause, "Could not open the desk trial.");
    }
  });
