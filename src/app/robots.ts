import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/site";

// The GitHub Pages deployment is a mirror of the canonical Vercel site —
// keep crawlers off it so the two never compete in search results.
const isMirror = process.env.NEXT_PUBLIC_GITHUB_PAGES === "true";

// Required for the static-export (GitHub Pages) build; a no-op on Vercel.
export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  if (isMirror) {
    return {
      rules: { userAgent: "*", disallow: "/" },
    };
  }
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
