/** Canonical site origin, no trailing slash. Safe to import anywhere. */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://ml-viz-ruby.vercel.app"
).replace(/\/$/, "");

export const SITE_NAME = "ML Viz";

export const SITE_DESCRIPTION =
  "Visual, interactive lessons for understanding machine learning from first principles. Learn neural networks, gradient descent, transformers, and more.";

export function absoluteUrl(path: string): string {
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}
