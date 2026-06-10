import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { SITE_URL, SITE_NAME, SITE_DESCRIPTION } from "@/lib/site";
import { buildSearchIndex } from "@/lib/search-index";
import { CommandPalette } from "@/components/search/CommandPalette";
import "./globals.css";

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
  const searchItems = buildSearchIndex();

  return (
    <html lang="en" className={inter.variable} data-scroll-behavior="smooth">
      <body>
        {children}
        <CommandPalette items={searchItems} />
      </body>
    </html>
  );
}
