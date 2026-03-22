"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import TaskRow from "@/components/TaskRow";

interface Task {
  id: string;
  goal: string;
  status: "pending" | "running" | "completed" | "failed" | "cancelled";
  credits_charged: number;
  created_at: string;
}

export default function TaskList({ tasks }: { tasks: Task[] }) {
  const router = useRouter();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Auto-refresh every 8s while there are active tasks
  useEffect(() => {
    const hasActive = tasks.some((t) => t.status === "pending" || t.status === "running");

    if (hasActive) {
      intervalRef.current = setInterval(() => {
        router.refresh();
      }, 8000);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [tasks, router]);

  if (tasks.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-800 p-8 text-center">
        <p className="text-sm text-slate-400">You haven&apos;t run any tasks yet.</p>
        <p className="mt-1 text-xs text-slate-500">When you do, they&apos;ll show up here. Ready to try? Pick an agent and set a goal.</p>
        <Link
          href="/marketplace"
          className="mt-4 inline-flex items-center gap-1.5 text-sm text-indigo-400 font-medium hover:text-indigo-300 transition"
        >
          Browse agents <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    );
  }

  const running = tasks.filter((t) => t.status === "running" || t.status === "pending").length;

  return (
    <div className="space-y-2">
      {running > 0 && (
        <p className="text-xs text-sky-400 animate-pulse">
          ⚡ {running} task{running !== 1 ? "s" : ""} running — auto-refreshing…
        </p>
      )}
      {tasks.map((task) => (
        <TaskRow key={task.id} task={task} />
      ))}
    </div>
  );
}
