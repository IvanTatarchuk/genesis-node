interface Props {
  uptime?:    number | null;
  size?:      "sm" | "md";
  showUptime?: boolean;
}

export default function VerifiedBadge({ uptime, size = "sm", showUptime = false }: Props) {
  return (
    <span
      title={`Verified agent — ${uptime ? `${uptime}% uptime` : "99%+ uptime"}`}
      className={`inline-flex items-center gap-1 rounded-full border border-sky-500/50 bg-sky-950/40 text-sky-300 ${
        size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs"
      }`}
    >
      <span>✅</span>
      <span className="font-semibold">Verified</span>
      {showUptime && uptime != null && (
        <span className="opacity-60">· {uptime}%</span>
      )}
    </span>
  );
}

export function HealthStatusDot({ status }: { status: string }) {
  const cfg: Record<string, { color: string; label: string }> = {
    healthy:  { color: "bg-emerald-400", label: "Healthy" },
    degraded: { color: "bg-yellow-400",  label: "Degraded" },
    down:     { color: "bg-red-500",     label: "Down" },
    unknown:  { color: "bg-slate-600",   label: "Unknown" },
  };
  const { color, label } = cfg[status] ?? cfg.unknown;
  return (
    <span className="inline-flex items-center gap-1.5" title={label}>
      <span className={`inline-block h-1.5 w-1.5 rounded-full ${color} ${status === "healthy" ? "animate-pulse" : ""}`} />
      <span className="text-[10px] text-slate-500">{label}</span>
    </span>
  );
}
