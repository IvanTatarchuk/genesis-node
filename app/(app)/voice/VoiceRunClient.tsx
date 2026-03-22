"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Mic, Square, Send, BotIcon } from "lucide-react";
import { useVoiceInput } from "@/hooks/useVoiceInput";

type DefaultAgent = {
  id: string;
  name: string;
  slug: string;
  description: string;
  price_per_task: number;
} | null;

interface Props {
  defaultAgent: DefaultAgent;
}

export default function VoiceRunClient({ defaultAgent }: Props) {
  const router = useRouter();
  const [goal, setGoal] = useState("");
  const [error, setError] = useState("");
  const [launching, setLaunching] = useState(false);
  const [launchWhenDone, setLaunchWhenDone] = useState(false);

  const {
    isListening,
    transcript,
    error: voiceError,
    isSupported: voiceSupported,
    startListening,
    stopListening,
    resetTranscript,
  } = useVoiceInput({ lang: "en-US", continuous: true });

  useEffect(() => {
    if (isListening && transcript) setGoal(transcript);
  }, [isListening, transcript]);

  // When user stops listening and "Launch when done" was checked, submit once
  const submittedByVoiceRef = useRef(false);
  useEffect(() => {
    if (!isListening && launchWhenDone && defaultAgent && !submittedByVoiceRef.current) {
      const text = (goal || transcript).trim();
      if (text) {
        submittedByVoiceRef.current = true;
        setLaunchWhenDone(false);
        handleLaunch(text);
      }
    }
    if (isListening) submittedByVoiceRef.current = false;
  }, [isListening, goal, transcript, launchWhenDone, defaultAgent]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleLaunch(goalText: string) {
    if (!defaultAgent) return;
    setError("");
    setLaunching(true);
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agent_id: defaultAgent.id, goal: goalText }),
      });
      const json = await res.json();
      if (!res.ok) {
        if (res.status === 401) {
          setError("Please sign in to run tasks.");
          return;
        }
        if (res.status === 402) {
          setError(`You need more credits (need ${json.required}, you have ${json.balance}). Top up in Dashboard.`);
          return;
        }
        setError(json.error ?? "Could not start the task. Try again.");
        return;
      }
      router.push(`/tasks/${json.task.id}`);
    } catch {
      setError("Connection issue. Try again.");
    } finally {
      setLaunching(false);
    }
  }

  if (!voiceSupported) {
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-8 text-center">
        <p className="text-slate-400 mb-4">
          Voice input is not supported in this browser. Use Chrome or Edge for the best experience.
        </p>
        <Link href="/marketplace" className="text-indigo-400 hover:underline">
          Browse agents and type your goal →
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Big mic / stop */}
      <div className="flex flex-col items-center">
        <button
          type="button"
          onClick={isListening ? stopListening : () => { setError(""); setGoal(""); resetTranscript(); startListening(); }}
          className={`relative flex h-24 w-24 items-center justify-center rounded-full border-2 transition-all ${
            isListening
              ? "border-amber-500/80 bg-amber-500/20 shadow-lg shadow-amber-500/30"
              : "border-indigo-500/60 bg-indigo-500/10 hover:border-indigo-400 hover:bg-indigo-500/20"
          }`}
        >
          {isListening && (
            <span className="absolute inset-0 rounded-full animate-ping border-2 border-amber-400/50 opacity-40" />
          )}
          {isListening ? (
            <Square className="h-8 w-8 text-amber-300 fill-current" />
          ) : (
            <Mic className="h-10 w-10 text-indigo-400" />
          )}
        </button>
        <p className="mt-3 text-sm text-slate-500">
          {isListening ? "Listening… Click to stop" : "Click and say your task"}
        </p>
      </div>

      {/* Goal preview */}
      {goal && (
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <p className="text-xs font-medium text-slate-500 mb-1">Your goal</p>
          <p className="text-slate-200 whitespace-pre-wrap">{goal}</p>
        </div>
      )}

      {/* Options */}
      {goal.trim() && defaultAgent && (
        <div className="rounded-xl border border-indigo-800/40 bg-indigo-950/20 p-4 space-y-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={launchWhenDone}
              onChange={(e) => setLaunchWhenDone(e.target.checked)}
              className="rounded border-slate-600 bg-slate-800 text-indigo-500 focus:ring-indigo-500"
            />
            <span className="text-xs text-slate-300">Launch as soon as I stop speaking</span>
          </label>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => handleLaunch(goal.trim())}
              disabled={launching}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-60 transition"
            >
              <Send className="h-4 w-4" />
              {launching ? "Launching…" : `Run with ${defaultAgent.name}`}
            </button>
            <Link
              href="/marketplace"
              className="text-xs text-slate-400 hover:text-indigo-400 transition"
            >
              Choose another agent →
            </Link>
          </div>
        </div>
      )}

      {/* Default agent card */}
      {defaultAgent && !goal && (
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-slate-800 flex items-center justify-center">
            <BotIcon className="h-5 w-5 text-indigo-400" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-slate-200">{defaultAgent.name}</p>
            <p className="text-xs text-slate-500 line-clamp-1">{defaultAgent.description}</p>
          </div>
          <span className="text-xs font-medium text-indigo-400">⚡ {defaultAgent.price_per_task} cr</span>
        </div>
      )}

      {(error || voiceError) && (
        <p className="rounded-xl border border-red-800/60 bg-red-900/10 px-3 py-2 text-xs text-red-400">
          {error || voiceError}
        </p>
      )}

      <p className="text-center text-xs text-slate-600">
        Not signed in? <Link href={`/login?next=/voice`} className="text-indigo-400 hover:underline">Sign in</Link> to run tasks. New users get free credits.
      </p>
    </div>
  );
}
