"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { BotIcon, LogOutIcon, PlusIcon, LayoutDashboardIcon, ShoppingBagIcon } from "lucide-react";
import { createClient } from "@/lib/supabase";
import type { Profile } from "@/lib/database.types";

interface Props {
  profile: Profile | null;
}

export default function Navbar({ profile }: Props) {
  const router  = useRouter();
  const supabase = createClient();

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <nav className="sticky top-0 z-40 border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-sm">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-3">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-2 group">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-900 ring-1 ring-slate-700 transition group-hover:ring-indigo-500/60">
            <BotIcon className="h-4 w-4 text-indigo-400" />
          </div>
          <span className="hidden text-sm font-medium tracking-[0.2em] text-slate-400 transition group-hover:text-slate-200 sm:block">
            GENESIS NODE
          </span>
        </Link>

        {/* Nav links */}
        <div className="flex items-center gap-1">
          <Link
            href="/marketplace"
            className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs text-slate-400 transition hover:bg-slate-900 hover:text-slate-200"
          >
            <ShoppingBagIcon className="h-3.5 w-3.5" />
            Marketplace
          </Link>
          {profile && (
            <Link
              href="/dashboard"
              className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs text-slate-400 transition hover:bg-slate-900 hover:text-slate-200"
            >
              <LayoutDashboardIcon className="h-3.5 w-3.5" />
              Dashboard
            </Link>
          )}
          {profile?.role === "dev" && (
            <Link
              href="/agents/new"
              className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs font-medium text-slate-200 transition hover:border-indigo-500/60 hover:bg-slate-800"
            >
              <PlusIcon className="h-3.5 w-3.5 text-indigo-400" />
              New agent
            </Link>
          )}
        </div>

        {/* User area */}
        <div className="flex items-center gap-3">
          {profile ? (
            <>
              {/* Credits badge */}
              <div className="hidden items-center gap-1.5 rounded-full border border-slate-800 bg-slate-900 px-3 py-1 text-xs sm:flex">
                <span className="text-indigo-400">⚡</span>
                <span className="font-medium text-slate-200">
                  {profile.balance.toLocaleString()}
                </span>
                <span className="text-slate-500">credits</span>
              </div>

              {/* Avatar / sign out */}
              <button
                onClick={handleSignOut}
                title="Sign out"
                className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-800 text-xs font-semibold text-slate-300 ring-1 ring-slate-700 transition hover:ring-red-500/60 hover:text-red-400"
              >
                {profile.display_name?.[0]?.toUpperCase() ?? "?"}
              </button>
            </>
          ) : (
            <Link
              href="/login"
              className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-medium text-white shadow shadow-indigo-500/40 transition hover:bg-indigo-500"
            >
              Sign in
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
