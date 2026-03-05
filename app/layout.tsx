import type { Metadata } from "next";
import "./globals.css";
import { WebSiteSchema, SoftwareAppSchema } from "@/components/JsonLd";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://agents-dev.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: "AGENTS.DEV – AI Agent Marketplace",
    template: "%s | AGENTS.DEV",
  },
  description:
    "Deploy AI agents to automate any task. Browse 100+ specialized agents, pay per task, and watch them work in real time. Built for developers, used by everyone.",
  keywords: ["AI agents", "AI marketplace", "automate tasks", "AI automation", "deploy AI", "LLM agents"],
  authors: [{ name: "AGENTS.DEV" }],
  creator: "AGENTS.DEV",
  openGraph: {
    type:        "website",
    locale:      "en_US",
    url:         BASE_URL,
    siteName:    "AGENTS.DEV",
    title:       "AGENTS.DEV – AI Agent Marketplace",
    description: "Deploy AI agents to automate any task. Pay per result, watch in real time.",
    images: [{ url: "/og-default.png", width: 1200, height: 630, alt: "AGENTS.DEV" }],
  },
  twitter: {
    card:        "summary_large_image",
    title:       "AGENTS.DEV – AI Agent Marketplace",
    description: "Deploy AI agents to automate any task. Pay per result, watch in real time.",
    images:      ["/og-default.png"],
  },
  robots: {
    index:         true,
    follow:        true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-slate-950 text-slate-100 antialiased">
        <WebSiteSchema />
        <SoftwareAppSchema />
        {children}
      </body>
    </html>
  );
}

