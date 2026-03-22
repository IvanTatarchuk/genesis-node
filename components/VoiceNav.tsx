"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Mic, Square, ChevronDown } from "lucide-react";
import { useVoiceInput } from "@/hooks/useVoiceInput";
import { matchVoiceCommand } from "@/lib/voice-commands";

interface Props {
  profile: { id: string; role?: string } | null;
}

export default function VoiceNav({ profile }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const feedbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const {
    isListening,
    transcript,
    error: voiceError,
    isSupported,
    startListening,
    stopListening,
    resetTranscript,
  } = useVoiceInput({ lang: "en-US", continuous: false });

  // When we get a final transcript (user stopped), match and act
  useEffect(() => {
    if (!isListening && transcript.trim()) {
      const action = matchVoiceCommand(transcript);
      let msg: string | null = null;
      if (action) {
        if (action.type === "navigate" && action.path !== pathname) {
          router.push(action.path);
          msg = `Going to ${action.path}`;
        } else if (action.type === "scroll") {
          const el = document.getElementById(action.id);
          if (el) el.scrollIntoView({ behavior: "smooth" });
          msg = `Scrolled to ${action.id}`;
        } else if (action.path === pathname) msg = "Already here";
      } else msg = `No command for "${transcript.slice(0, 30)}…"`;
      if (msg) setTimeout(() => setFeedback(msg), 0);
      resetTranscript();
    }
  }, [isListening, transcript, router, pathname, resetTranscript]);

  // Clear feedback after a few seconds
  useEffect(() => {
    if (feedback) {
      if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
      feedbackTimeoutRef.current = setTimeout(() => setFeedback(null), 3000);
    }
    return () => {
      if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
    };
  }, [feedback]);

  if (!isSupported) return null;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs text-slate-400 transition hover:bg-slate-900 hover:text-slate-200"
        title="Voice commands"
        aria-label="Voice commands"
        {...(open ? { "aria-expanded": "true" as const } : { "aria-expanded": "false" as const })}
      >
        <span className={isListening ? "text-amber-400" : ""}>
          {isListening ? <Square className="h-3.5 w-3.5 fill-current" /> : <Mic className="h-3.5 w-3.5" />}
        </span>
        <span className="hidden sm:inline">Commands</span>
        <ChevronDown className={`h-3 w-3 transition ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <>
          <div className="absolute right-0 top-full z-50 mt-1 w-72 rounded-xl border border-slate-800 bg-slate-900 shadow-xl">
            <div className="p-3">
              <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider mb-2">
                Voice or click — same result
              </p>
              {!isListening ? (
                <button
                  type="button"
                  onClick={() => { resetTranscript(); startListening(); }}
                  className="w-full rounded-lg bg-indigo-600 hover:bg-indigo-500 py-2.5 text-xs font-medium text-white transition"
                >
                  Say a command (e.g. &quot;marketplace&quot;, &quot;voice&quot;, &quot;pricing&quot;)
                </button>
              ) : (
                <button
                  type="button"
                  onClick={stopListening}
                  className="w-full rounded-lg bg-amber-600 hover:bg-amber-500 py-2.5 text-xs font-medium text-white transition"
                >
                  Stop listening
                </button>
              )}
              {voiceError && <p className="mt-2 text-[11px] text-amber-400">{voiceError}</p>}
              {feedback && <p className="mt-2 text-[11px] text-emerald-400">{feedback}</p>}
              <p className="mt-3 text-[10px] text-slate-600">
                Examples: home, marketplace, voice, pricing, dashboard, leaderboard, login, support
              </p>
            </div>
          </div>
          {/* Click outside to close */}
          <button
            type="button"
            aria-label="Close"
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
          />
        </>
      )}
    </div>
  );
}
