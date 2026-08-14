import { buildSearchIndex } from "@/lib/search-index";

/**
 * The search index as a static asset.
 *
 * It used to be built in the root layout and passed to `<CommandPalette>` as a
 * prop, which serialized all ~370 entries into the RSC payload of every page on
 * the site (~110 KB uncompressed each). Almost no visit opens the palette, so
 * that was a fixed cost on every page load for a feature behind ⌘K. Serving it
 * from one cacheable file means the bytes are fetched once, on first open, and
 * reused for the rest of the session.
 *
 * `force-static` is required for the GitHub Pages static export, where this is
 * prerendered to a file at build time — same constraint as sitemap.ts/robots.ts.
 */
export const dynamic = "force-static";

export function GET() {
  return Response.json(buildSearchIndex());
}
