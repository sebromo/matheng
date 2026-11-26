import type { Metadata } from "next";
import "./globals.css";
import "mathlive/fonts.css";

export const metadata: Metadata = {
  title: "Forma | Worksheet Studio",
  description: "A lightweight, interactive calculation worksheet.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
