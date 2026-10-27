import { readMembership } from "@/lib/membership.functions";
import {
  canReadModule,
  courseOffer,
  resolveCourseAccess,
  examPassed,
  formatCertificateDate,
  gradeSubmission,
  lessonVideo,
  resolveCourseCta,
  toPublicQuestion,
  type CourseOffer,
} from "./access";
import { getCourse, moduleAt } from "./content.server";
import {
  hasPaidCourse,
  listModuleProgress,
  readExam,
  saveExam,
  saveModuleQuiz,
  studentDisplayName,
  type SavedExam,
} from "./store.server";
import type { Course } from "./schema";
import type { CourseHome, ExamPage, ModuleNeighbor, ModulePage, QuizScore } from "./types";

function requireOffer(courseId: string): CourseOffer {
  const offer = courseOffer(courseId);
  if (!offer) throw new Error("That course is not available.");
  return offer;
}

async function entitlement(
  userId: string | null,
  offer: CourseOffer,
): Promise<{
  signedIn: boolean;
  entitled: boolean;
  accessVia: "purchase" | "desk" | null;
}> {
  if (!userId) return { signedIn: false, entitled: false, accessVia: null };
  const membership = await readMembership(userId);
  const purchased = await hasPaidCourse(userId, offer.id);
  let prerequisiteMet = true;
  if (offer.prerequisiteCourseId) {
    const prior = await readExam(userId, offer.prerequisiteCourseId);
    prerequisiteMet = Boolean(prior?.passed);
  }
  return {
    signedIn: true,
    ...resolveCourseAccess({
      includedWithDesk: offer.includedWithDesk,
      membershipActive: membership.active,
      purchased,
      prerequisiteMet,
    }),
  };
}

function neighbor(course: Course, index: number, delta: number): ModuleNeighbor {
  const module = course.modules[index + delta];
  if (!module) return null;
  return { id: module.id, title: module.title };
}

function examSummary(
  saved: SavedExam | null,
  passingScoreCount: number,
  passingScorePercent: number,
  questionCount: number,
) {
  return {
    attempts: saved?.attempts ?? 0,
    bestCorrect: saved?.bestCorrect ?? null,
    questionCount: saved?.questionCount ?? questionCount,
    passed: saved?.passed ?? false,
    passedAt: saved?.passedAt ?? null,
    passingScoreCount,
    passingScorePercent,
  };
}

export async function loadCourseHome(userId: string | null, courseId: string): Promise<CourseHome> {
  const offer = requireOffer(courseId);
  const course = getCourse(offer.id);
  const access = await entitlement(userId, offer);
  const progress = userId ? await listModuleProgress(userId, course.id) : new Map();
  const savedExam = userId ? await readExam(userId, course.id) : null;
  const modules = course.modules.map((module, index) => {
    const row = progress.get(module.id);
    return {
      id: module.id,
      title: module.title,
      learningObjectives: module.learningObjectives,
      free: index <= offer.freeThroughIndex,
      locked: !canReadModule(index, access.entitled, offer.freeThroughIndex),
      completed: Boolean(row),
      bestCorrect: row ? row.bestCorrect : null,
      questionCount: module.quiz.length,
      attempts: row?.attempts ?? 0,
    };
  });
  return {
    id: course.id,
    title: course.title,
    tagline: course.tagline,
    level: course.level,
    disclaimer: course.disclaimer,
    intro: course.intro,
    priceUsd: offer.priceUsd,
    signedIn: access.signedIn,
    entitled: access.entitled,
    accessVia: access.accessVia,
    modules,
    completedCount: modules.filter((module) => module.completed).length,
    exam: examSummary(
      savedExam,
      course.finalExam.passingScoreCount,
      course.finalExam.passingScorePercent,
      course.finalExam.questions.length,
    ),
  };
}

export async function loadModulePage(
  userId: string | null,
  courseId: string,
  moduleId: string,
): Promise<ModulePage> {
  const offer = requireOffer(courseId);
  const found = moduleAt(offer.id, moduleId);
  if (!found) throw new Error("That module is not in this course.");
  const course = getCourse(offer.id);
  const access = await entitlement(userId, offer);
  const { module, index } = found;
  const shared = {
    disclaimer: course.disclaimer,
    courseId: course.id,
    courseTitle: course.title,
    freeThroughIndex: offer.freeThroughIndex,
    index,
    moduleCount: course.modules.length,
    id: module.id,
    title: module.title,
    learningObjectives: module.learningObjectives,
    prev: neighbor(course, index, -1),
    next: neighbor(course, index, 1),
  };
  if (!canReadModule(index, access.entitled, offer.freeThroughIndex)) {
    return {
      access: "locked",
      ...shared,
      priceUsd: offer.priceUsd,
      signedIn: access.signedIn,
    };
  }
  const progress = userId ? await listModuleProgress(userId, course.id) : new Map();
  const row = progress.get(module.id);
  return {
    access: "open",
    ...shared,
    lesson: module.lesson,
    workedExample: module.workedExample,
    tosTip: module.tosTip,
    video: lessonVideo(module.videoLink),
    keyTakeaways: module.keyTakeaways,
    quiz: module.quiz.map(toPublicQuestion),
    showExamLink: index === course.modules.length - 1,
    signedIn: access.signedIn,
    entitled: access.entitled,
    priceUsd: offer.priceUsd,
    bestCorrect: row ? row.bestCorrect : null,
    attempts: row?.attempts ?? 0,
  };
}

