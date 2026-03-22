"use client";

import { useState } from "react";

interface Props {
  source?: string;
  placeholder?: string;
  cta?: string;
  successMessage?: string;
}

export default function LeadCaptureForm({
  source = "homepage",
  placeholder = "you@company.com",
  cta = "Get 100 extra credits",
  successMessage = "Thanks! Check your email for next steps.",
}: Props) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setStatus("loading");
    setErrorMsg("");
    try {
      const res = await fetch("/api/lead-capture", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), source }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error ?? "Something went wrong");
        setStatus("error");
        return;
      }
      setStatus("success");
      setEmail("");
    } catch {
      setErrorMsg("Network error");
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <p className="text-sm text-emerald-400 font-medium">
        {successMessage}
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2 max-w-md">
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder={placeholder}
        disabled={status === "loading"}
        className="flex-1 rounded-lg border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
        aria-label="Email"
      />
      <button
        type="submit"
        disabled={status === "loading"}
        className="shrink-0 rounded-lg bg-indigo-600 hover:bg-indigo-500 px-4 py-2.5 text-sm font-medium text-white transition disabled:opacity-50"
      >
        {status === "loading" ? "…" : cta}
      </button>
      {status === "error" && errorMsg && (
        <p className="text-xs text-red-400 sm:col-span-2">{errorMsg}</p>
      )}
    </form>
  );
}
