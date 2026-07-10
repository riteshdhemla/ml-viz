import fs from "fs";
import path from "path";
import matter from "gray-matter";
import type { CourseMeta, LessonMeta, CourseWithLessons } from "@/types/course";
import type { WikiPageMeta } from "@/types/wiki";

const CONTENT_DIR = path.join(process.cwd(), "src/content/courses");
const WIKI_DIR = path.join(process.cwd(), "src/content/wiki");

export function getAllCourses(): CourseMeta[] {
  const courseDirs = fs.readdirSync(CONTENT_DIR);
  return courseDirs
    .map((dir) => {
      const indexPath = path.join(CONTENT_DIR, dir, "index.mdx");
      if (!fs.existsSync(indexPath)) return null;
      const raw = fs.readFileSync(indexPath, "utf-8");
      const { data } = matter(raw);
      return { ...data, slug: dir } as CourseMeta;
    })
    .filter(Boolean)
    .sort((a, b) => (a!.order ?? 0) - (b!.order ?? 0)) as CourseMeta[];
}

export function getCourse(slug: string): CourseWithLessons | null {
  const courseDir = path.join(CONTENT_DIR, slug);
  if (!fs.existsSync(courseDir)) return null;

  const indexPath = path.join(courseDir, "index.mdx");
  const raw = fs.readFileSync(indexPath, "utf-8");
  const { data } = matter(raw);
  const meta = { ...data, slug } as CourseMeta;

  const lessons = getLessonsForCourse(slug);
  return { ...meta, lessons };
}

export function getLessonsForCourse(courseSlug: string): LessonMeta[] {
  const courseDir = path.join(CONTENT_DIR, courseSlug);
  const files = fs
    .readdirSync(courseDir)
    .filter((f) => f.endsWith(".mdx") && f !== "index.mdx")
    .sort();

  return files.map((file) => {
    const raw = fs.readFileSync(path.join(courseDir, file), "utf-8");
    const { data } = matter(raw);
    const lessonSlug = file.replace(".mdx", "");
    return { ...data, slug: lessonSlug, courseSlug } as LessonMeta;
  });
}

/** Frontmatter for a single lesson, or null if the file does not exist. */
export function getLessonMeta(
  courseSlug: string,
  lessonSlug: string
): LessonMeta | null {
  const filePath = path.join(CONTENT_DIR, courseSlug, `${lessonSlug}.mdx`);
  if (!fs.existsSync(filePath)) return null;
  const { data } = matter(fs.readFileSync(filePath, "utf-8"));
  return { ...data, slug: lessonSlug, courseSlug } as LessonMeta;
}

export async function getLessonContent(
  courseSlug: string,
  lessonSlug: string
): Promise<{ meta: LessonMeta; source: string } | null> {
  const filePath = path.join(
    CONTENT_DIR,
    courseSlug,
    `${lessonSlug}.mdx`
  );
  if (!fs.existsSync(filePath)) return null;
  const raw = fs.readFileSync(filePath, "utf-8");
  const { data, content } = matter(raw);
  return {
    meta: { ...data, slug: lessonSlug, courseSlug } as LessonMeta,
    source: content,
  };
}

export function getAllWikiPages(): WikiPageMeta[] {
  if (!fs.existsSync(WIKI_DIR)) return [];
  const files = fs
    .readdirSync(WIKI_DIR)
    .filter((f) => f.endsWith(".mdx"))
    .sort();

  return files
    .map((file) => {
      const raw = fs.readFileSync(path.join(WIKI_DIR, file), "utf-8");
      const { data } = matter(raw);
      return { ...data, slug: file.replace(".mdx", "") } as WikiPageMeta;
    })
    .sort((a, b) => a.title.localeCompare(b.title));
}

export async function getWikiContent(
  slug: string
): Promise<{ meta: WikiPageMeta; source: string } | null> {
  const filePath = path.join(WIKI_DIR, `${slug}.mdx`);
  if (!fs.existsSync(filePath)) return null;
  const raw = fs.readFileSync(filePath, "utf-8");
  const { data, content } = matter(raw);
  return {
    meta: { ...data, slug } as WikiPageMeta,
    source: content,
  };
}
