import { useState, useEffect, useMemo } from "react";

function monthsTo1M(mrr: number, growthPercent: number): number | null {
  if (mrr <= 0 || growthPercent <= 0) return null;
  const monthly = 1 + growthPercent / 100;
  let current = mrr;
  let months = 0;
  const cap = 600;
  while (current < 1_000_000 && months < cap) {
    current *= monthly;
    months++;
  }
  return current >= 1_000_000 ? months : null;
}

function formatMonths(m: number): string {
  if (m < 12) return `${m} mo`;
  const y = Math.floor(m / 12);
  const mo = m % 12;
  return mo ? `${y}y ${mo}mo` : `${y}y`;
}

export default function App() {
  const [mrr, setMrr] = useState(5000);
  const [growth, setGrowth] = useState(15);
  const [copied, setCopied] = useState(false);
  const [email, setEmail] = useState("");
  const [emailSent, setEmailSent] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);

  const params = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
  const initialMrr = params.get("mrr");
  const initialGrowth = params.get("growth");
  useEffect(() => {
    if (initialMrr != null) setMrr(Number(initialMrr) || 5000);
    if (initialGrowth != null) setGrowth(Number(initialGrowth) || 15);
  }, [initialMrr, initialGrowth]);

  const months = useMemo(() => monthsTo1M(mrr, growth), [mrr, growth]);
  const shareUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}${window.location.pathname}?mrr=${mrr}&growth=${growth}`
      : "";

  const copyShare = () => {
    if (!shareUrl) return;
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const submitEmail = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || emailSent) return;
    const endpoint = (import.meta as unknown as { env: { VITE_LEAD_ENDPOINT?: string } }).env?.VITE_LEAD_ENDPOINT;
    if (!endpoint) {
      setEmailSent(true);
      return;
    }
    setEmailLoading(true);
    fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim(), mrr, growth, months }),
    })
      .then(() => setEmailSent(true))
      .catch(() => setEmailSent(true))
      .finally(() => setEmailLoading(false));
  };

  return (
    <div className="min-h-screen bg-[#0c0c0f] text-[#e8e6e3] flex flex-col items-center justify-center p-6 font-[system-ui,sans-serif]">
      <div className="max-w-lg w-full">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-center mb-1">
          Runway to $1M
        </h1>
        <p className="text-[#9ca3af] text-center text-sm mb-10">
          When will you hit $1M ARR at your current growth?
        </p>

        <div className="space-y-6 rounded-2xl bg-[#16161a] border border-[#2a2a2e] p-6 md:p-8">
          <div>
            <label className="block text-sm font-medium text-[#9ca3af] mb-2">
              Current MRR ($)
            </label>
            <input
              type="number"
              min={100}
              max={999999}
              step={500}
              value={mrr}
              onChange={(e) => setMrr(Number(e.target.value) || 0)}
              className="w-full px-4 py-3 rounded-xl bg-[#0c0c0f] border border-[#2a2a2e] text-lg focus:border-[#6366f1] focus:ring-1 focus:ring-[#6366f1] outline-none transition"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#9ca3af] mb-2">
              Monthly growth (%)
            </label>
            <input
              type="number"
              min={1}
              max={100}
              step={1}
              value={growth}
              onChange={(e) => setGrowth(Number(e.target.value) || 0)}
              className="w-full px-4 py-3 rounded-xl bg-[#0c0c0f] border border-[#2a2a2e] text-lg focus:border-[#6366f1] focus:ring-1 focus:ring-[#6366f1] outline-none transition"
            />
          </div>

          <div className="pt-4 border-t border-[#2a2a2e]">
            {months != null ? (
              <>
                <p className="text-[#9ca3af] text-sm mb-1">Time to $1M ARR</p>
                <p className="text-4xl md:text-5xl font-bold text-[#a5b4fc]">
                  {formatMonths(months)}
                </p>
                <p className="text-[#6b7280] text-sm mt-2">
                  At {growth}% monthly you’ll cross $1M in {formatMonths(months).toLowerCase()}.
                </p>
              </>
            ) : (
              <p className="text-[#6b7280]">Enter MRR and growth % to see your runway.</p>
            )}
          </div>

          {months != null && shareUrl && (
            <button
              type="button"
              onClick={copyShare}
              className="w-full py-3 rounded-xl bg-[#4338ca] hover:bg-[#3730a3] text-white font-medium transition"
            >
              {copied ? "Link copied" : "Share my runway"}
            </button>
          )}

          {months != null && (
            <form onSubmit={submitEmail} className="pt-4 border-t border-[#2a2a2e]">
              <p className="text-[#9ca3af] text-sm mb-2">Get a one-pager with your path to $1M</p>
              <div className="flex gap-2">
                <input
                  type="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={emailSent}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-[#0c0c0f] border border-[#2a2a2e] text-sm focus:border-[#6366f1] outline-none"
                />
                <button
                  type="submit"
                  disabled={emailSent || emailLoading || !email.trim()}
                  className="px-4 py-2.5 rounded-xl bg-[#2a2a2e] hover:bg-[#3f3f46] text-white text-sm font-medium disabled:opacity-50 transition"
                >
                  {emailSent ? "Sent" : emailLoading ? "…" : "Send"}
                </button>
              </div>
            </form>
          )}
        </div>

        <p className="text-center text-[#6b7280] text-xs mt-8">
          Share link encodes numbers in the URL only. No account.
        </p>
      </div>
    </div>
  );
}
