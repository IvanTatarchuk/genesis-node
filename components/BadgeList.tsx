interface Badge {
  badge: string;
  period_label?: string | null;
  expires_at?: string | null;
}

const BADGE_CONFIG: Record<string, { icon: string; label: string; color: string; bg: string; border: string }> = {
  gold_agent:     { icon: "🥇", label: "Gold Agent",     color: "text-yellow-300",  bg: "bg-yellow-950/40",  border: "border-yellow-700/50" },
  silver_agent:   { icon: "🥈", label: "Silver Agent",   color: "text-slate-300",   bg: "bg-slate-800/40",   border: "border-slate-600/50"  },
  bronze_agent:   { icon: "🥉", label: "Bronze Agent",   color: "text-orange-300",  bg: "bg-orange-950/40",  border: "border-orange-700/50" },
  top10_agent:    { icon: "🏆", label: "Top 10 Agent",   color: "text-indigo-300",  bg: "bg-indigo-950/40",  border: "border-indigo-700/50" },
  gold_dev:       { icon: "🥇", label: "Gold Dev",       color: "text-yellow-300",  bg: "bg-yellow-950/40",  border: "border-yellow-700/50" },
  silver_dev:     { icon: "🥈", label: "Silver Dev",     color: "text-slate-300",   bg: "bg-slate-800/40",   border: "border-slate-600/50"  },
  bronze_dev:     { icon: "🥉", label: "Bronze Dev",     color: "text-orange-300",  bg: "bg-orange-950/40",  border: "border-orange-700/50" },
  top10_dev:      { icon: "🏆", label: "Top 10 Dev",     color: "text-indigo-300",  bg: "bg-indigo-950/40",  border: "border-indigo-700/50" },
  rising_star:    { icon: "⭐", label: "Rising Star",    color: "text-yellow-400",  bg: "bg-yellow-950/30",  border: "border-yellow-800/40" },
  veteran:        { icon: "🎖️", label: "Veteran",        color: "text-emerald-300", bg: "bg-emerald-950/30", border: "border-emerald-700/40"},
  legendary:      { icon: "👑", label: "Legendary",      color: "text-purple-300",  bg: "bg-purple-950/40",  border: "border-purple-700/50" },
  top_earner:     { icon: "💰", label: "Top Earner",     color: "text-emerald-300", bg: "bg-emerald-950/30", border: "border-emerald-700/40"},
  referral_king:  { icon: "🎁", label: "Referral King",  color: "text-sky-300",     bg: "bg-sky-950/30",     border: "border-sky-700/40"    },
  streak_master:  { icon: "🔥", label: "Streak Master",  color: "text-orange-300",  bg: "bg-orange-950/30",  border: "border-orange-700/40" },
};

interface Props {
  badges: Badge[];
  size?: "sm" | "md";
  maxVisible?: number;
}

export default function BadgeList({ badges, size = "sm", maxVisible = 4 }: Props) {
  if (!badges || badges.length === 0) return null;

  const visible = badges.slice(0, maxVisible);
  const overflow = badges.length - maxVisible;

  return (
    <div className="flex flex-wrap gap-1.5">
      {visible.map((b, i) => {
        const cfg = BADGE_CONFIG[b.badge] ?? {
          icon: "🎖️", label: b.badge, color: "text-slate-400",
          bg: "bg-slate-900/40", border: "border-slate-700/50",
        };
        const isExpired = b.expires_at && new Date(b.expires_at) < new Date();
        if (isExpired) return null;

        return (
          <span
            key={i}
            title={`${cfg.label}${b.period_label ? ` — ${b.period_label}` : ""}`}
            className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 transition ${cfg.bg} ${cfg.border} ${cfg.color} ${
              size === "sm" ? "text-[10px]" : "text-xs"
            }`}
          >
            <span>{cfg.icon}</span>
            <span className="font-medium">{cfg.label}</span>
          </span>
        );
      })}
      {overflow > 0 && (
        <span className="inline-flex items-center rounded-full border border-slate-700/50 bg-slate-800/40 px-2 py-0.5 text-[10px] text-slate-500">
          +{overflow} more
        </span>
      )}
    </div>
  );
}
