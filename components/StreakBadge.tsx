interface Props {
  currentStreak: number;
  longestStreak: number;
}

export default function StreakBadge({ currentStreak, longestStreak }: Props) {
  if (currentStreak === 0 && longestStreak === 0) return null;

  const milestones = [3, 7, 14, 30];
  const nextMilestone = milestones.find((m) => m > currentStreak) ?? null;

  return (
    <div className="rounded-2xl border border-orange-800/40 bg-orange-950/20 p-5 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{currentStreak >= 7 ? "🔥" : currentStreak >= 3 ? "⚡" : "✨"}</span>
          <div>
            <p className="text-sm font-semibold text-slate-100">
              {currentStreak > 0 ? `${currentStreak}-day streak!` : "Start your streak"}
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Best: {longestStreak} days
            </p>
          </div>
        </div>
        {currentStreak > 0 && (
          <span className="text-3xl font-bold text-orange-400">{currentStreak}</span>
        )}
      </div>

      {/* Progress to next milestone */}
      {nextMilestone && currentStreak > 0 && (
        <div className="space-y-1.5">
          <div className="flex justify-between text-[10px] text-slate-500">
            <span>Progress to {nextMilestone}-day milestone</span>
            <span>{currentStreak}/{nextMilestone}</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-slate-800">
            <div
              className="h-1.5 rounded-full bg-gradient-to-r from-orange-500 to-yellow-400 transition-all"
              style={{ width: `${(currentStreak / nextMilestone) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Milestone rewards */}
      <div className="grid grid-cols-4 gap-2 pt-1">
        {[
          { days: 3,  reward: "+30cr" },
          { days: 7,  reward: "+70cr" },
          { days: 14, reward: "+140cr" },
          { days: 30, reward: "+300cr" },
        ].map(({ days, reward }) => (
          <div
            key={days}
            className={`rounded-lg border text-center py-2 transition ${
              currentStreak >= days
                ? "border-orange-700/50 bg-orange-900/30 text-orange-300"
                : "border-slate-800 bg-slate-900/40 text-slate-600"
            }`}
          >
            <p className="text-[10px] font-bold">{days}d</p>
            <p className="text-[9px] mt-0.5">{reward}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
