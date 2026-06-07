import type { Metadata, Viewport } from "next";
import { validateEnv } from "@/lib/env";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cloud Nexus AI Content Engine",
  description: "AI-powered campaign generator for ecommerce sellers",
};

export const viewport: Viewport = {
  themeColor: "#0EA5E9",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  validateEnv();

  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
