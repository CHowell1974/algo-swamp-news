import { createServerFn } from "@tanstack/react-start";
import { authMiddleware, optionalAuthMiddleware } from "@/lib/auth/middleware";
import { courseOffer, isDownloadOffer } from "@/lib/course/access";

function productIdOf(input: { productId?: string } | undefined): string {
  const productId = input?.productId?.trim() ?? "";
  if (!isDownloadOffer(productId)) throw new Error("That product is not available.");
  return productId;
}

function studyError(cause: unknown, fallback: string): Error {
  if (cause instanceof Error) {
    const message = cause.message;
    const passthrough = [
      "Stripe checkout is not switched on",
      "This checkout",
      "Checkout is not",
      "Payment is still",
      "You already own",
      "That product",
      "That course",
    ];
    if (passthrough.some((prefix) => message.startsWith(prefix))) return cause;
  }
  return new Error(fallback);
}

export const getStudyPage = createServerFn({ method: "GET" })
  .middleware([optionalAuthMiddleware])
  .validator((input: { productId?: string } | undefined) => ({
    productId: productIdOf(input),
  }))
  .handler(async ({ context, data }) => {
    const { loadStudyAccess } = await import("./studies/download.server");
    return loadStudyAccess(context.userId, data.productId);
  });

export const confirmStudyCheckout = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { sessionId?: string }) => {
    const sessionId = input?.sessionId?.trim() ?? "";
    if (!sessionId.startsWith("cs_")) throw new Error("Missing checkout session.");
    return { sessionId };
  })
  .handler(async ({ context, data }) => {
    try {
      const { confirmCourseCheckoutSession } = await import("./stripe.server");
      const productId = await confirmCourseCheckoutSession(context.userId, data.sessionId);
      if (!courseOffer(productId) || !isDownloadOffer(productId)) {
        throw new Error("That product is not available.");
      }
      return { productId, owned: true as const };
    } catch (cause) {
      throw studyError(cause, "Could not confirm checkout.");
    }
  });
