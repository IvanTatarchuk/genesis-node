"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";
import { BellIcon, CheckCheckIcon, XIcon } from "lucide-react";
import Link from "next/link";

type Notification = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  is_read: boolean;
  created_at: string;
};

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "щойно";
  if (m < 60) return `${m}хв тому`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}год тому`;
  return `${Math.floor(h / 24)}д тому`;
}

const TYPE_DOT: Record<string, string> = {
  task_complete: "bg-emerald-400",
  task_failed: "bg-red-400",
  credits_earned: "bg-yellow-400",
  new_referral: "bg-indigo-400",
  leaderboard: "bg-purple-400",
  system: "bg-sky-400",
};

export default function NotificationCenter({ userId }: { userId: string }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const ref = useRef<HTMLDivElement>(null);

  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  const unread = items.filter((n) => !n.is_read).length;

  const fetchNotifications = useCallback(async () => {
    const { data } = await sb
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(30);
    setItems(data ?? []);
    setLoading(false);
  }, [userId, sb]);

  // Initial load (defer to avoid synchronous setState in effect)
  useEffect(() => {
    const id = setTimeout(() => fetchNotifications(), 0);
    return () => clearTimeout(id);
  }, [fetchNotifications]);

  // Supabase Realtime subscription
  useEffect(() => {
    const channel = sb
      .channel(`notifications:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          setItems((prev) => [payload.new as Notification, ...prev]);
        },
      )
      .subscribe();

    return () => { sb.removeChannel(channel); };
  }, [userId, sb]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  async function markAllRead() {
    await sb
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", userId)
      .eq("is_read", false);
    setItems((prev) => prev.map((n) => ({ ...n, is_read: true })));
  }

  async function markRead(id: string) {
    await sb.from("notifications").update({ is_read: true }).eq("id", id);
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
  }

  return (
    <div className="relative" ref={ref}>
      {/* Bell button */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition"
        aria-label="Сповіщення"
      >
        <BellIcon className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-bold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-11 z-50 w-80 rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl shadow-black/60 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
            <span className="text-sm font-semibold text-white">
              Сповіщення {unread > 0 && <span className="text-indigo-400">({unread})</span>}
            </span>
            <div className="flex items-center gap-1">
              {unread > 0 && (
                <button
                  type="button"
                  onClick={markAllRead}
                  className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-200 transition px-2 py-1 rounded hover:bg-slate-800"
                  aria-label="Mark all as read"
                >
                  <CheckCheckIcon className="h-3 w-3" />
                  Всі прочитані
                </button>
              )}
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-slate-500 hover:text-slate-200 transition p-1 rounded hover:bg-slate-800"
                aria-label="Закрити"
              >
                <XIcon className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="max-h-[420px] overflow-y-auto">
            {loading ? (
              <div className="py-8 text-center text-sm text-slate-500">Завантаження...</div>
            ) : items.length === 0 ? (
              <div className="py-10 text-center">
                <BellIcon className="h-8 w-8 text-slate-700 mx-auto mb-2" />
                <p className="text-sm text-slate-500">Поки що сповіщень немає</p>
              </div>
            ) : (
              items.map((n) => {
                const content = (
                  <div
                    key={n.id}
                    onClick={() => markRead(n.id)}
                    className={`flex gap-3 px-4 py-3 border-b border-slate-800/50 cursor-pointer transition hover:bg-slate-800/40 ${
                      !n.is_read ? "bg-indigo-500/5" : ""
                    }`}
                  >
                    <div className={`mt-1.5 h-2 w-2 rounded-full flex-shrink-0 ${
                      !n.is_read ? (TYPE_DOT[n.type] ?? "bg-slate-500") : "bg-slate-700"
                    }`} />
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${!n.is_read ? "text-white" : "text-slate-300"}`}>
                        {n.title}
                      </p>
                      {n.body && (
                        <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{n.body}</p>
                      )}
                      <p className="text-[10px] text-slate-600 mt-1">{timeAgo(n.created_at)}</p>
                    </div>
                  </div>
                );

                return n.link ? (
                  <Link href={n.link} key={n.id}>
                    {content}
                  </Link>
                ) : (
                  <div key={n.id}>{content}</div>
                );
              })
            )}
          </div>

          {/* Footer */}
          {items.length > 0 && (
            <div className="px-4 py-2 border-t border-slate-800 text-center">
              <button
                type="button"
                onClick={markAllRead}
                className="text-xs text-slate-500 hover:text-slate-300 transition"
                aria-label="Mark all as read"
              >
                Позначити всі як прочитані
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
