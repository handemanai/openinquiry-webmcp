import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";

import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "OpenInquiry",
    template: "%s · OpenInquiry",
  },
  description:
    "A focused demonstration of publisher-controlled, rights-aware knowledge access built on WebMCP.",
  applicationName: "OpenInquiry",
  authors: [{ name: "OpenInquiry contributors" }],
  creator: "OpenInquiry contributors",
  keywords: [
    "WebMCP",
    "knowledge access",
    "academic publishing",
    "publisher control",
    "agent access",
  ],
  openGraph: {
    title: "OpenInquiry",
    description:
      "Publishers decide what agents can use.",
    siteName: "OpenInquiry",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f2efe7" },
    { media: "(prefers-color-scheme: dark)", color: "#111714" },
  ],
  colorScheme: "light dark",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html data-scroll-behavior="smooth" lang="en">
      <body>{children}</body>
    </html>
  );
}
