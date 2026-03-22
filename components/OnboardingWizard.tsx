"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import type { Database } from "@/lib/database.types";
import {
  Cpu as CpuChipIcon,
  Code2 as CodeBracketIcon,
  Zap as BoltIcon,
  ShoppingBag as ShoppingBagIcon,
  CheckCircle2,
  ArrowRight as ArrowRightIcon,
  Sparkles as SparklesIcon,
} from "lucide-react";
const CheckCircle2Icon = CheckCircle2;

type Role = Database["public"]["Tables"]["profiles"]["Row"]["role"];

const STEPS = ["Вибір ролі", "Перший крок", "Готово!"];

export default function OnboardingWizard({ userId }: { userId: string }) {
  const [step, setStep] = useState(0);
  const [role, setRole] = useState<Role | null>(null);
  const [saving, setSaving] = useState(false);
  const router = useRouter();
  const sb = createClient();

  async function finishOnboarding() {
    setSaving(true);
    // Mark onboarding as done
    // @ts-expect-error Supabase client infers profiles update arg as never with current generics
    await sb.from("profiles").update({ onboarding_done: true, role: role ?? "client" }).eq("id", userId);
    router.refresh();
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg rounded-3xl border border-slate-700 bg-slate-900 shadow-2xl shadow-black/70 overflow-hidden">
        {/* Progress bar */}
        <div className="h-1 bg-slate-800">
          <div
            className={`h-full bg-gradient-to-r from-indigo-600 to-sky-500 transition-all duration-500 ${
              step === 0 ? "w-1/3" : step === 1 ? "w-2/3" : "w-full"
            }`}
          />
        </div>

        {/* Step labels */}
        <div className="flex justify-between px-6 pt-4 text-xs text-slate-500">
          {STEPS.map((s, i) => (
            <span key={s} className={i <= step ? "text-indigo-400 font-medium" : ""}>
              {s}
            </span>
          ))}
        </div>

        <div className="px-8 py-8">
          {/* Step 0: Role selection */}
          {step === 0 && (
            <div>
              <div className="text-center mb-8">
                <SparklesIcon className="h-10 w-10 text-indigo-400 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-white mb-2">Ласкаво просимо до Genesis Node!</h2>
                <p className="text-slate-400 text-sm">
                  Ти отримав <span className="text-emerald-400 font-semibold">50 безкоштовних кредитів</span>.
                  Розкажи нам хто ти:
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setRole("client")}
                  className={`rounded-2xl border p-5 text-left transition-all ${
                    role === "client"
                      ? "border-indigo-500 bg-indigo-500/10 ring-1 ring-indigo-500"
                      : "border-slate-700 bg-slate-800/50 hover:border-slate-600"
                  }`}
                >
                  <ShoppingBagIcon className="h-6 w-6 text-indigo-400 mb-3" />
                  <h3 className="font-semibold text-white text-sm">Я Клієнт</h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Хочу використовувати AI агентів для своїх задач
                  </p>
                </button>
                <button
                  onClick={() => setRole("dev")}
                  className={`rounded-2xl border p-5 text-left transition-all ${
                    role === "dev"
                      ? "border-emerald-500 bg-emerald-500/10 ring-1 ring-emerald-500"
                      : "border-slate-700 bg-slate-800/50 hover:border-slate-600"
                  }`}
                >
                  <CodeBracketIcon className="h-6 w-6 text-emerald-400 mb-3" />
                  <h3 className="font-semibold text-white text-sm">Я Розробник</h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Хочу продавати своїх AI агентів та заробляти 70%
                  </p>
                </button>
              </div>
              <button
                disabled={!role}
                onClick={() => setStep(1)}
                className="mt-6 w-full rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed transition py-3 text-sm font-semibold text-white flex items-center justify-center gap-2"
              >
                Далі <ArrowRightIcon className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Step 1: First action */}
          {step === 1 && (
            <div>
              <div className="text-center mb-8">
                <CpuChipIcon className="h-10 w-10 text-sky-400 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-white mb-2">
                  {role === "dev" ? "Запусти першого агента" : "Спробуй першого агента"}
                </h2>
                <p className="text-slate-400 text-sm">
                  {role === "dev"
                    ? "Зареєструй свого агента — і почни заробляти на кожному запуску"
                    : "Твої 50 кредитів вже на рахунку. Обери агента і постав першу задачу!"}
                </p>
              </div>

              <div className="space-y-3">
                {role === "dev" ? (
                  <>
                    <OptionCard
                      icon="🤖"
                      title="Зареєструй агента"
                      desc="Завантаж конфігурацію, встанови ціну та публікуй"
                      href="/agents/new"
                      color="emerald"
                    />
                    <OptionCard
                      icon="📊"
                      title="Дивись аналітику"
                      desc="Переглянь потенційний дохід та рейтинги"
                      href="/become-developer"
                      color="indigo"
                    />
                  </>
                ) : (
                  <>
                    <OptionCard
                      icon="🔍"
                      title="SEO Analyzer"
                      desc="Перевір будь-який сайт на SEO помилки — безкоштовно"
                      href="/agents/seo-analyzer"
                      color="sky"
                    />
                    <OptionCard
                      icon="🛒"
                      title="Переглянь маркетплейс"
                      desc="Сотні агентів на всі задачі — від кодингу до маркетингу"
                      href="/marketplace"
                      color="indigo"
                    />
                  </>
                )}
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setStep(0)}
                  className="flex-1 rounded-xl border border-slate-700 hover:border-slate-600 transition py-3 text-sm text-slate-400 hover:text-slate-200"
                >
                  Назад
                </button>
                <button
                  onClick={() => setStep(2)}
                  className="flex-1 rounded-xl bg-indigo-600 hover:bg-indigo-500 transition py-3 text-sm font-semibold text-white flex items-center justify-center gap-2"
                >
                  Далі <ArrowRightIcon className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Done */}
          {step === 2 && (
            <div className="text-center">
              <div className="h-16 w-16 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center mx-auto mb-6">
                <CheckCircle2Icon className="h-8 w-8 text-emerald-400" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-3">Ти готовий!</h2>
              <p className="text-slate-400 text-sm mb-6 max-w-sm mx-auto">
                Платформа налаштована. Переходь до маркетплейсу та постав першу задачу або запрошуй друзів і отримуй бонуси за кожного.
              </p>

              <div className="grid grid-cols-3 gap-3 mb-8 text-xs">
                {[
                  { val: "50", label: "Кредитів", icon: "⚡" },
                  { val: "70%", label: "Твій дохід", icon: "💰" },
                  { val: "24/7", label: "Агенти онлайн", icon: "🟢" },
                ].map(({ val, label, icon }) => (
                  <div key={label} className="rounded-xl border border-slate-800 bg-slate-800/50 p-3">
                    <div className="text-lg mb-1">{icon}</div>
                    <div className="font-bold text-white">{val}</div>
                    <div className="text-slate-500">{label}</div>
                  </div>
                ))}
              </div>

              <button
                onClick={finishOnboarding}
                disabled={saving}
                className="w-full rounded-xl bg-gradient-to-r from-indigo-600 to-sky-600 hover:from-indigo-500 hover:to-sky-500 transition py-3.5 text-sm font-bold text-white disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {saving ? "Збереження..." : (
                  <>
                    <BoltIcon className="h-4 w-4" />
                    Перейти до платформи
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function OptionCard({
  icon, title, desc, href, color,
}: {
  icon: string; title: string; desc: string; href: string; color: string;
}) {
  const colorMap: Record<string, string> = {
    sky: "border-sky-500/30 bg-sky-500/5 hover:border-sky-500/60",
    indigo: "border-indigo-500/30 bg-indigo-500/5 hover:border-indigo-500/60",
    emerald: "border-emerald-500/30 bg-emerald-500/5 hover:border-emerald-500/60",
  };
  return (
    <a
      href={href}
      className={`flex items-center gap-4 rounded-xl border p-4 transition-all cursor-pointer ${colorMap[color] ?? colorMap.indigo}`}
    >
      <span className="text-2xl flex-shrink-0">{icon}</span>
      <div>
        <h3 className="text-sm font-semibold text-white">{title}</h3>
        <p className="text-xs text-slate-400 mt-0.5">{desc}</p>
      </div>
      <ArrowRightIcon className="h-4 w-4 text-slate-600 ml-auto flex-shrink-0" />
    </a>
  );
}
