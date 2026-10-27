import raw101 from "../../content/options-101.json" with { type: "json" };
import raw201 from "../../content/options-201.json" with { type: "json" };
import { COURSE_ID, courseOffer } from "./access";
import type { Course, CourseModule } from "./schema";
import { parseCourse } from "./schema";

const rawById: Record<string, unknown> = {
  "options-101": raw101,
  "options-201": raw201,
};

const cached = new Map<string, Course>();

export function getCourse(courseId: string = COURSE_ID): Course {
  const offer = courseOffer(courseId);
  if (!offer) throw new Error("That course is not available.");
  const existing = cached.get(offer.id);
  if (existing) return existing;
  const raw = rawById[offer.id];
  if (!raw) throw new Error("That course is not available.");
  const course = parseCourse(raw);
  if (course.id !== offer.id) {
    throw new Error("That course is not available.");
  }
  cached.set(offer.id, course);
  return course;
}

export function moduleAt(
  courseId: string,
  moduleId: string,
): { module: CourseModule; index: number } | null {
  const course = getCourse(courseId);
  const index = course.modules.findIndex((module) => module.id === moduleId);
  if (index < 0) return null;
  const module = course.modules[index];
  if (!module) return null;
  return { module, index };
}
