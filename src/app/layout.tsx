import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CanvasLab | Seiba Shonia",
  description:
    "A browser-based visual editor built to explore frontend editor architecture, rendering, interactions, accessibility, and performance.",
};

type RootLayoutProps = Readonly<{
  children: React.ReactNode;
}>;

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
