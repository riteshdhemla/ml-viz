import { ImageResponse } from "next/og";
import { SITE_DESCRIPTION } from "@/lib/site";

// Required for the static-export (GitHub Pages) build; a no-op on Vercel.
export const dynamic = "force-static";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "ML Viz — Learn Machine Learning Interactively";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: 80,
          background: "#0f1117",
          color: "white",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 24,
            marginBottom: 40,
          }}
        >
          <div
            style={{
              width: 72,
              height: 72,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "linear-gradient(135deg, #6366f1, #14b8a6)",
              borderRadius: 16,
              fontSize: 32,
              fontWeight: 700,
            }}
          >
            ML
          </div>
          <div style={{ fontSize: 48, fontWeight: 700 }}>ML Viz</div>
        </div>
        <div style={{ fontSize: 64, fontWeight: 700, lineHeight: 1.15 }}>
          Learn Machine Learning Interactively
        </div>
        <div
          style={{
            fontSize: 28,
            color: "#94a3b8",
            marginTop: 28,
            lineHeight: 1.4,
            maxWidth: 980,
          }}
        >
          {SITE_DESCRIPTION}
        </div>
      </div>
    ),
    { ...size }
  );
}
