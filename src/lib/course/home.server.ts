import { readMembership } from "@/lib/membership.functions";
import {
  OPTIONS_101_PRICE_USD,
  canReadModule,
  courseEntitled,
  examPassed,
  formatCertificateDate,
  gradeSubmission,
  lessonVideo,
  resolveCourseCta,
  toPublicQuestion,
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
import type {
  CourseHome,
  ExamPage,
  ModuleNeighbor,
  ModulePage,
  QuizScore,
} from "./types";

async function entitlement(userId: string | null): Promise<{
  signedIn: boolean;
  entitled: boolean;
  accessVia: "purchase" | "desk" | null;
}> {
  if (!userId) return { signedIn: false, entitled: false, accessVia: null };
  const course = getCourse();
  const membership = await readMembership(userId);
  const purchased = await hasPaidCourse(userId, course.id);
  return {
    signedIn: true,
    entitled: courseEntitled({
      membershipActive: membership.active,
      purchased,
    }),
    accessVia: purchased ? "purchase" : membership.active ? "desk" : null,
  };
}

function neighbor(index: number, delta: number): ModuleNeighbor {
  const course = getCourse();
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

export async function loadCourseHome(
  userId: string | null,
): Promise<CourseHome> {
  const course = getCourse();
  const access = await entitlement(userId);
  const progress = userId
    ? await listModuleProgress(userId, course.id)
    : new Map();
  const savedExam = userId ? await readExam(userId, course.id) : null;
  const modules = course.modules.map((module, index) => {
    const row = progress.get(module.id);
    return {
      id: module.id,
      title: module.title,
      learningObjectives: module.learningObjectives,
      free: index === 0,
      locked: !canReadModule(index, access.entitled),
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
    priceUsd: OPTIONS_101_PRICE_USD,
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
  moduleId: string,
): Promise<ModulePage> {
  const found = moduleAt(moduleId);
  if (!found) throw new Error("That module is not in this course.");
  const course = getCourse();
  const access = await entitlement(userId);
  const { module, index } = found;
  const shared = {
    disclaimer: course.disclaimer,
    courseTitle: course.title,
    index,
    moduleCount: course.modules.length,
    id: module.id,
    title: module.title,
    learningObjectives: module.learningObjectives,
    prev: neighbor(index, -1),
    next: neighbor(index, 1),
  };
  if (!canReadModule(index, access.entitled)) {
    return {
      access: "locked",
      ...shared,
      priceUsd: OPTIONS_101_PRICE_USD,
      signedIn: access.signedIn,
    };
  }
  const progress = userId
    ? await listModuleProgress(userId, course.id)
    : new Map();
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
    priceUsd: OPTIONS_101_PRICE_USD,
    bestCorrect: row ? row.bestCorrect : null,
    attempts: row?.attempts ?? 0,
  };
}

export async function loadExamPage(userId: string | null): Promise<ExamPage> {
  const course = getCourse();
  const access = await entitlement(userId);
  if (!access.entitled) {
    return {
      access: "locked",
      disclaimer: course.disclaimer,
      courseTitle: course.title,
      priceUsd: OPTIONS_101_PRICE_USD,
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
  moduleId: string,
  answers: number[],
): Promise<QuizScore> {
  const found = moduleAt(moduleId);
  if (!found) throw new Error("That module is not in this course.");
  const access = await entitlement(userId);
  if (!canReadModule(found.index, access.entitled)) {
    throw new Error(
      "This module is locked until you buy Options 101 or start a desk plan.",
    );
  }
  const graded = gradeSubmission(found.module.quiz, answers);
  const saved = await saveModuleQuiz({
    userId,
    courseId: getCourse().id,
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
  answers: number[],
): Promise<QuizScore> {
  const course = getCourse();
  const access = await entitlement(userId);
  if (!access.entitled) {
    throw new Error(
      "The final exam is locked until you buy Options 101 or start a desk plan.",
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

export async function loadCertificate(userId: string | null) {
  const course = getCourse();
  if (!userId) {
    return {
      passed: false as const,
      signedIn: false as const,
      courseTitle: course.title,
      disclaimer: course.disclaimer,
    };
  }
  const saved = await readExam(userId, course.id);
  if (!saved?.passed || !saved.passedAt) {
    return {
      passed: false as const,
      signedIn: true as const,
      courseTitle: course.title,
      disclaimer: course.disclaimer,
    };
  }
  const name = await studentDisplayName(userId);
  return {
    passed: true as const,
    signedIn: true as const,
    name,
    courseTitle: course.title,
    completedOn: formatCertificateDate(saved.passedAt),
    disclaimer: course.disclaimer,
    closingText: course.closing.text,
    ctas: course.closing.ctas.map(resolveCourseCta),
  };
}
