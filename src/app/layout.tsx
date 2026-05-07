import type { Metadata } from "next";
import "../styles/globals.css";

export const metadata: Metadata = {
  title: "its-review",
  description: "Next.js app scaffolded for shadcn/ui",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}