export async function loadExamPage(userId: string | null, courseId: string): Promise<ExamPage> {
  const offer = requireOffer(courseId);
  const course = getCourse(offer.id);
  const access = await entitlement(userId, offer);
  if (!access.entitled) {
    return {
      access: "locked",
      disclaimer: course.disclaimer,
      courseId: course.id,
      courseTitle: course.title,
      priceUsd: offer.priceUsd,
      signedIn: access.signedIn,
      passingScoreCount: course.finalExam.passingScoreCount,
      questionCount: course.finalExam.questions.length,
    };
  }
  const saved = userId ? await readExam(userId, course.id) : null;
  return {
    access: "open",
    disclaimer: course.disclaimer,
    courseTitle: course.title,
    courseId: course.id,
    passingScoreCount: course.finalExam.passingScoreCount,
    passingScorePercent: course.finalExam.passingScorePercent,
    questions: course.finalExam.questions.map(toPublicQuestion),
    signedIn: access.signedIn,
    attempts: saved?.attempts ?? 0,
    bestCorrect: saved?.bestCorrect ?? null,
    passed: saved?.passed ?? false,
    passedAt: saved?.passedAt ?? null,
    closingText: course.closing.text,
    ctas: course.closing.ctas.map(resolveCourseCta),
  };
}

export async function gradeModuleQuiz(
  userId: string,
  courseId: string,
  moduleId: string,
  answers: number[],
): Promise<QuizScore> {
  const offer = requireOffer(courseId);
  const found = moduleAt(offer.id, moduleId);
  if (!found) throw new Error("That module is not in this course.");
  const access = await entitlement(userId, offer);
  if (!canReadModule(found.index, access.entitled, offer.freeThroughIndex)) {
    throw new Error(
      offer.includedWithDesk
        ? `This module is locked until you buy ${offer.shortName} or start a desk plan.`
        : `This module is locked until you buy ${offer.shortName}.`,
    );
  }
  const graded = gradeSubmission(found.module.quiz, answers);
  const saved = await saveModuleQuiz({
    userId,
    courseId: offer.id,
    moduleId,
    correct: graded.correct,
    questionCount: graded.total,
  });
  return {
    ...graded,
    bestCorrect: saved.bestCorrect,
    attempts: saved.attempts,
    passed: null,
    passedAt: null,
  };
}

export async function gradeFinalExam(
  userId: string,
  courseId: string,
  answers: number[],
): Promise<QuizScore> {
  const offer = requireOffer(courseId);
  const course = getCourse(offer.id);
  const access = await entitlement(userId, offer);
  if (!access.entitled) {
    throw new Error(
      offer.includedWithDesk
        ? `The final exam is locked until you buy ${offer.shortName} or start a desk plan.`
        : `The final exam is locked until you buy ${offer.shortName}.`,
    );
  }
  const graded = gradeSubmission(course.finalExam.questions, answers);
  const passed = examPassed(graded.correct, course.finalExam.passingScoreCount);
  const saved = await saveExam({
    userId,
    courseId: course.id,
    correct: graded.correct,
    questionCount: graded.total,
    passed,
  });
  return {
    ...graded,
    bestCorrect: saved.bestCorrect,
    attempts: saved.attempts,
    passed: saved.passed,
    passedAt: saved.passedAt,
  };
}

export async function loadCertificate(userId: string | null, courseId: string) {
  const offer = requireOffer(courseId);
  const course = getCourse(offer.id);
  if (!userId) {
    return {
      passed: false as const,
      signedIn: false as const,
      courseId: course.id,
      courseTitle: course.title,
      disclaimer: course.disclaimer,
    };
  }
  const access = await entitlement(userId, offer);
  const saved = await readExam(userId, course.id);
  if (!access.entitled || !saved?.passed || !saved.passedAt) {
    return {
      passed: false as const,
      signedIn: true as const,
      courseId: course.id,
      courseTitle: course.title,
      disclaimer: course.disclaimer,
    };
  }
  const name = await studentDisplayName(userId);
  return {
    passed: true as const,
    signedIn: true as const,
    name,
    courseId: course.id,
    courseTitle: course.title,
    completedOn: formatCertificateDate(saved.passedAt),
    disclaimer: course.disclaimer,
    closingText: course.closing.text,
    ctas: course.closing.ctas.map(resolveCourseCta),
  };
}
