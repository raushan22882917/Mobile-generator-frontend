import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Expo App Builder",
  description: "Generate React Native + Expo applications from natural language prompts",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
