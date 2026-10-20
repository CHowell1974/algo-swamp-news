import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ALGO Swamp News",
  description: "A financial headline scanner that scores heat, tickers, and tone.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
