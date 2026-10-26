import raw from "../../content/options-101.json" with { type: "json" };
import type { Course, CourseModule } from "./schema";
import { parseCourse } from "./schema";

let cached: Course | null = null;

export function getCourse(): Course {
  cached ??= parseCourse(raw);
  return cached;
}

export function moduleAt(moduleId: string): { module: CourseModule; index: number } | null {
  const course = getCourse();
  const index = course.modules.findIndex((module) => module.id === moduleId);
  if (index < 0) return null;
  const module = course.modules[index];
  if (!module) return null;
  return { module, index };
}
