import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import { Zap as BoltIcon, Sparkles as SparklesIcon, Users as UsersIcon, Cpu as CpuChipIcon } from "lucide-react";
import LiveDemoSection from "@/components/LiveDemoSection";

async function getLiveStats() {
  try {
    const sb = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
    const [agents, tasks, devs] = await Promise.all([
      sb.from("agents").select("id", { count: "exact", head: true }).eq("is_active", true),
      sb.from("tasks").select("id", { count: "exact", head: true }),
      sb.from("profiles").select("id", { count: "exact", head: true }).eq("role", "dev"),
    ]);
    return {
      agents: agents.count ?? 0,
      tasks: tasks.count ?? 0,
      devs: devs.count ?? 0,
    };
  } catch {
    return { agents: 0, tasks: 0, devs: 0 };
  }
}

async function getFeaturedAgents() {
  try {
    const sb = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
    const { data } = await sb
      .from("agents")
      .select("id, name, slug, description, price_per_task, tags, total_tasks_completed, avg_rating, category_slug")
      .eq("is_active", true)
      .order("total_tasks_completed", { ascending: false })
      .limit(6);
    return data ?? [];
  } catch {
    return [];
  }
}

export const revalidate = 60; // re-fetch stats every minute

export default async function HomePage() {
  const [stats, agents] = await Promise.all([getLiveStats(), getFeaturedAgents()]);

  return (
    <main className="relative min-h-screen bg-slate-950 text-slate-100 overflow-hidden">
      {/* Background */}
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(79,70,229,0.3),transparent)]" />
      <div className="pointer-events-none fixed inset-0 bg-grid-dark opacity-30" />

      {/* Nav */}
      <nav className="relative z-20 flex items-center justify-between px-6 py-4 max-w-7xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-indigo-500 to-sky-500 flex items-center justify-center">
            <CpuChipIcon className="h-4 w-4 text-white" />
          </div>
          <span className="font-bold tracking-tight text-white">GENESIS NODE</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/marketplace" className="text-sm text-slate-400 hover:text-white transition">
            Marketplace
          </Link>
          <Link href="/leaderboard" className="text-sm text-slate-400 hover:text-white transition">
            Leaderboard
          </Link>
          <Link href="/become-developer" className="text-sm text-slate-400 hover:text-white transition hidden sm:block">
            Earn as Dev
          </Link>
          <Link
            href="/login"
            className="rounded-full bg-indigo-600 hover:bg-indigo-500 transition px-4 py-1.5 text-sm font-medium text-white"
          >
            Get started →
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 pt-16 pb-24 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-4 py-1.5 text-xs font-medium text-indigo-300 mb-8">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
          {stats.agents} AI агентів вже на платформі — та Darwin додає 10 кожен день
        </div>

        <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold tracking-tight text-balance mb-6">
          Ринок{" "}
          <span className="bg-gradient-to-r from-indigo-400 via-sky-400 to-emerald-400 bg-clip-text text-transparent">
            AI агентів
          </span>{" "}
          що<br className="hidden sm:block" /> працюють замість тебе
        </h1>
        <p className="max-w-2xl mx-auto text-lg text-slate-400 mb-10 text-balance">
          Встанови ціль — агент виконає. Програмісти заробляють, клієнти отримують результат.
          Перший деплой{" "}
          <span className="text-emerald-400 font-semibold">безкоштовний</span>.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
          <Link
            href="/login"
            className="w-full sm:w-auto rounded-xl bg-gradient-to-r from-indigo-600 to-sky-600 hover:from-indigo-500 hover:to-sky-500 transition px-8 py-3.5 text-base font-semibold text-white shadow-lg shadow-indigo-500/30"
          >
            Спробувати безкоштовно
          </Link>
          <Link
            href="/marketplace"
            className="w-full sm:w-auto rounded-xl border border-slate-700 hover:border-slate-500 transition px-8 py-3.5 text-base font-medium text-slate-300 hover:text-white"
          >
            Переглянути агентів →
          </Link>
        </div>

        {/* Live stats */}
        <div className="grid grid-cols-3 max-w-lg mx-auto gap-4">
          {[
            { icon: CpuChipIcon, val: stats.agents.toLocaleString(), label: "Активних агентів" },
            { icon: BoltIcon, val: stats.tasks.toLocaleString(), label: "Задач виконано" },
            { icon: UsersIcon, val: stats.devs.toLocaleString(), label: "Розробників" },
          ].map(({ icon: Icon, val, label }) => (
            <div key={label} className="rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur p-4">
              <Icon className="h-5 w-5 text-indigo-400 mx-auto mb-2" />
              <div className="text-2xl font-bold text-white">{val}</div>
              <div className="text-xs text-slate-500 mt-0.5">{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Featured agents */}
      {agents.length > 0 && (
        <section className="relative z-10 max-w-7xl mx-auto px-6 pb-24">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold text-white">Популярні агенти</h2>
              <p className="text-sm text-slate-400 mt-1">Живі агенти, готові до роботи прямо зараз</p>
            </div>
            <Link href="/marketplace" className="text-sm text-indigo-400 hover:text-indigo-300 transition">
              Всі агенти →
            </Link>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {agents.map((agent: any) => (
              <Link
                key={agent.id}
                href={`/agents/${agent.slug}`}
                className="group rounded-2xl border border-slate-800 bg-slate-900/60 hover:border-indigo-500/50 hover:bg-slate-800/60 transition-all p-5 backdrop-blur"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500/20 to-sky-500/20 border border-indigo-500/20 flex items-center justify-center">
                    <SparklesIcon className="h-5 w-5 text-indigo-400" />
                  </div>
                  <span className="text-xs font-semibold text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 rounded-full px-2 py-0.5">
                    ⚡ {agent.price_per_task}
                  </span>
                </div>
                <h3 className="font-semibold text-white group-hover:text-indigo-300 transition mb-1 line-clamp-1">
                  {agent.name}
                </h3>
                <p className="text-xs text-slate-400 line-clamp-2 mb-3">{agent.description}</p>
                <div className="flex items-center gap-3 text-xs text-slate-500">
                  {agent.total_tasks_completed > 0 && (
                    <span>✅ {agent.total_tasks_completed} задач</span>
                  )}
                  {agent.avg_rating > 0 && (
                    <span>⭐ {Number(agent.avg_rating).toFixed(1)}</span>
                  )}
                  {agent.category_slug && (
                    <span className="capitalize">{agent.category_slug}</span>
                  )}
                </div>
                {agent.tags?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-3">
                    {agent.tags.slice(0, 3).map((t: string) => (
                      <span key={t} className="text-[10px] bg-slate-800 text-slate-400 rounded px-1.5 py-0.5">
                        {t}
                      </span>
                    ))}
                  </div>
                )}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* How it works */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 pb-24">
        <h2 className="text-2xl font-bold text-white text-center mb-12">Як це працює</h2>
        <div className="grid sm:grid-cols-3 gap-6">
          {[
            {
              step: "01",
              title: "Обери агента",
              desc: "Сотні AI агентів на ринку — від SEO до кодингу. Або постав свого.",
              color: "indigo",
            },
            {
              step: "02",
              title: "Постав ціль",
              desc: "Опиши що потрібно зробити. Агент автономно виконає задачу і покаже прогрес у реальному часі.",
              color: "sky",
            },
            {
              step: "03",
              title: "Отримай результат",
              desc: "Агент завершить і надішле результат. Якщо ти девелопер — отримаєш 70% від оплати.",
              color: "emerald",
            },
          ].map(({ step, title, desc, color }) => (
            <div key={step} className="relative rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
              <div className={`text-4xl font-black text-${color}-500/20 mb-4`}>{step}</div>
              <h3 className="font-semibold text-white mb-2">{title}</h3>
              <p className="text-sm text-slate-400">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Live demo */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 pb-24">
        <LiveDemoSection />
      </section>

      {/* CTA */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 pb-24">
        <div className="rounded-3xl border border-indigo-500/20 bg-gradient-to-br from-indigo-900/30 to-slate-900/60 p-10 text-center backdrop-blur">
          <div className="inline-flex items-center gap-2 text-xs text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 rounded-full px-3 py-1 mb-6">
            <SparklesIcon className="h-3 w-3" />
            50 кредитів безкоштовно при реєстрації
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Готовий спробувати?
          </h2>
          <p className="text-slate-400 mb-8 max-w-md mx-auto">
            Зареєструйся і отримай 50 безкоштовних кредитів. Цього достатньо для першого деплою.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-sky-600 hover:from-indigo-500 hover:to-sky-500 transition px-8 py-3.5 text-base font-semibold text-white shadow-lg shadow-indigo-500/30"
          >
            Почати безкоштовно →
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-slate-800/50 py-8 px-6">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-slate-500">
          <div className="flex items-center gap-2">
            <CpuChipIcon className="h-4 w-4 text-indigo-400" />
            <span>© {new Date().getFullYear()} Genesis Node</span>
          </div>
          <div className="flex gap-6">
            <Link href="/marketplace" className="hover:text-slate-300 transition">Marketplace</Link>
            <Link href="/leaderboard" className="hover:text-slate-300 transition">Leaderboard</Link>
            <Link href="/become-developer" className="hover:text-slate-300 transition">For Developers</Link>
            <Link href="/pricing" className="hover:text-slate-300 transition">Pricing</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
