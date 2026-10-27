import { courseOffer } from "./access";

export function isOptions201(courseId: string): boolean {
  return courseId === "options-201";
}

export function courseHomePath(courseId: string): string {
  return courseOffer(courseId)?.homePath ?? "/learn/options-101";
}

export function courseModulePath(courseId: string, moduleId: string): string {
  return isOptions201(courseId) ? `/learn/options-201/${moduleId}` : `/learn/${moduleId}`;
}
