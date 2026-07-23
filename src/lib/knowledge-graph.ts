import fs from "fs";
import path from "path";
import { getAllCourses, getLessonsForCourse, getAllWikiPages } from "@/lib/content";
import type { SpineId } from "@/types/course";

/**
 * Semantic knowledge graph — the relational *map* that complements the project
 * "spine". Where the spine answers "which slot does this technique change?",
 * the graph answers "what is this a kind of, what does it depend on, and what's
 * nearby?" — a distinct aid to concept understanding and retention.
 *
 * The graph is *generated from existing content*, not re-authored:
 *   - `prerequisite` edges from `CourseMeta.prerequisites`
 *   - `contains` edges from course → its lessons
 *   - `related` / `deep-dive` edges from the hand-authored `## Related concepts`
 *     links and `<WikiLink>`s already in every lesson and wiki body
 *   - `deep-dive` edges from `WikiPageMeta.relatedLessons`
 *
 * `cluster`, `spine`, and `spineStages` ride along on the nodes so the map can
 * be coloured and filtered by the spine — the two structures reinforce.
 *
 * Server-only (reads the filesystem). Import from server components / tests.
 */

const CONTENT_DIR = path.join(process.cwd(), "src/content/courses");
const WIKI_DIR = path.join(process.cwd(), "src/content/wiki");

export type NodeKind = "course" | "lesson" | "wiki";

export interface GraphNode {
  /** Stable id: "course:<slug>", "lesson:<course>/<lesson>", "wiki:<slug>". */
  id: string;
  kind: NodeKind;
  title: string;
  /** Link to the node's page. */
  href: string;
  /** Course cluster (courses + lessons). */
  cluster?: string;
  /** Project-loop spine (courses + lessons). */
  spine?: SpineId;
  /** Lesson's tagged loop stages. */
  spineStages?: string[];
  /** Grouping topic (wiki pages: `topics[0]`). */
  topic?: string;
}

export type EdgeKind = "contains" | "prerequisite" | "related" | "deep-dive";

export interface GraphEdge {
  source: string;
  target: string;
  kind: EdgeKind;
}

export interface KnowledgeGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

const courseId = (slug: string) => `course:${slug}`;
const lessonId = (course: string, lesson: string) => `lesson:${course}/${lesson}`;
const wikiId = (slug: string) => `wiki:${slug}`;

// Link patterns in MDX bodies.
const COURSE_LINK = /\]\(\/courses\/([a-z0-9-]+)\/([a-z0-9-]+)\)/g;
const WIKI_MD_LINK = /\]\(\/wiki\/([a-z0-9-]+)\)/g;
const WIKILINK_TAG = /<WikiLink\s+slug="([^"]+)"/g;

function readBody(file: string): string {
  // Strip frontmatter cheaply — we only want the body links.
  const raw = fs.readFileSync(file, "utf-8");
  return raw.replace(/^---[\s\S]*?---/, "");
}

let cached: KnowledgeGraph | null = null;

