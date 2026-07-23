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

// ── Course-level view ────────────────────────────────────────────────
// The full graph (299 nodes) is a hairball to draw at once. The course-level
// projection keeps it legible: 33 course nodes, prerequisite + aggregated
// cross-course "related" edges, and a per-course detail payload for drill-down.

export interface CourseGraphNode {
  slug: string;
  title: string;
  cluster: string;
  spine?: SpineId;
  href: string;
  lessonCount: number;
}

export interface CourseGraphEdge {
  source: string; // course slug
  target: string; // course slug
  kind: "prerequisite" | "related";
  weight: number;
}

export interface CourseDetail {
  lessons: Array<{ title: string; href: string; spineStages: string[] }>;
  deepDives: Array<{ title: string; href: string }>;
}

export interface CourseGraph {
  nodes: CourseGraphNode[];
  edges: CourseGraphEdge[];
  details: Record<string, CourseDetail>;
}

const courseOf = (lessonNodeId: string) => lessonNodeId.slice("lesson:".length).split("/")[0];

// ── Local neighbourhood (per-page "concept map fragment") ────────────

export type NeighborRelation = "builds-on" | "related" | "deeper" | "referenced-by";

export interface NeighborRef {
  title: string;
  href: string;
  kind: NodeKind;
  relation: NeighborRelation;
}

export interface Neighborhood {
  center: { title: string; kind: NodeKind };
  neighbors: NeighborRef[];
}

/**
 * The immediate typed neighbourhood of a lesson or wiki node — the "concept
 * map fragment" shown at the point of study. Prereqs in, related across, deep
 * dives out (and, for wiki pages, the lessons that reference them).
 */
export function getNeighborhood(id: string, perGroup = 6): Neighborhood | null {
  const center = getGraphNode(id);
  if (!center) return null;
  const { nodes } = buildKnowledgeGraph();
  const byId = new Map(nodes.map((n) => [n.id, n]));

  const out: NeighborRef[] = [];
  const seen = new Set<string>();
  const push = (node: GraphNode | undefined, relation: NeighborRelation, cap: number, count: { n: number }) => {
    if (!node || seen.has(node.id) || node.id === id || count.n >= cap) return;
    seen.add(node.id);
    count.n += 1;
    out.push({ title: node.title, href: node.href, kind: node.kind, relation });
  };

  // "Builds on": for a lesson, its course's prerequisite courses.
  if (center.kind === "lesson") {
    const course = getGraphNode(courseId(courseOf(id)));
    if (course) {
      const c = { n: 0 };
      for (const nb of neighbors(course.id)) {
        if (nb.kind === "prerequisite" && nb.direction === "out") push(nb.node, "builds-on", 3, c);
      }
    }
  }

  const nbs = neighbors(id);
  const rel = { n: 0 };
  for (const nb of nbs) if (nb.kind === "related") push(nb.node, "related", perGroup, rel);

  if (center.kind === "lesson") {
    const deep = { n: 0 };
    for (const nb of nbs) if (nb.kind === "deep-dive" && nb.direction === "out") push(nb.node, "deeper", perGroup, deep);
  } else {
    // wiki: lessons that reference this page
    const ref = { n: 0 };
    for (const nb of nbs) if (nb.kind === "deep-dive" && nb.direction === "in") push(nb.node, "referenced-by", perGroup, ref);
  }

  void byId; // (kept for clarity; lookups go through getGraphNode/neighbors)
  if (out.length === 0) return null;
  return { center: { title: center.title, kind: center.kind }, neighbors: out };
}

/** Project the full graph down to a legible course-level map with drill-down. */
export function buildCourseGraph(): CourseGraph {
  const { nodes, edges } = buildKnowledgeGraph();
  const byId = new Map(nodes.map((n) => [n.id, n]));

  const courseNodes: CourseGraphNode[] = [];
  const details: Record<string, CourseDetail> = {};
  for (const n of nodes) {
    if (n.kind !== "course") continue;
    const slug = n.id.slice("course:".length);
    courseNodes.push({
      slug,
      title: n.title,
      cluster: n.cluster ?? "Other",
      spine: n.spine,
      href: n.href,
      lessonCount: 0,
    });
    details[slug] = { lessons: [], deepDives: [] };
  }
  const nodeBySlug = new Map(courseNodes.map((n) => [n.slug, n]));

  // Per-course lessons (from containment) + wiki deep-dives (from lesson edges).
  const seenDeepDive = new Set<string>();
  for (const e of edges) {
    if (e.kind === "contains") {
      const slug = e.source.slice("course:".length);
      const lesson = byId.get(e.target);
      const node = nodeBySlug.get(slug);
      if (lesson && node) {
        node.lessonCount += 1;
        details[slug].lessons.push({
          title: lesson.title,
          href: lesson.href,
          spineStages: lesson.spineStages ?? [],
        });
      }
    } else if (e.kind === "deep-dive" && e.source.startsWith("lesson:")) {
      const slug = courseOf(e.source);
      const wiki = byId.get(e.target);
      const key = `${slug}|${e.target}`;
      if (wiki && details[slug] && !seenDeepDive.has(key)) {
        seenDeepDive.add(key);
        details[slug].deepDives.push({ title: wiki.title, href: wiki.href });
      }
    }
  }

  // Course-level edges: prerequisites (direct) + aggregated cross-course "related".
  const edgeMap = new Map<string, CourseGraphEdge>();
  const bump = (source: string, target: string, kind: "prerequisite" | "related") => {
    if (source === target || !nodeBySlug.has(source) || !nodeBySlug.has(target)) return;
    // Undirected key for related (conceptual link); directed for prerequisite.
    const key =
      kind === "prerequisite"
        ? `p|${source}|${target}`
        : `r|${[source, target].sort().join("|")}`;
    const existing = edgeMap.get(key);
    if (existing) existing.weight += 1;
    else edgeMap.set(key, { source, target, kind, weight: 1 });
  };

  for (const e of edges) {
    if (e.kind === "prerequisite") {
      bump(e.source.slice("course:".length), e.target.slice("course:".length), "prerequisite");
    } else if (e.kind === "related" && e.source.startsWith("lesson:") && e.target.startsWith("lesson:")) {
      const a = courseOf(e.source);
      const b = courseOf(e.target);
      if (a !== b) bump(a, b, "related");
    }
  }

  return { nodes: courseNodes, edges: [...edgeMap.values()], details };
}
