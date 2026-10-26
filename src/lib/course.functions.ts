import { createServerFn } from "@tanstack/react-start";
import { authMiddleware, optionalAuthMiddleware } from "@/lib/auth/middleware";

function courseError(cause: unknown, fallback: string): Error {
  if (cause instanceof Error) {
    const message = cause.message;
    const passthrough = [
      "Stripe checkout is not switched on",
      "This checkout",
      "Checkout is not",
      "Payment is still",
      "You already own",
      "Options 101 is included",
      "That module",
      "Answer every",
      "This module is locked",
      "The final exam is locked",
    ];
    if (passthrough.some((prefix) => message.startsWith(prefix))) return cause;
  }
  return new Error(fallback);
}

function answersOf(input: { answers?: number[] }): number[] {
  const answers = input?.answers;
  if (!Array.isArray(answers) || answers.some((value) => !Number.isInteger(value))) {
    throw new Error("Answer every question.");
  }
  return answers;
}

export const getCourseHome = createServerFn({ method: "GET" })
  .middleware([optionalAuthMiddleware])
  .handler(async ({ context }) => {
    const { loadCourseHome } = await import("./course/home.server");
    return loadCourseHome(context.userId);
  });

export const getModulePage = createServerFn({ method: "GET" })
  .middleware([optionalAuthMiddleware])
  .validator((input: { moduleId?: string }) => {
    const moduleId = input?.moduleId?.trim() ?? "";
    if (!moduleId) throw new Error("That module is not in this course.");
    return { moduleId };
  })
  .handler(async ({ context, data }) => {
    try {
      const { loadModulePage } = await import("./course/home.server");
      return await loadModulePage(context.userId, data.moduleId);
    } catch (cause) {
      throw courseError(cause, "Could not open that module.");
    }
  });

export const getExamPage = createServerFn({ method: "GET" })
  .middleware([optionalAuthMiddleware])
  .handler(async ({ context }) => {
    const { loadExamPage } = await import("./course/home.server");
    return loadExamPage(context.userId);
  });

export const getCertificatePage = createServerFn({ method: "GET" })
  .middleware([optionalAuthMiddleware])
  .handler(async ({ context }) => {
    const { loadCertificate } = await import("./course/home.server");
    return loadCertificate(context.userId);
  });

export const submitModuleQuiz = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { moduleId?: string; answers?: number[] }) => {
    const moduleId = input?.moduleId?.trim() ?? "";
    if (!moduleId) throw new Error("That module is not in this course.");
    return { moduleId, answers: answersOf(input) };
  })
  .handler(async ({ context, data }) => {
    try {
      const { gradeModuleQuiz } = await import("./course/home.server");
      return await gradeModuleQuiz(context.userId, data.moduleId, data.answers);
    } catch (cause) {
      throw courseError(cause, "Could not score that quiz.");
    }
  });

export const submitFinalExam = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { answers?: number[] }) => ({ answers: answersOf(input) }))
  .handler(async ({ context, data }) => {
    try {
      const { gradeFinalExam } = await import("./course/home.server");
      return await gradeFinalExam(context.userId, data.answers);
    } catch (cause) {
      throw courseError(cause, "Could not score the exam.");
    }
  });

export const beginCourseCheckout = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    try {
      const { createCourseCheckoutUrl } = await import("./stripe.server");
      const url = await createCourseCheckoutUrl(context.userId);
      return { url };
    } catch (cause) {
      throw courseError(cause, "Could not open Stripe checkout.");
    }
  });

export const confirmCourseCheckout = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { sessionId?: string }) => {
    const sessionId = input?.sessionId?.trim() ?? "";
    if (!sessionId.startsWith("cs_")) throw new Error("Missing checkout session.");
    return { sessionId };
  })
  .handler(async ({ context, data }) => {
    try {
      const { confirmCourseCheckoutSession } = await import("./stripe.server");
      await confirmCourseCheckoutSession(context.userId, data.sessionId);
      const { loadCourseHome } = await import("./course/home.server");
      return loadCourseHome(context.userId);
    } catch (cause) {
      throw courseError(cause, "Could not confirm checkout.");
    }
  });
