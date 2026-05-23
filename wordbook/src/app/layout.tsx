import type { Metadata } from "next";
import "../styles/globals.css";

export const metadata: Metadata = {
  title: "Wordbook",
  description: "Custom wordbooks for Word Wrangler.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
