export interface SearchItem {
  /** Route to navigate to. */
  href: string;
  /** Lesson or course title. */
  title: string;
  description: string;
  /** Course title the item belongs to (same as title for course items). */
  courseTitle: string;
  kind: "course" | "lesson";
  /** Lesson type for badge display; undefined for courses. */
  lessonType?: "concept" | "exercise" | "quiz" | "playground";
  estimatedMinutes?: number;
}
