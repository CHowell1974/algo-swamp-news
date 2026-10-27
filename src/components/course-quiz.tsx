import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { CourseCertificateLink, focusRing } from "@/components/course-ui";
import { submitFinalExam, submitModuleQuiz } from "@/lib/course.functions";
import type { PublicQuizQuestion, QuizScore } from "@/lib/course/types";

export function CourseQuiz({
  questions,
  mode,
  moduleId,
  passingScoreCount,
  initialBest,
  initialAttempts,
  signedIn,
  signInNext,
  moduleNumber,
  courseId = "options-101",
}: {
  questions: PublicQuizQuestion[];
  mode: "module" | "exam";
  moduleId?: string;
  moduleNumber?: number;
  passingScoreCount?: number;
  initialBest: number | null;
  initialAttempts: number;
  signedIn: boolean;
  signInNext: string;
  courseId?: string;
}) {
  const submitModule = useServerFn(submitModuleQuiz);
  const submitExam = useServerFn(submitFinalExam);
  const [picks, setPicks] = useState<(number | null)[]>(() => questions.map(() => null));
  const [result, setResult] = useState<QuizScore | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [best, setBest] = useState(initialBest);
  const [attempts, setAttempts] = useState(initialAttempts);
  const ready = picks.every((pick) => pick != null);

  function choose(questionIndex: number, optionIndex: number) {
    if (result) return;
    setPicks((current) =>
      current.map((pick, index) => (index === questionIndex ? optionIndex : pick)),
    );
  }

  async function submit() {
    if (!ready || pending || !signedIn) return;
    setPending(true);
    setError(null);
    try {
      const answers = picks.map((pick) => pick ?? -1);
      const score =
        mode === "exam"
          ? await submitExam({ data: { courseId, answers } })
          : await submitModule({
              data: { courseId, moduleId: moduleId ?? "", answers },
            });
      setResult(score);
      setBest(score.bestCorrect);
      setAttempts(score.attempts);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not score that quiz.");
    } finally {
      setPending(false);
    }
  }

  function retake() {
    setPicks(questions.map(() => null));
    setResult(null);
    setError(null);
  }

  const passed = result?.passed === true;
  const examLine =
    mode === "exam" && result && passingScoreCount
      ? result.correct >= passingScoreCount
        ? "Passed"
        : `Need ${passingScoreCount} to pass`
      : null;

  return (
    <section aria-labelledby="quiz-title" className="mt-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h2 id="quiz-title" className="font-display text-3xl text-fg">
          {mode === "exam" ? `${questions.length} questions` : `Module ${moduleNumber ?? ""} quiz`}
        </h2>
        {attempts > 0 && best != null ? (
          <p className="text-sm text-muted tabular-nums">
            Best {best}/{questions.length}
            {attempts > 1 ? ` · ${attempts} tries` : ""}
          </p>
        ) : null}
      </div>
      <p className="mt-2 text-sm text-muted">
        {mode === "exam"
          ? `${questions.length} questions. ${passingScoreCount ?? 12} correct passes. You can retake it.`
          : `${questions.length} questions for practice. No pass or fail. You can retake it.`}
      </p>
      <div className="mt-6 space-y-6" aria-live="polite">
        {result ? (
          <div className="rounded-card border border-line bg-surface px-4 py-4">
            <p className="font-display text-4xl text-fg tabular-nums">
              {result.correct}/{result.total}
              <span className="ml-3 font-sans text-base text-muted">{result.percent}%</span>
            </p>
            {examLine ? (
              <p className={`mt-1 text-sm font-medium ${passed ? "text-signal" : "text-heat"}`}>
                {examLine}
              </p>
            ) : null}
            {passed ? (
              <CourseCertificateLink
                courseId={courseId}
                className={`mt-3 inline-flex min-h-11 items-center text-sm font-medium text-signal ${focusRing}`}
              >
                View your certificate
              </CourseCertificateLink>
            ) : null}
          </div>
        ) : null}
        {questions.map((question, questionIndex) => {
          const graded = result?.results.find((item) => item.id === question.id);
          return (
            <fieldset
              key={question.id}
              className="rounded-card border border-line bg-surface px-4 py-4"
            >
              <legend className="px-1 text-base font-medium text-fg">
                {questionIndex + 1}. {question.question}
              </legend>
              <div className="mt-3 space-y-2">
                {question.options.map((option, optionIndex) => {
                  const selected = (graded?.selected ?? picks[questionIndex]) === optionIndex;
                  const isCorrect = graded ? optionIndex === graded.answerIndex : false;
                  const isWrongPick = Boolean(graded && selected && !graded.correct);
                  const border = isCorrect
                    ? "border-signal"
                    : isWrongPick
                      ? "border-heat"
                      : selected
                        ? "border-fg"
                        : "border-line";
                  return (
                    <label
                      key={option}
                      className={`flex min-h-11 items-start gap-3 rounded-card border px-3 py-2 text-sm text-fg ${border} ${
                        result ? "" : "cursor-pointer"
                      }`}
                    >
                      <input
                        type="radio"
                        name={question.id}
                        className="mt-1 accent-[var(--color-signal)]"
                        checked={selected}
                        disabled={Boolean(result)}
                        onChange={() => choose(questionIndex, optionIndex)}
                      />
                      <span>
                        {option}
                        {isCorrect ? (
                          <span className="ml-2 text-xs font-medium text-signal">Correct</span>
                        ) : null}
                        {isWrongPick ? (
                          <span className="ml-2 text-xs font-medium text-heat">Your answer</span>
                        ) : null}
                      </span>
                    </label>
                  );
                })}
              </div>
              {graded ? (
                <p className="mt-3 text-sm text-pretty text-muted">{graded.explanation}</p>
              ) : null}
            </fieldset>
          );
        })}
      </div>
      <div className="mt-6 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
        {result ? (
          <button
            type="button"
            onClick={retake}
            className={`inline-flex min-h-11 items-center rounded-full bg-fg px-5 text-sm font-semibold text-bg ${focusRing}`}
          >
            Retake
          </button>
        ) : signedIn ? (
          <button
            type="button"
            disabled={!ready || pending}
            onClick={() => void submit()}
            className={`inline-flex min-h-11 items-center rounded-full bg-signal px-5 text-sm font-semibold text-bg disabled:opacity-50 ${focusRing}`}
          >
            {pending ? "Scoring…" : "Submit answers"}
          </button>
        ) : (
          <Link
            to="/login"
            search={{ next: signInNext }}
            className={`inline-flex min-h-11 items-center rounded-full bg-signal px-5 text-sm font-semibold text-bg ${focusRing}`}
          >
            Sign in to save your score
          </Link>
        )}
        {!ready && !result && signedIn ? (
          <p className="text-sm text-muted">Answer every question, then submit.</p>
        ) : null}
      </div>
      {error ? <p className="mt-3 text-sm text-heat">{error}</p> : null}
    </section>
  );
}
