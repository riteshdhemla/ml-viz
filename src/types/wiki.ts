export interface WikiPageMeta {
  slug: string;
  title: string;
  description: string;
  /** Free-form tags; the first tag is the grouping key on the /wiki index. */
  topics: string[];
  /** "courseSlug/lessonSlug" entries — drive the "Referenced by" footer. */
  relatedLessons: string[];
  estimatedMinutes: number;
  /** Override the auto-generated Colab URL. Leave unset to use notebooks/wiki/{slug}.ipynb. */
  notebookUrl?: string;
}
