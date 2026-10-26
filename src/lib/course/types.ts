import type { GradeResult } from "./access";

export type CourseAccessVia = "purchase" | "desk" | null;

export type CourseOutlineModule = {
  id: string;
  title: string;
  learningObjectives: string[];
  free: boolean;
  locked: boolean;
  completed: boolean;
  bestCorrect: number | null;
  questionCount: number;
  attempts: number;
};

export type CourseExamSummary = {
  attempts: number;
  bestCorrect: number | null;
  questionCount: number;
  passed: boolean;
  passedAt: string | null;
  passingScoreCount: number;
  passingScorePercent: number;
};

export type CourseHome = {
  id: string;
  title: string;
  tagline: string;
  level: string;
  disclaimer: string;
  intro: string;
  priceUsd: number;
  signedIn: boolean;
  entitled: boolean;
  accessVia: CourseAccessVia;
  modules: CourseOutlineModule[];
  completedCount: number;
  exam: CourseExamSummary;
};

export type ModuleNeighbor = { id: string; title: string } | null;

export type LessonVideo = { embedUrl: string; title: string } | null;

export type PublicQuizQuestion = {
  id: string;
  question: string;
  options: string[];
};

export type OpenModulePage = {
  access: "open";
  disclaimer: string;
  courseTitle: string;
  index: number;
  moduleCount: number;
  id: string;
  title: string;
  learningObjectives: string[];
  lesson: string;
  workedExample: { title: string; scenario: string; steps: string[]; result: string };
  tosTip: { title: string; platform: string; text: string };
  video: LessonVideo;
  keyTakeaways: string[];
  quiz: PublicQuizQuestion[];
  prev: ModuleNeighbor;
  next: ModuleNeighbor;
  showExamLink: boolean;
  signedIn: boolean;
  bestCorrect: number | null;
  attempts: number;
};

export type LockedModulePage = {
  access: "locked";
  disclaimer: string;
  courseTitle: string;
  index: number;
  moduleCount: number;
  id: string;
  title: string;
  learningObjectives: string[];
  priceUsd: number;
  signedIn: boolean;
  prev: ModuleNeighbor;
  next: ModuleNeighbor;
};

export type ModulePage = OpenModulePage | LockedModulePage;

export type ResolvedCta =
  | { label: string; kind: "tools" }
  | { label: string; kind: "desk-trial" }
  | { label: string; kind: "external"; href: string };

export type OpenExamPage = {
  access: "open";
  disclaimer: string;
  courseTitle: string;
  courseId: string;
  passingScoreCount: number;
  passingScorePercent: number;
  questions: PublicQuizQuestion[];
  signedIn: boolean;
  attempts: number;
  bestCorrect: number | null;
  passed: boolean;
  passedAt: string | null;
  closingText: string;
  ctas: ResolvedCta[];
};

export type LockedExamPage = {
  access: "locked";
  disclaimer: string;
  courseTitle: string;
  priceUsd: number;
  signedIn: boolean;
  passingScoreCount: number;
  questionCount: number;
};

export type ExamPage = OpenExamPage | LockedExamPage;

export type QuizScore = GradeResult & {
  bestCorrect: number;
  attempts: number;
  passed: boolean | null;
  passedAt: string | null;
};

export type CertificatePage =
  | {
      passed: true;
      signedIn: true;
      name: string;
      courseTitle: string;
      completedOn: string;
      disclaimer: string;
      closingText: string;
      ctas: ResolvedCta[];
    }
  | { passed: false; signedIn: boolean; courseTitle: string; disclaimer: string };
