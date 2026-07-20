import type { NextConfig } from "next";

// GITHUB_PAGES=true builds a static-export mirror for GitHub Pages
// (project page at /<repo>, so links and assets need the basePath prefix).
// The default build stays unchanged for Vercel.
const isGitHubPages = process.env.GITHUB_PAGES === "true";
const basePath = isGitHubPages ? process.env.BASE_PATH ?? "/ml-viz" : "";

const nextConfig: NextConfig = {
  pageExtensions: ["ts", "tsx", "mdx"],
  experimental: {
    mdxRs: false,
  },
  ...(isGitHubPages && {
    output: "export",
    basePath,
    assetPrefix: basePath,
    trailingSlash: true,
  }),
  env: {
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL || "https://ml-viz-ruby.vercel.app",
    NEXT_PUBLIC_GITHUB_PAGES: isGitHubPages ? "true" : "",
  },
};

export default nextConfig;
