export type CourseQuestion = {
  id: string;
  question: string;
  options: [string, string, string, string];
  answerIndex: number;
  explanation: string;
};

export type CourseModule = {
  id: string;
  title: string;
  learningObjectives: string[];
  lesson: string;
  workedExample: {
    title: string;
    scenario: string;
    steps: string[];
    result: string;
  };
  tosTip: {
    title: string;
    platform: string;
    text: string;
  };
  videoLink: {
    url: string;
    title: string;
    note: string;
  };
  keyTakeaways: string[];
  quiz: CourseQuestion[];
};

export type Course = {
  id: string;
  title: string;
  tagline: string;
  level: string;
  disclaimer: string;
  intro: string;
  modules: CourseModule[];
  finalExam: {
    passingScorePercent: number;
    passingScoreCount: number;
    questions: CourseQuestion[];
  };
  closing: {
    text: string;
    ctas: { label: string; url: string; note?: string }[];
  };
};

export class CourseContentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CourseContentError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function needString(value: unknown, path: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new CourseContentError(`${path} must be a non-empty string`);
  }
  return value;
}

function needStringList(value: unknown, path: string, min: number): string[] {
  if (!Array.isArray(value) || value.length < min) {
    throw new CourseContentError(`${path} needs at least ${min} entries`);
  }
  return value.map((item, index) => needString(item, `${path}[${index}]`));
}

function parseQuestion(value: unknown, path: string): CourseQuestion {
  if (!isRecord(value)) throw new CourseContentError(`${path} must be an object`);
  const options = value.options;
  if (
    !Array.isArray(options) ||
    options.length !== 4 ||
    options.some((option) => typeof option !== "string" || !option.trim())
  ) {
    throw new CourseContentError(`${path}.options must be 4 non-empty strings`);
  }
  const answerIndex = value.answerIndex;
  if (
    typeof answerIndex !== "number" ||
    !Number.isInteger(answerIndex) ||
    answerIndex < 0 ||
    answerIndex > 3
  ) {
    throw new CourseContentError(`${path}.answerIndex must be an integer from 0 to 3`);
  }
  const [first, second, third, fourth] = options as [string, string, string, string];
  return {
    id: needString(value.id, `${path}.id`),
    question: needString(value.question, `${path}.question`),
    options: [first, second, third, fourth],
    answerIndex,
    explanation: needString(value.explanation, `${path}.explanation`),
  };
}

function parseModule(value: unknown, path: string): CourseModule {
  if (!isRecord(value)) throw new CourseContentError(`${path} must be an object`);
  const example = value.workedExample;
  const tip = value.tosTip;
  const video = value.videoLink;
  if (!isRecord(example) || !isRecord(tip) || !isRecord(video)) {
    throw new CourseContentError(`${path} is missing workedExample, tosTip, or videoLink`);
  }
  if (typeof video.url !== "string" || typeof video.title !== "string") {
    throw new CourseContentError(`${path}.videoLink.url and title must be strings`);
  }
  const quiz = value.quiz;
  if (!Array.isArray(quiz) || quiz.length === 0) {
    throw new CourseContentError(`${path}.quiz must contain questions`);
  }
  return {
    id: needString(value.id, `${path}.id`),
    title: needString(value.title, `${path}.title`),
    learningObjectives: needStringList(value.learningObjectives, `${path}.learningObjectives`, 2),
    lesson: needString(value.lesson, `${path}.lesson`),
    workedExample: {
      title: needString(example.title, `${path}.workedExample.title`),
      scenario: needString(example.scenario, `${path}.workedExample.scenario`),
      steps: needStringList(example.steps, `${path}.workedExample.steps`, 1),
      result: needString(example.result, `${path}.workedExample.result`),
    },
    tosTip: {
      title: needString(tip.title, `${path}.tosTip.title`),
      platform: needString(tip.platform, `${path}.tosTip.platform`),
      text: needString(tip.text, `${path}.tosTip.text`),
    },
    videoLink: {
      url: video.url,
      title: video.title,
      note: typeof video.note === "string" ? video.note : "",
    },
    keyTakeaways: needStringList(value.keyTakeaways, `${path}.keyTakeaways`, 3),
    quiz: quiz.map((question, index) => parseQuestion(question, `${path}.quiz[${index}]`)),
  };
}

/** Validate the course file. Lesson text stays in the JSON; this only checks shape. */
export function parseCourse(input: unknown): Course {
  if (!isRecord(input) || !isRecord(input.course)) {
    throw new CourseContentError("course file must be { course: ... }");
  }
  const raw = input.course;
  if (!Array.isArray(raw.modules) || raw.modules.length === 0) {
    throw new CourseContentError("course.modules must contain modules");
  }
  const modules = raw.modules.map((module, index) =>
    parseModule(module, `course.modules[${index}]`),
  );
  const ids = new Set<string>();
  for (const module of modules) {
    if (ids.has(module.id)) throw new CourseContentError(`duplicate module id ${module.id}`);
    ids.add(module.id);
    if (!/^[a-z0-9-]+$/.test(module.id)) {
      throw new CourseContentError(`module id ${module.id} must be a lowercase slug`);
    }
  }
  if (!isRecord(raw.finalExam) || !Array.isArray(raw.finalExam.questions)) {
    throw new CourseContentError("course.finalExam.questions is missing");
  }
  const questions = raw.finalExam.questions.map((question, index) =>
    parseQuestion(question, `course.finalExam.questions[${index}]`),
  );
  const passingScoreCount = raw.finalExam.passingScoreCount;
  const passingScorePercent = raw.finalExam.passingScorePercent;
  if (
    typeof passingScoreCount !== "number" ||
    !Number.isInteger(passingScoreCount) ||
    passingScoreCount < 1 ||
    passingScoreCount > questions.length
  ) {
    throw new CourseContentError("passingScoreCount is out of range");
  }
  if (Math.round((passingScoreCount / questions.length) * 100) !== passingScorePercent) {
    throw new CourseContentError("passingScorePercent does not match passingScoreCount");
  }
  const questionIds = new Set<string>();
  for (const question of [...modules.flatMap((module) => module.quiz), ...questions]) {
    if (questionIds.has(question.id))
      throw new CourseContentError(`duplicate question id ${question.id}`);
    questionIds.add(question.id);
  }
  if (!isRecord(raw.closing) || !Array.isArray(raw.closing.ctas)) {
    throw new CourseContentError("course.closing is missing");
  }
  const ctas = raw.closing.ctas.map((cta, index) => {
    if (!isRecord(cta))
      throw new CourseContentError(`course.closing.ctas[${index}] must be an object`);
    return {
      label: needString(cta.label, `course.closing.ctas[${index}].label`),
      url: typeof cta.url === "string" ? cta.url : "",
      ...(typeof cta.note === "string" ? { note: cta.note } : {}),
    };
  });
  return {
    id: needString(raw.id, "course.id"),
    title: needString(raw.title, "course.title"),
    tagline: needString(raw.tagline, "course.tagline"),
    level: needString(raw.level, "course.level"),
    disclaimer: needString(raw.disclaimer, "course.disclaimer"),
    intro: needString(raw.intro, "course.intro"),
    modules,
    finalExam: { passingScorePercent, passingScoreCount, questions },
    closing: { text: needString(raw.closing.text, "course.closing.text"), ctas },
  };
}
