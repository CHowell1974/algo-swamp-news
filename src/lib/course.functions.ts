import { createServerFn } from "@tanstack/react-start";
import { authMiddleware, optionalAuthMiddleware } from "@/lib/auth/middleware";
import { COURSE_ID, courseOffer } from "@/lib/course/access";

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
      "Options 201 is included",
      "That module",
      "That course",
      "Answer every",
      "This module is locked",
      "The final exam is locked",
    ];
    if (passthrough.some((prefix) => message.startsWith(prefix))) return cause;
  }
  return new Error(fallback);
}

function courseIdOf(input: { courseId?: string } | undefined): string {
  const courseId = input?.courseId?.trim() || COURSE_ID;
  if (!courseOffer(courseId)) throw new Error("That course is not available.");
  return courseId;
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
  .validator((input: { courseId?: string } | undefined) => ({
    courseId: courseIdOf(input),
  }))
  .handler(async ({ context, data }) => {
    const { loadCourseHome } = await import("./course/home.server");
    return loadCourseHome(context.userId, data.courseId);
  });

export const getModulePage = createServerFn({ method: "GET" })
  .middleware([optionalAuthMiddleware])
  .validator((input: { moduleId?: string; courseId?: string }) => {
    const moduleId = input?.moduleId?.trim() ?? "";
    if (!moduleId) throw new Error("That module is not in this course.");
    return { moduleId, courseId: courseIdOf(input) };
  })
  .handler(async ({ context, data }) => {
    try {
      const { loadModulePage } = await import("./course/home.server");
      return await loadModulePage(context.userId, data.courseId, data.moduleId);
    } catch (cause) {
      throw courseError(cause, "Could not open that module.");
    }
  });

export const getExamPage = createServerFn({ method: "GET" })
  .middleware([optionalAuthMiddleware])
  .validator((input: { courseId?: string } | undefined) => ({
    courseId: courseIdOf(input),
  }))
  .handler(async ({ context, data }) => {
    const { loadExamPage } = await import("./course/home.server");
    return loadExamPage(context.userId, data.courseId);
  });

export const getCertificatePage = createServerFn({ method: "GET" })
  .middleware([optionalAuthMiddleware])
  .validator((input: { courseId?: string } | undefined) => ({
    courseId: courseIdOf(input),
  }))
  .handler(async ({ context, data }) => {
    const { loadCertificate } = await import("./course/home.server");
    return loadCertificate(context.userId, data.courseId);
  });

export const submitModuleQuiz = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { moduleId?: string; courseId?: string; answers?: number[] }) => {
    const moduleId = input?.moduleId?.trim() ?? "";
    if (!moduleId) throw new Error("That module is not in this course.");
    return { moduleId, courseId: courseIdOf(input), answers: answersOf(input) };
  })
  .handler(async ({ context, data }) => {
    try {
      const { gradeModuleQuiz } = await import("./course/home.server");
      return await gradeModuleQuiz(context.userId, data.courseId, data.moduleId, data.answers);
    } catch (cause) {
      throw courseError(cause, "Could not score that quiz.");
    }
  });

export const submitFinalExam = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { courseId?: string; answers?: number[] }) => ({
    courseId: courseIdOf(input),
    answers: answersOf(input),
  }))
  .handler(async ({ context, data }) => {
    try {
      const { gradeFinalExam } = await import("./course/home.server");
      return await gradeFinalExam(context.userId, data.courseId, data.answers);
    } catch (cause) {
      throw courseError(cause, "Could not score the exam.");
    }
  });

export const beginCourseCheckout = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { courseId?: string } | undefined) => ({
    courseId: courseIdOf(input),
  }))
  .handler(async ({ context, data }) => {
    try {
      const { createCourseCheckoutUrl } = await import("./stripe.server");
      const url = await createCourseCheckoutUrl(context.userId, data.courseId);
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
      const courseId = await confirmCourseCheckoutSession(context.userId, data.sessionId);
      const { loadCourseHome } = await import("./course/home.server");
      return loadCourseHome(context.userId, courseId);
    } catch (cause) {
      throw courseError(cause, "Could not confirm checkout.");
    }
  });
