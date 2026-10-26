import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { LEARN_PAGE } from "../seo.ts";
import {
  OPTIONS_101_PRICE_CENTS,
  OPTIONS_101_PRICE_USD,
  canReadModule,
  certificateName,
  continueTarget,
  courseCheckoutOwner,
  courseCheckoutParams,
  courseEntitled,
  courseFulfillmentDecision,
  examPassed,
  formatCertificateDate,
  gradeSubmission,
  lessonVideo,
  nextBestCorrect,
  progressPercent,
  resolveCourseCta,
  toPublicQuestion,
  youtubeId,
} from "./access.ts";
import { parseMarkdown } from "./markdown.ts";
import { parseCourse, type CourseQuestion } from "./schema.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "../../..");
const course = parseCourse(
  JSON.parse(readFileSync(join(root, "src/content/options-101.json"), "utf8")),
);

function question(answerIndex: number): CourseQuestion {
  return {
    id: `q${answerIndex}`,
    question: "Pick one",
    options: ["a", "b", "c", "d"],
    answerIndex,
    explanation: "Because.",
  };
}

describe("options 101 content", () => {
  it("loads eight modules, five-question quizzes, and a 12-of-15 exam", () => {
    assert.equal(course.id, "options-101");
    assert.equal(course.title, "Options 101");
    assert.equal(course.tagline, "Wait. Then Bite.");
    assert.equal(course.modules.length, 8);
    assert.equal(course.finalExam.questions.length, 15);
    assert.equal(course.finalExam.passingScoreCount, 12);
    assert.equal(course.finalExam.passingScorePercent, 80);
    for (const module of course.modules) {
      assert.equal(module.quiz.length, 5);
      assert.equal(module.videoLink.url, "");
      assert.equal(lessonVideo(module.videoLink), null);
    }
    assert.ok(LEARN_PAGE.title.includes(course.title));
    assert.match(course.intro, /beginner options trading course/);
    assert.match(course.intro, /calls and puts explained/);
    assert.equal(course.closing.ctas[1]?.url, "");
    assert.equal(resolveCourseCta(course.closing.ctas[0]).kind, "tools");
    assert.equal(resolveCourseCta(course.closing.ctas[1]).kind, "desk-trial");
  });

  it("renders the module 2 lesson table, lists, and emphasis from the file", () => {
    const blocks = parseMarkdown(course.modules[1].lesson);
    const table = blocks.find((block) => block.type === "table");
    assert.ok(table && table.type === "table");
    assert.equal(table.rows.length, 4);
    assert.equal(
      table.headers[0]?.[0]?.type === "text" ? table.headers[0][0].text : "",
      "Position",
    );
    const list = blocks.find((block) => block.type === "ul");
    assert.ok(list && list.type === "ul");
    assert.equal(list.items.length, 2);
    const motto = parseMarkdown(course.intro).find(
      (block) =>
        block.type === "p" &&
        block.inlines.some(
          (inline) => inline.type === "strong" && inline.text.includes("Wait"),
        ),
    );
    assert.ok(motto);
  });
});

describe("course access", () => {
  it("keeps modules 1 and 2 open and locks the rest until the desk or a purchase", () => {
    assert.equal(canReadModule(0, false), true);
    assert.equal(canReadModule(1, false), true);
    assert.equal(canReadModule(2, false), false);
    assert.equal(canReadModule(7, false), false);
    assert.equal(canReadModule(7, true), true);
    assert.equal(
      courseEntitled({ membershipActive: false, purchased: false }),
      false,
    );
    assert.equal(
      courseEntitled({ membershipActive: true, purchased: false }),
      true,
    );
    assert.equal(
      courseEntitled({ membershipActive: false, purchased: true }),
      true,
    );
  });

  it("grades on the server, passes the exam at 12, and keeps the best score", () => {
    const questions = [question(1), question(0), question(3)];
    const graded = gradeSubmission(questions, [1, 2, 3]);
    assert.equal(graded.correct, 2);
    assert.equal(graded.total, 3);
    assert.equal(graded.percent, 67);
    assert.equal(graded.results[1]?.correct, false);
    assert.equal(graded.results[1]?.explanation, "Because.");
    assert.equal(
      JSON.stringify(toPublicQuestion(questions[0])).includes("answerIndex"),
      false,
    );
    assert.equal(examPassed(12, 12), true);
    assert.equal(examPassed(11, 12), false);
    assert.equal(nextBestCorrect(4, 3), 4);
    assert.equal(nextBestCorrect(null, 3), 3);
    assert.equal(progressPercent(1, 8), 13);
    assert.throws(
      () => gradeSubmission(questions, [1]),
      /Answer every question/,
    );
  });

  it("points a finished student at the next open step", () => {
    const modules = [
      { id: "m1", completed: false, locked: false },
      { id: "m2", completed: false, locked: true },
    ];
    assert.deepEqual(continueTarget(modules, false), {
      kind: "module",
      id: "m1",
      label: "start",
    });
    assert.deepEqual(
      continueTarget(
        [
          { id: "m1", completed: true, locked: false },
          { id: "m2", completed: false, locked: false },
          { id: "m3", completed: false, locked: true },
        ],
        false,
      ),
      { kind: "module", id: "m2", label: "continue" },
    );
    assert.equal(
      continueTarget(
        [
          { id: "m1", completed: true, locked: false },
          { id: "m2", completed: true, locked: false },
          { id: "m3", completed: false, locked: true },
        ],
        false,
      ).kind,
      "locked",
    );
    assert.equal(
      continueTarget(
        [
          { id: "m1", completed: true, locked: false },
          { id: "m2", completed: true, locked: false },
        ],
        false,
      ).kind,
      "exam",
    );
    assert.equal(
      continueTarget(
        [
          { id: "m1", completed: true, locked: false },
          { id: "m2", completed: true, locked: false },
        ],
        true,
      ).kind,
      "certificate",
    );
  });
});

