import { createServerSupabaseClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import TrinityWatchWindow from "@/components/TrinityWatchWindow";
import TrinityViewerGate from "@/components/TrinityViewerGate";

export const revalidate = 0;

export const metadata = {
  title: "Trinity Watch — Genesis Node",
  description: "Watch AI agents autonomously build the Genesis Node platform in real-time.",
};

export default async function TrinityWatchPage({
  searchParams,
}: {
  searchParams: Promise<{ subscribed?: string }>;
}) {
  const sb = await createServerSupabaseClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await sb
    .from("profiles")
    .select("trinity_viewer_active, trinity_viewer_ends, display_name")
    .eq("id", user.id)
    .single();

  const hasAccess = (profile as any)?.trinity_viewer_active === true;
  const params = await searchParams;
  const justSubscribed = params?.subscribed === "1";

  return (
    <div className="max-w-7xl mx-auto px-6 py-10">
      {/* Header */}
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-violet-500/20 bg-violet-500/10 px-4 py-1.5 text-xs font-medium text-violet-300 mb-4">
            <span className="h-1.5 w-1.5 rounded-full bg-violet-400 animate-pulse" />
            Trinity Viewer — Ексклюзивний доступ
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">
            👁 Дивись як агенти будують платформу
          </h1>
          <p className="text-slate-400 text-sm max-w-xl">
            Прямий ефір роботи трьох автономних ШІ-агентів. Спостерігай за кожним рішенням,
            кожним рядком коду та кожним поліпшенням у реальному часі.
          </p>
        </div>

        {hasAccess && (
          <div className="shrink-0 rounded-xl border border-violet-500/30 bg-violet-500/10 px-4 py-3 text-center">
            <div className="text-xs text-violet-400 font-medium mb-1">✨ Підписка активна</div>
            {(profile as any)?.trinity_viewer_ends && (
              <div className="text-[10px] text-slate-500">
                до {new Date((profile as any).trinity_viewer_ends).toLocaleDateString("uk", { day: "numeric", month: "long" })}
              </div>
            )}
          </div>
        )}
      </div>

      {justSubscribed && (
        <div className="mb-6 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-6 py-4 flex items-center gap-3">
          <span className="text-2xl">🎉</span>
          <div>
            <div className="font-semibold text-emerald-300 text-sm">Вітаємо з підпискою Trinity Viewer!</div>
            <div className="text-xs text-slate-400 mt-0.5">Тепер ти можеш спостерігати за агентами в реальному часі.</div>
          </div>
        </div>
      )}

      {hasAccess ? (
        <TrinityWatchWindow />
      ) : (
        <TrinityViewerGate />
      )}
    </div>
  );
}
