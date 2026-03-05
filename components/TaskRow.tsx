"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Clock,
  Loader,
  CheckCircle2,
  XCircle,
  X,
} from "lucide-react";

type TaskStatus = "pending" | "running" | "completed" | "failed" | "cancelled";

interface Task {
  id: string;
  goal: string;
  status: TaskStatus;
  credits_charged: number;
  created_at: string;
}

const STATUS_STYLE: Record<TaskStatus, string> = {
  pending:   "text-slate-400  bg-slate-800/60  border-slate-700/60",
  running:   "text-sky-400    bg-sky-900/20    border-sky-800/60",
  completed: "text-emerald-400 bg-emerald-900/20 border-emerald-800/60",
  failed:    "text-red-400    bg-red-900/20    border-red-800/60",
  cancelled: "text-slate-500  bg-slate-900/60  border-slate-800",
};

const STATUS_ICON: Record<TaskStatus, React.ReactNode> = {
  pending:   <Clock className="h-3 w-3" />,
  running:   <Loader className="h-3 w-3 animate-spin" />,
  completed: <CheckCircle2 className="h-3 w-3" />,
  failed:    <XCircle className="h-3 w-3" />,
  cancelled: <XCircle className="h-3 w-3" />,
};

export default function TaskRow({ task }: { task: Task }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [localStatus, setLocalStatus] = useState<TaskStatus>(task.status);
  const [cancelling, setCancelling] = useState(false);

  const canCancel = localStatus === "pending" || localStatus === "running";

  async function handleCancel(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!canCancel || cancelling) return;

    setCancelling(true);
    try {
      const res = await fetch(`/api/tasks?id=${task.id}`, { method: "DELETE" });
      if (res.ok) {
        setLocalStatus("cancelled");
        startTransition(() => router.refresh());
      }
    } finally {
      setCancelling(false);
    }
  }

  const status = localStatus;

  return (
    <div className="relative group flex items-center gap-4 rounded-xl border border-slate-800/80 bg-slate-900/60 px-4 py-3 transition hover:border-slate-700 hover:bg-slate-900">
      <Link href={`/tasks/${task.id}`} className="absolute inset-0 rounded-xl" aria-label="View task" />

      <span className={`relative flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-medium shrink-0 ${STATUS_STYLE[status]}`}>
        {STATUS_ICON[status]}
        {status}
        {status === "running" && (
          <span className="absolute -top-0.5 -right-0.5 h-1.5 w-1.5 rounded-full bg-sky-400 animate-ping" />
        )}
      </span>

      <p className="relative flex-1 truncate text-sm text-slate-300 group-hover:text-slate-100 transition">
        {task.goal}
      </p>

      <div className="relative shrink-0 text-right">
        <p className="text-[11px] text-slate-500">
          {new Date(task.created_at).toLocaleDateString()}
        </p>
        {task.credits_charged > 0 && (
          <p className="text-[11px] text-indigo-400">⚡ {task.credits_charged}</p>
        )}
      </div>

      {canCancel && (
        <button
          onClick={handleCancel}
          disabled={cancelling || isPending}
          title="Cancel task"
          className="relative z-10 ml-1 shrink-0 rounded-lg p-1.5 text-slate-600 hover:text-red-400 hover:bg-red-900/20 transition disabled:opacity-40"
        >
          {cancelling ? (
            <Loader className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <X className="h-3.5 w-3.5" />
          )}
        </button>
      )}

      {!canCancel && (
        <ArrowRight className="relative shrink-0 h-3.5 w-3.5 text-slate-600 group-hover:text-slate-400 transition" />
      )}
    </div>
  );
}
