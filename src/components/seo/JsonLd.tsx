/**
 * Renders a JSON-LD structured-data script tag. Server component.
 * Data is serialized with JSON.stringify and < escaped to prevent
 * script-tag breakout from content-derived strings.
 */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  );
}
