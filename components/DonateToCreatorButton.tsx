"use client";

import { useState } from "react";
import { HeartIcon } from "lucide-react";
import DonateModal from "./DonateModal";

export default function DonateToCreatorButton({
  creatorId,
  creatorName,
  balance,
  isLoggedIn,
  isOwnAgent,
}: {
  creatorId: string;
  creatorName: string | null;
  balance: number;
  isLoggedIn: boolean;
  isOwnAgent?: boolean;
}) {
  const [open, setOpen] = useState(false);

  if (isOwnAgent) return null;

  if (!isLoggedIn) {
    return (
      <a
        href="/login?next=/agents"
        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/60 px-3 py-1.5 text-xs text-slate-400 hover:border-rose-500/40 hover:text-rose-300 transition"
      >
        <HeartIcon className="h-3.5 w-3.5" />
        Support creator
      </a>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/60 px-3 py-1.5 text-xs text-slate-400 hover:border-rose-500/40 hover:text-rose-300 transition"
        aria-label="Support creator with credits"
      >
        <HeartIcon className="h-3.5 w-3.5" />
        Support creator
      </button>
      {open && (
        <DonateModal
          mode="creator"
          creatorId={creatorId}
          creatorName={creatorName ?? "Creator"}
          balance={balance}
          onClose={() => setOpen(false)}
          onSuccess={() => setOpen(false)}
        />
      )}
    </>
  );
}
