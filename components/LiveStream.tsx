"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import {
  BotIcon,
  ChevronLeftIcon,
  CircleIcon,
  CheckCircle2Icon,
  XCircleIcon,
  LoaderIcon,
  CopyIcon,
  CheckIcon,
  Globe,
  GlobeLock,
  Volume2,
  Square,
} from "lucide-react";
import { useVoiceOutput } from "@/hooks/useVoiceOutput";
import { createClient } from "@/lib/supabase";
import type { Task, Log, LogType } from "@/lib/database.types";

interface Props {
  task: Task;
  initialLogs: Log[];
  agentSlug?: string | null;
  taskGoal?: string;
}

const LOG_COLORS: Record<LogType, string> = {
  thought: "text-slate-400",
  action:  "text-sky-400",
  result:  "text-emerald-400",
  error:   "text-red-400",
  system:  "text-indigo-300",
};

const LOG_ICONS: Record<LogType, string> = {
  thought: "💭",
  action:  "⚡",
  result:  "✅",
  error:   "❌",
  system:  "🔧",
};

function StatusBadge({ status }: { status: Task["status"] }) {
  const map = {
    pending:   { icon: <CircleIcon className="h-3 w-3" />,                      label: "Pending",    cls: "text-slate-400  border-slate-700   bg-slate-900/60" },
    running:   { icon: <LoaderIcon className="h-3 w-3 animate-spin" />,          label: "Running",    cls: "text-sky-400    border-sky-800/60  bg-sky-900/20"   },
    completed: { icon: <CheckCircle2Icon className="h-3 w-3" />,                 label: "Completed",  cls: "text-emerald-400 border-emerald-800/60 bg-emerald-900/20" },
    failed:    { icon: <XCircleIcon className="h-3 w-3" />,                      label: "Failed",     cls: "text-red-400    border-red-800/60  bg-red-900/20"   },
    cancelled: { icon: <XCircleIcon className="h-3 w-3" />,                      label: "Cancelled",  cls: "text-slate-500  border-slate-700   bg-slate-900/60" },
  } as const;

  const s = map[status];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${s.cls}`}>
      {s.icon}
      {s.label}
    </span>
  );
}

export default function LiveStream({ task: initialTask, initialLogs, agentSlug, taskGoal }: Props) {
  const [task, setTask]       = useState<Task>(initialTask);
  const [logs, setLogs]       = useState<Log[]>(initialLogs);
  const [copied, setCopied]     = useState(false);
  const [isPublic, setIsPublic] = useState(!!(initialTask as unknown as { is_public?: boolean }).is_public);
  const [toggling, setToggling] = useState(false);
  const bottomRef               = useRef<HTMLDivElement>(null);
  const supabase              = createClient();
  const { isSpeaking, isSupported: ttsSupported, speak, stop: stopTts } = useVoiceOutput();
  const announcedCompleteRef = useRef(false);

  // One-time announcement when task completes
  useEffect(() => {
    if (task.status === "completed" && ttsSupported && !announcedCompleteRef.current) {
      announcedCompleteRef.current = true;
      speak("Task completed.", { rate: 0.9 });
    }
  }, [task.status, ttsSupported, speak]);

  // Auto-scroll to latest log
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  // Subscribe to new logs via Supabase Realtime
  useEffect(() => {
    const logChannel = supabase
      .channel(`logs:${task.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "logs", filter: `task_id=eq.${task.id}` },
        (payload) => {
          setLogs((prev) => [...prev, payload.new as Log]);
        }
      )
      .subscribe();

    // Subscribe to task status changes
    const taskChannel = supabase
      .channel(`task:${task.id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "tasks", filter: `id=eq.${task.id}` },
        (payload) => {
          setTask((prev) => ({ ...prev, ...(payload.new as Task) }));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(logChannel);
      supabase.removeChannel(taskChannel);
    };
  }, [task.id, supabase]);

  const togglePublic = useCallback(async () => {
    if (toggling || task.status !== "completed") return;
    setToggling(true);
    try {
      const newVal = !isPublic;
      await fetch(`/api/tasks/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task_id: task.id, is_public: newVal }),
      });
      setIsPublic(newVal);
    } finally {
      setToggling(false);
    }
  }, [task.id, task.status, isPublic, toggling]);

  const copyLogs = useCallback(() => {
    const text = logs.map((l) => `[${l.type.toUpperCase()}] ${l.content}`).join("\n");
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [logs]);

  const elapsedSecs =
    task.started_at && task.completed_at
      ? Math.round(
          (new Date(task.completed_at).getTime() - new Date(task.started_at).getTime()) / 1000
        )
      : null;

  return (
    <div className="flex flex-col h-screen">
      {/* Top bar */}
      <header className="shrink-0 flex items-center justify-between gap-4 border-b border-slate-800/80 bg-slate-950/90 backdrop-blur px-6 py-3">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href="/marketplace"
            className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-200 transition"
          >
            <ChevronLeftIcon className="h-3.5 w-3.5" />
            Back
          </Link>
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-900 ring-1 ring-slate-700">
            <BotIcon className="h-3.5 w-3.5 text-indigo-400" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-slate-100 truncate">
              {task.goal.length > 80 ? task.goal.slice(0, 80) + "…" : task.goal}
            </p>
            <p className="text-[11px] text-slate-500">Task {task.id.slice(0, 8)}…</p>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {elapsedSecs && (
            <span className="text-xs text-slate-500">{elapsedSecs}s</span>
          )}
          <StatusBadge status={task.status} />
          {task.status === "completed" && (
            <div className="flex items-center gap-2">
              <button
                onClick={togglePublic}
                disabled={toggling}
                title={isPublic ? "Remove from gallery" : "Share to public gallery"}
                className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition ${
                  isPublic
                    ? "border-emerald-700 bg-emerald-900/30 text-emerald-400 hover:bg-emerald-900/50"
                    : "border-slate-700 bg-slate-900 text-slate-400 hover:border-emerald-700 hover:text-emerald-400"
                }`}
              >
                {isPublic ? <Globe className="h-3 w-3" /> : <GlobeLock className="h-3 w-3" />}
                {isPublic ? "Public" : "Share"}
              </button>
              <a
                href={`/share/${task.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900 px-2.5 py-1.5 text-xs text-slate-400 hover:border-slate-700 hover:text-slate-200 transition"
              >
                ↗ Link
              </a>
            </div>
          )}
          <button
            onClick={copyLogs}
            className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900 px-2.5 py-1.5 text-xs text-slate-400 hover:text-slate-200 hover:border-slate-700 transition"
          >
            {copied ? <CheckIcon className="h-3 w-3 text-emerald-400" /> : <CopyIcon className="h-3 w-3" />}
            {copied ? "Copied" : "Copy logs"}
          </button>
        </div>
      </header>

      {/* Terminal window */}
      <div className="flex-1 overflow-y-auto bg-[#0a0a0f] p-5 font-mono text-xs leading-relaxed">
        {/* Stats bar */}
        <div className="flex flex-wrap gap-4 text-[11px] text-slate-600 mb-4 border-b border-slate-900 pb-3">
          <span>
            Credits charged:{" "}
            <span className="text-slate-400">{task.credits_charged}</span>
          </span>
          {task.started_at && (
            <span>
              Started:{" "}
              <span className="text-slate-400">
                {new Date(task.started_at).toLocaleTimeString()}
              </span>
            </span>
          )}
          {task.completed_at && (
            <span>
              Completed:{" "}
              <span className="text-slate-400">
                {new Date(task.completed_at).toLocaleTimeString()}
              </span>
            </span>
          )}
          <span>
            Logs: <span className="text-slate-400">{logs.length}</span>
          </span>
        </div>

        {logs.length === 0 && task.status === "pending" && (
          <p className="text-slate-600 animate-pulse">
            ▸ Waiting for agent to start…
          </p>
        )}

        {logs.map((log) => (
          <div key={log.id} className="flex gap-2 mb-1.5 group">
            <span className="shrink-0 text-slate-700 select-none">
              {new Date(log.timestamp).toLocaleTimeString("en-US", {
                hour12: false,
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              })}
            </span>
            <span className="shrink-0">{LOG_ICONS[log.type]}</span>
            <span className={`whitespace-pre-wrap break-words ${LOG_COLORS[log.type]}`}>
              {log.content}
            </span>
          </div>
        ))}

        {task.status === "running" && (
          <div className="flex items-center gap-2 mt-3 text-sky-400 animate-pulse">
            <LoaderIcon className="h-3.5 w-3.5 animate-spin" />
            <span>Agent is working…</span>
          </div>
        )}

        {task.status === "completed" && task.result_summary && (
          <div className="mt-6 rounded-xl border border-emerald-800/60 bg-emerald-900/10 p-4">
            <div className="flex items-center justify-between gap-2 mb-2">
              <p className="text-xs font-semibold text-emerald-400">✅ Result Summary</p>
              {ttsSupported && (
                isSpeaking ? (
                  <button
                    type="button"
                    onClick={stopTts}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-amber-700/60 bg-amber-900/30 px-2.5 py-1.5 text-xs text-amber-200 hover:bg-amber-900/50 transition"
                  >
                    <Square className="h-3 w-3 fill-current" />
                    Stop
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => speak(task.result_summary!)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/60 px-2.5 py-1.5 text-xs text-slate-300 hover:border-indigo-500/50 hover:text-white transition"
                  >
                    <Volume2 className="h-3.5 w-3.5" />
                    Read aloud
                  </button>
                )
              )}
            </div>
            <p className="text-sm text-slate-200 whitespace-pre-wrap">{task.result_summary}</p>
            {task.result_url && (
              <a
                href={task.result_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block mt-3 text-xs text-indigo-400 underline-offset-4 hover:underline"
              >
                View output artefact →
              </a>
            )}
          </div>
        )}

        {task.status === "failed" && (
          <div className="mt-6 rounded-xl border border-amber-800/50 bg-amber-950/20 p-4">
            <p className="text-xs font-medium text-amber-200">
              This run didn&apos;t complete. No worries — your credits have been refunded automatically. You can try again with a different goal or agent.
            </p>
          </div>
        )}

        {(task.status === "completed" || task.status === "failed") && agentSlug && taskGoal && (
          <div className="mt-6 rounded-xl border border-indigo-800/40 bg-indigo-950/20 p-4">
            <p className="text-xs text-slate-300 mb-3">Run the same agent again with the same goal?</p>
            <Link
              href={`/agents/${agentSlug}?goal=${encodeURIComponent(taskGoal)}`}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 px-4 py-2 text-xs font-medium text-white transition"
            >
              Run again →
            </Link>
          </div>
        )}

        {task.status === "completed" && (
          <div className="mt-6 rounded-xl border border-amber-800/40 bg-amber-950/20 p-4">
            <p className="text-xs font-medium text-amber-200 mb-2">Need more credits?</p>
            <p className="text-xs text-slate-400 mb-3">Upgrade to a subscription — predictable monthly credits, no surprise runouts.</p>
            <Link
              href="/pricing"
              className="inline-flex items-center gap-2 rounded-lg bg-amber-600 hover:bg-amber-500 px-4 py-2 text-xs font-medium text-slate-950 transition"
            >
              View plans →
            </Link>
          </div>
        )}

        <div className="mt-6 pt-4 border-t border-slate-800/60">
          <p className="text-xs text-slate-500">
            Questions? <Link href="/support" className="text-indigo-400 hover:underline">Contact support</Link>
          </p>
        </div>

        <div ref={bottomRef} />
      </div>
    </div>
  );
}
