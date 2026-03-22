import { createServiceClient } from "@/lib/supabase-server";
import VoiceRunClient from "./VoiceRunClient";

export const metadata = {
  title: "Run by voice — Genesis Node",
  description: "Say your task and run an AI agent with your voice. Hands-free goal, one click to launch.",
};

async function getDefaultAgent() {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("agents")
    .select("id, name, slug, description, price_per_task")
    .eq("is_active", true)
    .order("total_tasks_completed", { ascending: false })
    .limit(1)
    .single();
  return data as { id: string; name: string; slug: string; description: string; price_per_task: number } | null;
}

export default async function VoicePage() {
  const defaultAgent = await getDefaultAgent();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-2xl px-6 py-12">
        <div className="text-center mb-10">
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">
            Run by voice
          </h1>
          <p className="text-slate-400 text-sm">
            Say your task out loud — we&apos;ll fill the goal and launch the agent. No typing needed.
          </p>
          <p className="mt-3 text-xs text-slate-500 max-w-md mx-auto">
            Agents on the platform form your <strong className="text-slate-400">digital firm</strong> — they work on your goals and on building out the platform. Open any page by voice or manually from the nav.
          </p>
        </div>
        <VoiceRunClient defaultAgent={defaultAgent} />
      </div>
    </div>
  );
}
