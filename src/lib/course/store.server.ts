import { getSql } from "@/lib/db";
import { certificateName } from "./access";

/** Same id as `DEV_USER_ID` in verify.server.ts. Local so checkout does not import auth. */
const PREVIEW_USER_ID = "dev-user";

export type SavedModuleScore = {
  moduleId: string;
  bestCorrect: number;
  questionCount: number;
  attempts: number;
  completedAt: string;
};

export type SavedExam = {
  bestCorrect: number;
  questionCount: number;
  attempts: number;
  passed: boolean;
  passedAt: string | null;
};

function asInt(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "bigint") return Number(value);
  if (typeof value === "string" && value.trim()) return Number(value);
  return 0;
}

function asBool(value: unknown): boolean {
  return value === true || value === "t" || value === "true" || value === 1;
}

function asIso(value: string | Date | null): string | null {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toISOString();
}

export async function hasPaidCourse(userId: string, courseId: string): Promise<boolean> {
  const sql = await getSql();
  const rows = await sql<{ ok: number }>`
    select 1 as ok
    from course_purchases
    where user_id = ${userId} and course_id = ${courseId} and status = 'paid'
    limit 1
  `;
  return rows.length > 0;
}

export async function stripeCustomerForUser(userId: string): Promise<string | null> {
  const sql = await getSql();
  const membership = await sql<{ stripe_customer_id: string | null }>`
    select stripe_customer_id from memberships where user_id = ${userId} limit 1
  `;
  if (membership[0]?.stripe_customer_id) return membership[0].stripe_customer_id;
  const purchase = await sql<{ stripe_customer_id: string | null }>`
    select stripe_customer_id
    from course_purchases
    where user_id = ${userId} and stripe_customer_id is not null
    order by created_at desc
    limit 1
  `;
  return purchase[0]?.stripe_customer_id ?? null;
}

export async function savePaidCoursePurchase(input: {
  stripeCheckoutSessionId: string;
  userId: string;
  courseId: string;
  stripePaymentIntentId: string | null;
  stripeCustomerId: string | null;
  amountCents: number;
  currency: string;
}): Promise<void> {
  const sql = await getSql();
  await sql`
    insert into course_purchases (
      stripe_checkout_session_id, user_id, course_id, stripe_payment_intent_id,
      stripe_customer_id, amount_cents, currency, status
    )
    values (
      ${input.stripeCheckoutSessionId}, ${input.userId}, ${input.courseId},
      ${input.stripePaymentIntentId}, ${input.stripeCustomerId}, ${input.amountCents},
      ${input.currency}, 'paid'
    )
    on conflict (stripe_checkout_session_id) do update set
      status = case
        when course_purchases.status = 'refunded' then course_purchases.status
        else 'paid'
      end,
      stripe_payment_intent_id = coalesce(excluded.stripe_payment_intent_id, course_purchases.stripe_payment_intent_id),
      stripe_customer_id = coalesce(excluded.stripe_customer_id, course_purchases.stripe_customer_id),
      amount_cents = excluded.amount_cents,
      updated_at = now()
  `;
}

export async function markCourseRefunded(paymentIntentId: string): Promise<void> {
  const sql = await getSql();
  await sql`
    update course_purchases
    set status = 'refunded', updated_at = now()
    where stripe_payment_intent_id = ${paymentIntentId} and status = 'paid'
  `;
}

export async function listModuleProgress(
  userId: string,
  courseId: string,
): Promise<Map<string, SavedModuleScore>> {
  const sql = await getSql();
  const rows = await sql<{
    module_id: string;
    best_correct: number | string;
    question_count: number | string;
    attempts: number | string;
    completed_at: string | Date;
  }>`
    select module_id, best_correct, question_count, attempts, completed_at
    from course_module_progress
    where user_id = ${userId} and course_id = ${courseId}
  `;
  const map = new Map<string, SavedModuleScore>();
  for (const row of rows) {
    const completedAt = asIso(row.completed_at);
    if (!completedAt) continue;
    map.set(row.module_id, {
      moduleId: row.module_id,
      bestCorrect: asInt(row.best_correct),
      questionCount: asInt(row.question_count),
      attempts: asInt(row.attempts),
      completedAt,
    });
  }
  return map;
}

