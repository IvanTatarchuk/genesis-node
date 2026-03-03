import Link from "next/link";
import LiveDemoSection from "@/components/LiveDemoSection";

export default function HomePage() {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-slate-950">
      <div className="pointer-events-none absolute inset-0 bg-grid-dark opacity-40" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(79,70,229,0.35),_transparent_55%)]" />

      <div className="relative z-10 mx-auto flex w-full max-w-5xl flex-col gap-16 px-6 py-10">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 ring-1 ring-slate-700/70">
              <span className="text-xs font-semibold tracking-[0.14em] text-slate-200">
                AG
              </span>
            </div>
            <span className="text-sm font-medium tracking-[0.25em] text-slate-400">
              AGENTS.DEV
            </span>
          </div>
          <Link
            href="#waitlist"
            className="rounded-full border border-slate-800 bg-slate-900 px-4 py-1.5 text-xs font-medium text-slate-200 shadow-sm shadow-slate-900/60 transition hover:border-slate-700 hover:bg-slate-800/80"
          >
            Request access
          </Link>
        </header>

        <section className="grid gap-12 md:grid-cols-[ minmax(0,1.25fr)_minmax(0,1fr) ] md:items-center">
          <div className="space-y-8">
            <p className="inline-flex items-center gap-2 rounded-full border border-slate-800 bg-slate-900/70 px-3 py-1 text-xs font-medium text-slate-300 shadow shadow-slate-950/70 backdrop-blur">
              <span className="inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
              A new home for serious AI agents
            </p>

            <div className="space-y-4">
              <h1 className="text-balance text-4xl font-semibold tracking-tight text-slate-50 sm:text-5xl md:text-6xl">
                Launch, grow & monetize{" "}
                <span className="bg-gradient-to-r from-indigo-400 via-sky-400 to-emerald-400 bg-clip-text text-transparent">
                  your AI agents
                </span>
                .
              </h1>
              <p className="max-w-xl text-balance text-sm text-slate-400 sm:text-base">
                AGENTS.DEV is the platform for developers building autonomous and
                semi-autonomous agents. Ship production-grade agents, plug into
                distribution, and get paid when they deliver value.
              </p>
            </div>

            <div
              id="waitlist"
              className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900/70 p-5 shadow-xl shadow-black/70 backdrop-blur"
            >
              <p className="text-xs font-medium uppercase tracking-[0.25em] text-slate-400">
                Waitlist
              </p>
              <p className="mt-2 text-sm text-slate-300">
                Be first to onboard agents, get early revenue opportunities, and
                help shape the roadmap.
              </p>

              <EmailForm />

              <p className="mt-3 text-[11px] text-slate-500">
                No spam. We&apos;ll reach out only when we have something
                meaningful to share.
              </p>
            </div>

            <dl className="grid gap-4 text-xs text-slate-400 sm:grid-cols-3">
              <div>
                <dt className="font-medium text-slate-300">For builders</dt>
                <dd className="mt-1">
                  Designed for devs shipping real agents, not demo chatbots.
                </dd>
              </div>
              <div>
                <dt className="font-medium text-slate-300">Revenue aligned</dt>
                <dd className="mt-1">
                  Usage-based payouts tied to the value your agents create.
                </dd>
              </div>
              <div>
                <dt className="font-medium text-slate-300">Infra included</dt>
                <dd className="mt-1">
                  Observability, multi-tenant auth, billing hooks, and more out
                  of the box.
                </dd>
              </div>
            </dl>
          </div>

          <aside className="relative">
            <div className="pointer-events-none absolute -inset-8 rounded-3xl bg-gradient-to-br from-indigo-500/20 via-sky-500/10 to-emerald-400/10 blur-3xl" />
            <div className="relative rounded-3xl border border-slate-800/80 bg-slate-900/80 p-5 shadow-2xl shadow-black/60 backdrop-blur">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                Agent economics
              </p>

              <div className="mt-4 space-y-3 text-xs">
                <MetricRow label="Monthly active agents" value="128" trend="+42%" />
                <MetricRow label="Avg. ARR per agent" value="$3.8k" trend="+19%" />
                <MetricRow
                  label="Requests handled last 24h"
                  value="1.2M"
                  trend="+8%"
                />
                <MetricRow
                  label="Payouts to developers (30d)"
                  value="$482k"
                  trend="+27%"
                />
              </div>

              <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
                <p className="text-xs font-medium text-slate-200">
                  “We want a world where independent developers can make a living
                  from high-leverage AI agents, the way SaaS founders did from
                  web apps.”
                </p>
                <p className="mt-3 text-[11px] text-slate-500">
                  The AGENTS.DEV team
                </p>
              </div>
            </div>
          </aside>
        </section>

        <LiveDemoSection />

        <footer className="flex flex-col gap-3 border-t border-slate-900/80 pt-6 text-[11px] text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} AGENTS.DEV. All rights reserved.</p>
          <div className="flex flex-wrap items-center gap-4">
            <span className="text-slate-500">
              Built for developers shipping real agents.
            </span>
            <Link
              href="mailto:founders@agents.dev"
              className="text-slate-300 underline-offset-4 hover:text-slate-100 hover:underline"
            >
              founders@agents.dev
            </Link>
          </div>
        </footer>
      </div>
    </main>
  );
}

function EmailForm() {
  async function subscribe(formData: FormData) {
    "use server";

    const email = String(formData.get("email") ?? "").trim();
    if (!email) {
      return;
    }

    // TODO: Wire this up to your email provider or database.
    console.log("[AGENTS.DEV waitlist]", { email, at: new Date().toISOString() });
  }

  return (
    <form action={subscribe} className="mt-4 space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row">
        <label className="flex-1 text-xs text-slate-300" htmlFor="email">
          Work email
          <input
            id="email"
            name="email"
            type="email"
            required
            placeholder="you@studio.dev"
            className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none ring-0 transition placeholder:text-slate-600 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/60"
          />
        </label>
        <button
          type="submit"
          className="inline-flex items-center justify-center rounded-lg bg-gradient-to-r from-indigo-500 via-sky-500 to-emerald-400 px-4 py-2 text-sm font-medium text-slate-950 shadow-lg shadow-indigo-500/40 transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 focus-visible:ring-indigo-400"
        >
          Join waitlist
        </button>
      </div>
    </form>
  );
}

function MetricRow(props: { label: string; value: string; trend: string }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-slate-800/80 bg-slate-900/80 px-3 py-2">
      <div>
        <p className="text-[11px] text-slate-400">{props.label}</p>
        <p className="mt-1 text-sm font-semibold text-slate-100">
          {props.value}
        </p>
      </div>
      <span className="text-xs font-medium text-emerald-400">
        {props.trend}
      </span>
    </div>
  );
}

