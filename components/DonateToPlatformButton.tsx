"use client";

import { useState, useEffect, useRef } from "react";
import { HeartIcon } from "lucide-react";
import DonateModal from "./DonateModal";

export default function DonateToPlatformButton({
  initialBalance,
  onSuccess,
}: {
  initialBalance?: number;
  onSuccess?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [balance, setBalance] = useState(initialBalance ?? 0);
  const [loading, setLoading] = useState(typeof initialBalance !== "number");
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (typeof initialBalance === "number") return;
    if (fetchedRef.current && !open) return;
    fetchedRef.current = true;
    let cancelled = false;
    fetch("/api/donate/balance")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (!cancelled && d) setBalance(d.balance); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-rose-500/30 bg-rose-950/20 px-3 py-1.5 text-xs text-rose-300 hover:bg-rose-500/20 transition"
        aria-label="Support Genesis Node"
      >
        <HeartIcon className="h-3.5 w-3.5" />
        Support Genesis Node
      </button>
      {open && (
        <DonateModal
          mode="platform"
          balance={loading ? 0 : balance}
          onClose={() => setOpen(false)}
          onSuccess={() => {
            setOpen(false);
            onSuccess?.();
          }}
        />
      )}
    </>
  );
}