describe("course checkout", () => {
  it("builds a one-time $39 Checkout session without a payment method allowlist", () => {
    const params = courseCheckoutParams({
      userId: "user_1",
      origin: "https://news.algoswamp.com",
      priceId: null,
      customerId: null,
      integrationId: "algo_swamp_course_aaaaaaaa",
    });
    assert.equal(params.mode, "payment");
    assert.equal(params.customer_creation, "always");
    assert.equal("payment_method_types" in params, false);
    assert.equal(
      params.line_items[0] && "price_data" in params.line_items[0]
        ? params.line_items[0].price_data.unit_amount
        : 0,
      OPTIONS_101_PRICE_CENTS,
    );
    assert.equal(OPTIONS_101_PRICE_USD, 39);
    assert.equal(
      params.success_url,
      "https://news.algoswamp.com/learn?session_id={CHECKOUT_SESSION_ID}",
    );
    assert.equal(params.metadata.course_id, "options-101");
    assert.equal(params.integration_identifier, "algo_swamp_course_aaaaaaaa");

    const priced = courseCheckoutParams({
      userId: "user_1",
      origin: "http://localhost:8080",
      priceId: "price_course",
      customerId: "cus_1",
      integrationId: "algo_swamp_course_bbbbbbbb",
    });
    assert.deepEqual(priced.line_items[0], {
      price: "price_course",
      quantity: 1,
    });
    assert.equal(priced.customer, "cus_1");
    assert.equal("customer_creation" in priced, false);
  });

  it("grants access only after a paid course Checkout and ignores a mismatched owner", () => {
    assert.equal(
      courseFulfillmentDecision({
        mode: "payment",
        paymentStatus: "paid",
        courseId: "options-101",
      }),
      "grant",
    );
    assert.equal(
      courseFulfillmentDecision({
        mode: "payment",
        paymentStatus: "no_payment_required",
        courseId: "options-101",
      }),
      "grant",
    );
    assert.equal(
      courseFulfillmentDecision({
        mode: "payment",
        paymentStatus: "unpaid",
        courseId: "options-101",
      }),
      "skip",
    );
    assert.equal(
      courseFulfillmentDecision({
        mode: "subscription",
        paymentStatus: "paid",
        courseId: "options-101",
      }),
      "skip",
    );
    assert.equal(
      courseFulfillmentDecision({
        mode: "payment",
        paymentStatus: "paid",
        courseId: "other",
      }),
      "skip",
    );
    assert.equal(
      courseCheckoutOwner({
        clientReferenceId: "user_1",
        metadataUserId: "user_2",
      }),
      null,
    );
    assert.equal(
      courseCheckoutOwner({
        clientReferenceId: "user_1",
        metadataUserId: "user_1",
      }),
      "user_1",
    );
  });

  it("embeds a YouTube url and hides anything else", () => {
    assert.equal(youtubeId(""), null);
    assert.equal(youtubeId("https://youtu.be/abcdefghijk"), "abcdefghijk");
    assert.equal(
      youtubeId("https://www.youtube.com/watch?v=abcdefghijk"),
      "abcdefghijk",
    );
    assert.equal(
      lessonVideo({
        url: "https://www.youtube.com/embed/abcdefghijk",
        title: "",
      })?.embedUrl,
      "https://www.youtube-nocookie.com/embed/abcdefghijk",
    );
    assert.equal(
      lessonVideo({
        url: "https://example.com/watch?v=abcdefghijk",
        title: "nope",
      }),
      null,
    );
  });

  it("formats the certificate name and date", () => {
    assert.equal(certificateName("  Ada   Lovelace  "), "Ada Lovelace");
    assert.equal(certificateName("   "), "Student");
    assert.equal(
      formatCertificateDate("2026-10-27T03:30:00.000Z"),
      "October 26, 2026",
    );
  });
});
