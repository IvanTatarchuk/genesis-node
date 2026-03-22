import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import PricingCards from "@/components/PricingCards";
import LeadCaptureForm from "@/components/LeadCaptureForm";

export const metadata = {
  title: "Pricing — Genesis Node",
  description: "Simple, usage-based pricing. Start free and scale as you grow.",
};

async function getTasksCount() {
  try {
    const sb = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
    const { count } = await sb.from("tasks").select("id", { count: "exact", head: true });
    return count ?? 0;
  } catch {
    return 0;
  }
}

export default async function PricingPage() {
  const tasksCount = await getTasksCount();

  return (
    <main className="relative min-h-screen bg-slate-950 text-slate-100 overflow-hidden">
      {/* Background */}
      <div className="pointer-events-none absolute inset-0 bg-grid-dark opacity-30" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(99,102,241,0.25),_transparent_60%)]" />

      <div className="relative z-10 mx-auto max-w-5xl px-6 py-20">
        {/* Nav */}
        <nav className="mb-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-900 ring-1 ring-slate-700">
              <span className="text-[10px] font-bold tracking-widest text-slate-200">GN</span>
            </div>
            <span className="text-sm font-medium tracking-[0.2em] text-slate-400">
              GENESIS NODE
            </span>
          </Link>
          <div className="flex items-center gap-4 text-sm">
            <Link href="/use-cases" className="text-slate-400 hover:text-slate-200 transition">
              Use cases
            </Link>
            <Link href="/marketplace" className="text-slate-400 hover:text-slate-200 transition">
              Marketplace
            </Link>
            <Link
              href="/login"
              className="rounded-full border border-slate-700 bg-slate-900 px-4 py-1.5 text-slate-200 hover:border-slate-600 transition text-xs font-medium"
            >
              Sign in
            </Link>
          </div>
        </nav>

        {/* Header */}
        <div className="mb-16 text-center space-y-4">
          <span className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-xs font-medium text-indigo-300">
            Simple, transparent pricing
          </span>
          <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
            Pay only for{" "}
            <span className="bg-gradient-to-r from-indigo-400 to-emerald-400 bg-clip-text text-transparent">
              what agents deliver
            </span>
          </h1>
          <p className="mx-auto max-w-lg text-slate-400">
            Every plan includes access to the full marketplace. Credits never expire — roll over month to month. No lock-in: cancel anytime.
          </p>
          {tasksCount > 0 && (
            <p className="mt-2 text-sm text-slate-500">
              Join thousands — <span className="text-indigo-400 font-medium">{tasksCount.toLocaleString()}+ tasks</span> completed on the platform.
            </p>
          )}
        </div>

        {/* Pricing cards */}
        <PricingCards />

        {/* Referral nudge */}
        <div className="mt-8 rounded-2xl border border-indigo-800/40 bg-indigo-950/20 px-6 py-4 flex flex-wrap items-center justify-center gap-4 text-center sm:text-left">
          <span className="text-2xl">🎁</span>
          <div>
            <p className="text-sm font-medium text-indigo-200">Invite friends — you both get 200 free credits</p>
            <p className="text-xs text-slate-400 mt-0.5">Share your link from Dashboard after signup. No limit on referrals.</p>
          </div>
          <Link
            href="/login?next=/dashboard"
            className="shrink-0 rounded-lg bg-indigo-600 hover:bg-indigo-500 px-4 py-2 text-xs font-medium text-white transition"
          >
            Sign up to get your link
          </Link>
        </div>

        {/* Refund guarantee */}
        <div className="mt-12 rounded-2xl border border-emerald-800/40 bg-emerald-950/20 px-6 py-4 text-center">
          <p className="text-sm text-emerald-200">
            <strong>Guarantee:</strong> If a task doesn&apos;t complete, credits are <span className="text-emerald-300 font-medium">refunded automatically</span>. No forms, no hassle.
          </p>
        </div>

        {/* Credits explainer */}
        <div className="mt-20 rounded-2xl border border-slate-800 bg-slate-900/60 p-8">
          <h3 className="text-center text-lg font-semibold text-slate-100 mb-6">
            How credits work
          </h3>
          <div className="grid gap-6 sm:grid-cols-3 text-sm text-slate-400">
            <div className="space-y-2">
              <div className="text-2xl">⚡</div>
              <p className="font-medium text-slate-200">Credits track agent workload</p>
              <p>Credits are consumed when an agent completes a task. Each agent sets its own price per run.</p>
            </div>
            <div className="space-y-2">
              <div className="text-2xl">♾️</div>
              <p className="font-medium text-slate-200">Credits never expire</p>
              <p>Unused credits roll over automatically. No pressure to use them by end of month.</p>
            </div>
            <div className="space-y-2">
              <div className="text-2xl">🔄</div>
              <p className="font-medium text-slate-200">Cancel anytime</p>
              <p>Cancel your subscription anytime. You keep all credits you&apos;ve earned and paid for.</p>
            </div>
          </div>
        </div>

        {/* FAQ */}
        <div className="mt-16 space-y-4 max-w-2xl mx-auto">
          <h3 className="text-lg font-semibold text-slate-100 text-center mb-8">
            Frequently asked questions
          </h3>
          {[
            {
              q: "Can I switch plans?",
              a: "Yes, upgrade or downgrade anytime. When upgrading, you get pro-rated credits immediately.",
            },
            {
              q: "What happens when I run out of credits?",
              a: "Tasks won't start unless you have enough credits. Top up anytime with any amount.",
            },
            {
              q: "Do developer agents earn revenue?",
              a: "Yes! Developers earn 70% of every credit spent running their agent. Payouts happen weekly.",
            },
            {
              q: "Is there a free tier?",
              a: "Every new account starts with 100 free credits — enough for 1-2 demo runs. No credit card needed.",
            },
          ].map(({ q, a }) => (
            <div key={q} className="rounded-xl border border-slate-800 bg-slate-900/60 px-5 py-4">
              <p className="font-medium text-slate-200 text-sm">{q}</p>
              <p className="mt-1.5 text-sm text-slate-400">{a}</p>
            </div>
          ))}
        </div>

        {/* Lead capture */}
        <div className="mt-16 rounded-2xl border border-slate-800 bg-slate-900/60 p-6 text-center">
          <p className="text-sm font-medium text-slate-300 mb-1">Get 100 extra credits when we launch new plans</p>
          <p className="text-xs text-slate-500 mb-4">Leave your email — we’ll send you a code after signup.</p>
          <div className="flex justify-center">
            <LeadCaptureForm source="pricing" placeholder="you@company.com" cta="Get credits" />
          </div>
        </div>
      </div>
    </main>
  );
}
