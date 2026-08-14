import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { SITE_URL, SITE_NAME, SITE_DESCRIPTION } from "@/lib/site";
import { CommandPalette } from "@/components/search/CommandPalette";
import { ReviewWidget } from "@/components/review/ReviewWidget";
import "./globals.css";

// The review widget is a dev-only content-capture tool. It self-gates at
// render, but gating the element here keeps its module out of the production
// client graph entirely rather than relying on minifier dead-code elimination.
const isDev = process.env.NODE_ENV === "development";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "ML Viz — Learn Machine Learning Interactively",
    template: "%s | ML Viz",
  },
  description: SITE_DESCRIPTION,
  keywords: ["machine learning", "neural networks", "interactive", "visualization", "education"],
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    url: SITE_URL,
    title: "ML Viz — Learn Machine Learning Interactively",
    description: SITE_DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: "ML Viz — Learn Machine Learning Interactively",
    description: SITE_DESCRIPTION,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable} data-scroll-behavior="smooth">
      <body>
        {children}
        <CommandPalette />
        {isDev && <ReviewWidget />}
      </body>
    </html>
  );
}