/** Build (and memoise) the whole knowledge graph from content on disk. */
export function buildKnowledgeGraph(): KnowledgeGraph {
  if (cached) return cached;

  const nodes = new Map<string, GraphNode>();
  const edgeSet = new Set<string>();
  const edges: GraphEdge[] = [];

  const addEdge = (source: string, target: string, kind: EdgeKind) => {
    if (source === target) return;
    const key = `${source}|${target}|${kind}`;
    if (edgeSet.has(key)) return;
    edgeSet.add(key);
    edges.push({ source, target, kind });
  };

  // ── Nodes: courses + lessons ──────────────────────────────────────
  const courses = getAllCourses();
  for (const course of courses) {
    nodes.set(courseId(course.slug), {
      id: courseId(course.slug),
      kind: "course",
      title: course.title,
      href: `/courses/${course.slug}`,
      cluster: course.cluster,
      spine: course.spine,
    });
    for (const lesson of getLessonsForCourse(course.slug)) {
      if (lesson.type === "quiz") continue;
      nodes.set(lessonId(course.slug, lesson.slug), {
        id: lessonId(course.slug, lesson.slug),
        kind: "lesson",
        title: lesson.title,
        href: `/courses/${course.slug}/${lesson.slug}`,
        cluster: course.cluster,
        spine: course.spine,
        spineStages: lesson.spineStages,
      });
    }
  }

  // ── Nodes: wiki pages ─────────────────────────────────────────────
  const wikiPages = getAllWikiPages();
  for (const page of wikiPages) {
    nodes.set(wikiId(page.slug), {
      id: wikiId(page.slug),
      kind: "wiki",
      title: page.title,
      href: `/wiki/${page.slug}`,
      topic: page.topics?.[0],
    });
  }

  const has = (id: string) => nodes.has(id);

  // ── Edges: course → course prerequisites ──────────────────────────
  for (const course of courses) {
    for (const pre of course.prerequisites ?? []) {
      if (has(courseId(pre))) addEdge(courseId(course.slug), courseId(pre), "prerequisite");
    }
  }

  // ── Edges: course → lesson containment ────────────────────────────
  for (const course of courses) {
    for (const lesson of getLessonsForCourse(course.slug)) {
      if (lesson.type === "quiz") continue;
      addEdge(courseId(course.slug), lessonId(course.slug, lesson.slug), "contains");
    }
  }

  // ── Edges: hand-authored links in lesson bodies ───────────────────
  for (const course of courses) {
    for (const lesson of getLessonsForCourse(course.slug)) {
      if (lesson.type === "quiz") continue;
      const from = lessonId(course.slug, lesson.slug);
      const body = readBody(path.join(CONTENT_DIR, course.slug, `${lesson.slug}.mdx`));
      for (const m of body.matchAll(COURSE_LINK)) {
        const target = lessonId(m[1], m[2]);
        if (has(target)) addEdge(from, target, "related");
      }
      for (const m of body.matchAll(WIKI_MD_LINK)) {
        if (has(wikiId(m[1]))) addEdge(from, wikiId(m[1]), "deep-dive");
      }
      for (const m of body.matchAll(WIKILINK_TAG)) {
        if (has(wikiId(m[1]))) addEdge(from, wikiId(m[1]), "deep-dive");
      }
    }
  }

  // ── Edges: wiki relatedLessons + wiki body links ──────────────────
  for (const page of wikiPages) {
    const from = wikiId(page.slug);
    for (const ref of page.relatedLessons ?? []) {
      const [c, l] = ref.split("/");
      const target = lessonId(c, l);
      // Normalise to lesson → wiki so deep-dive edges point one way.
      if (has(target)) addEdge(target, from, "deep-dive");
    }
    const body = readBody(path.join(WIKI_DIR, `${page.slug}.mdx`));
    for (const m of body.matchAll(WIKI_MD_LINK)) {
      if (has(wikiId(m[1]))) addEdge(from, wikiId(m[1]), "related");
    }
    for (const m of body.matchAll(COURSE_LINK)) {
      const target = lessonId(m[1], m[2]);
      if (has(target)) addEdge(target, from, "deep-dive");
    }
  }

  cached = { nodes: [...nodes.values()], edges };
  return cached;
}

/** All nodes directly connected to `id` (either direction), with the edge kind. */
export function neighbors(
  id: string,
): Array<{ node: GraphNode; kind: EdgeKind; direction: "out" | "in" }> {
  const { nodes, edges } = buildKnowledgeGraph();
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const out: Array<{ node: GraphNode; kind: EdgeKind; direction: "out" | "in" }> = [];
  for (const e of edges) {
    if (e.source === id && byId.has(e.target)) {
      out.push({ node: byId.get(e.target)!, kind: e.kind, direction: "out" });
    } else if (e.target === id && byId.has(e.source)) {
      out.push({ node: byId.get(e.source)!, kind: e.kind, direction: "in" });
    }
  }
  return out;
}

/** Look up a single node. */
export function getGraphNode(id: string): GraphNode | undefined {
  return buildKnowledgeGraph().nodes.find((n) => n.id === id);
}
