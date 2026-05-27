import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Fortnite Maps Stats",
  description: "Browse Fortnite Creative map statistics — players, plays, ratings, and live data.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.variable} min-h-screen bg-background`}>
        <header className="border-b border-white/10 bg-surface/60 backdrop-blur sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
            <a href="/" className="text-xl font-bold text-primary">
              FN Maps Stats
            </a>
            <nav className="flex gap-6 text-sm text-muted">
              <a href="/" className="hover:text-white transition-colors">Home</a>
              <a href="/maps" className="hover:text-white transition-colors">Maps</a>
<a href="/tags" className="hover:text-white transition-colors">Tags</a>
<a href="/keywords" className="hover:text-white transition-colors">Keywords</a>
              <a href="/search" className="hover:text-white transition-colors">Search</a>
            </nav>
          </div>
        </header>
        <main className="max-w-7xl mx-auto px-4 py-8">{children}</main>
      </body>
    </html>
  );
}
