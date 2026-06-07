import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: {
    default: "ML Viz — Learn Machine Learning Interactively",
    template: "%s | ML Viz",
  },
  description:
    "Visual, interactive lessons for understanding machine learning from first principles. Learn neural networks, gradient descent, transformers, and more.",
  keywords: ["machine learning", "neural networks", "interactive", "visualization", "education"],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body>{children}</body>
    </html>
  );
}
