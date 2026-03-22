"use client";

import { useState, useEffect } from "react";
import { HeartIcon } from "lucide-react";

interface Props {
  agentId: string;
  isLoggedIn: boolean;
  initialSaved?: boolean;
  variant?: "card" | "page";
  onToggle?: (saved: boolean) => void;
}

export default function SaveAgentButton({
  agentId,
  isLoggedIn,
  initialSaved = false,
  variant = "card",
  onToggle,
}: Props) {
  const [saved, setSaved] = useState(initialSaved);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setSaved(initialSaved);
  }, [initialSaved]);

  async function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!isLoggedIn || loading) return;
    setLoading(true);
    try {
      if (saved) {
        const res = await fetch(`/api/saved-agents?agent_id=${encodeURIComponent(agentId)}`, { method: "DELETE" });
        if (res.ok) {
          setSaved(false);
          onToggle?.(false);
        }
      } else {
        const res = await fetch("/api/saved-agents", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ agent_id: agentId }),
        });
        if (res.ok) {
          setSaved(true);
          onToggle?.(true);
        }
      }
    } finally {
      setLoading(false);
    }
  }

  if (!isLoggedIn) return null;

  const isCard = variant === "card";
  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      aria-label={saved ? "Remove from saved" : "Save agent"}
      title={saved ? "Remove from saved" : "Save for later"}
      className={
        isCard
          ? `absolute top-3 left-3 z-10 flex h-8 w-8 items-center justify-center rounded-full border transition ${
              saved
                ? "border-red-500/50 bg-red-500/20 text-red-400"
                : "border-slate-700 bg-slate-900/80 text-slate-400 hover:border-slate-600 hover:text-slate-200"
            }`
          : `inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs transition ${
              saved
                ? "border-red-500/50 bg-red-500/10 text-red-400"
                : "border-slate-700 bg-slate-900/60 text-slate-400 hover:border-slate-600 hover:text-slate-200"
            }`
          }
    >
      <HeartIcon className={`h-3.5 w-3.5 ${saved ? "fill-current" : ""}`} />
      {!isCard && <span>{saved ? "Saved" : "Save"}</span>}
    </button>
  );
}
