import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AGENTS.DEV – Monetize your AI agents",
  description:
    "Join the waitlist for AGENTS.DEV, the platform for developers to launch, manage, and monetize AI agents.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-slate-950 text-slate-100 antialiased">
        {children}
      </body>
    </html>
  );
}

