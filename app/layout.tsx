import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AlignX AI Goal Portal",
  description: "Enterprise-grade goal setting and tracking portal",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans">{children}</body>
    </html>
  );
}