export async function saveModuleQuiz(input: {
  userId: string;
  courseId: string;
  moduleId: string;
  correct: number;
  questionCount: number;
}): Promise<SavedModuleScore> {
  const sql = await getSql();
  const rows = await sql<{
    best_correct: number | string;
    question_count: number | string;
    attempts: number | string;
    completed_at: string | Date;
  }>`
    insert into course_module_progress (
      user_id, course_id, module_id, best_correct, question_count, attempts, completed_at
    )
    values (
      ${input.userId}, ${input.courseId}, ${input.moduleId}, ${input.correct},
      ${input.questionCount}, 1, now()
    )
    on conflict (user_id, course_id, module_id) do update set
      best_correct = greatest(course_module_progress.best_correct, excluded.best_correct),
      question_count = excluded.question_count,
      attempts = course_module_progress.attempts + 1,
      updated_at = now()
    returning best_correct, question_count, attempts, completed_at
  `;
  const row = rows[0];
  if (!row) throw new Error("Could not save the quiz.");
  return {
    moduleId: input.moduleId,
    bestCorrect: asInt(row.best_correct),
    questionCount: asInt(row.question_count),
    attempts: asInt(row.attempts),
    completedAt: asIso(row.completed_at) ?? new Date().toISOString(),
  };
}

export async function readExam(userId: string, courseId: string): Promise<SavedExam | null> {
  const sql = await getSql();
  const rows = await sql<{
    best_correct: number | string;
    question_count: number | string;
    attempts: number | string;
    passed: boolean | string | number;
    passed_at: string | Date | null;
  }>`
    select best_correct, question_count, attempts, passed, passed_at
    from course_exam_results
    where user_id = ${userId} and course_id = ${courseId}
  `;
  const row = rows[0];
  if (!row) return null;
  return {
    bestCorrect: asInt(row.best_correct),
    questionCount: asInt(row.question_count),
    attempts: asInt(row.attempts),
    passed: asBool(row.passed),
    passedAt: asIso(row.passed_at),
  };
}

export async function saveExam(input: {
  userId: string;
  courseId: string;
  correct: number;
  questionCount: number;
  passed: boolean;
}): Promise<SavedExam> {
  const sql = await getSql();
  const passedAt = input.passed ? new Date().toISOString() : null;
  const rows = await sql<{
    best_correct: number | string;
    question_count: number | string;
    attempts: number | string;
    passed: boolean | string | number;
    passed_at: string | Date | null;
  }>`
    insert into course_exam_results (
      user_id, course_id, best_correct, question_count, attempts, passed, passed_at
    )
    values (
      ${input.userId}, ${input.courseId}, ${input.correct}, ${input.questionCount},
      1, ${input.passed}, ${passedAt}
    )
    on conflict (user_id, course_id) do update set
      best_correct = greatest(course_exam_results.best_correct, excluded.best_correct),
      question_count = excluded.question_count,
      attempts = course_exam_results.attempts + 1,
      passed = course_exam_results.passed or excluded.passed,
      passed_at = coalesce(course_exam_results.passed_at, excluded.passed_at),
      updated_at = now()
    returning best_correct, question_count, attempts, passed, passed_at
  `;
  const row = rows[0];
  if (!row) throw new Error("Could not save the exam.");
  return {
    bestCorrect: asInt(row.best_correct),
    questionCount: asInt(row.question_count),
    attempts: asInt(row.attempts),
    passed: asBool(row.passed),
    passedAt: asIso(row.passed_at),
  };
}

export async function studentDisplayName(userId: string): Promise<string> {
  if (userId === PREVIEW_USER_ID) return "Dev User";
  const sql = await getSql();
  const rows = await sql<{ name: string | null }>`
    select name from "user" where id = ${userId} limit 1
  `;
  return certificateName(rows[0]?.name);
}
