import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\w-]+/g, "");
}

export function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function range(n: number): number[] {
  return Array.from({ length: n }, (_, i) => i);
}

const GITHUB_REPO = "riteshdhemla/ml-viz";
const GITHUB_BRANCH = "main";

export function getSiteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}

/**
 * Returns a Google Colab URL for a lesson notebook.
 * Convention: notebooks/{courseSlug}/{lessonSlug}.ipynb
 * Pass `override` to use an explicit URL instead.
 */
export function getNotebookUrl(
  courseSlug: string,
  lessonSlug: string,
  override?: string
): string {
  if (override) return override;
  const path = `notebooks/${courseSlug}/${lessonSlug}.ipynb`;
  return `https://colab.research.google.com/github/${GITHUB_REPO}/blob/${GITHUB_BRANCH}/${path}`;
}

export function getLessonUrl(courseSlug: string, lessonSlug: string): string {
  return `${getSiteUrl()}/courses/${courseSlug}/${lessonSlug}`;
}
