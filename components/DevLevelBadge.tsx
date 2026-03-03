const LEVELS: Record<string, { icon: string; label: string; color: string; bg: string; border: string }> = {
  starter: { icon: "🌱", label: "Starter",  color: "text-slate-300",   bg: "bg-slate-900/60",   border: "border-slate-700/50"  },
  rising:  { icon: "🚀", label: "Rising",   color: "text-sky-300",     bg: "bg-sky-950/30",     border: "border-sky-700/40"    },
  pro:     { icon: "⭐", label: "Pro",      color: "text-indigo-300",  bg: "bg-indigo-950/30",  border: "border-indigo-700/40" },
  elite:   { icon: "💎", label: "Elite",    color: "text-violet-300",  bg: "bg-violet-950/30",  border: "border-violet-700/40" },
  legend:  { icon: "👑", label: "Legend",   color: "text-yellow-300",  bg: "bg-yellow-950/30",  border: "border-yellow-700/40" },
};

const SHARE: Record<string, number> = {
  starter: 70, rising: 75, pro: 80, elite: 85, legend: 90,
};

interface Props {
  level: string;
  showShare?: boolean;
  size?: "sm" | "md";
}

export default function DevLevelBadge({ level, showShare = false, size = "sm" }: Props) {
  const cfg = LEVELS[level] ?? LEVELS.starter;
  const share = SHARE[level] ?? 70;

  return (
    <span
      title={`${cfg.label} developer — ${share}% revenue share`}
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 ${cfg.bg} ${cfg.border} ${cfg.color} ${
        size === "sm" ? "text-[10px]" : "text-xs"
      }`}
    >
      <span>{cfg.icon}</span>
      <span className="font-semibold">{cfg.label}</span>
      {showShare && <span className="opacity-60">· {share}%</span>}
    </span>
  );
}
