"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Loader, Bot, User } from "lucide-react";

interface Message { role: "user" | "assistant"; content: string }

const WELCOME: Message = {
  role: "assistant",
  content: "Hi! I'm the AGENTS.DEV support AI. I can help with billing, agents, API, MATADORA currency, and anything else about the platform. What do you need?",
};

export default function SupportChat() {
  const [messages, setMessages] = useState<Message[]>([WELCOME]);
  const [input, setInput]       = useState("");
  const [loading, setLoading]   = useState(false);
  const [email, setEmail]       = useState("");
  const [showEmail, setShowEmail] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Handle quick question buttons from parent
  useEffect(() => {
    function handleQuick(e: MouseEvent) {
      const btn = (e.target as HTMLElement).closest(".quick-q");
      if (!btn) return;
      const q = (btn as HTMLElement).dataset.quick;
      if (q) sendMessage(q);
    }
    document.addEventListener("click", handleQuick);
    return () => document.removeEventListener("click", handleQuick);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages]);

  async function sendMessage(text?: string) {
    const msg = (text ?? input).trim();
    if (!msg || loading) return;

    const userMessage: Message = { role: "user", content: msg };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/support/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages.filter((m) => m.role !== "assistant" || m !== WELCOME),
          ...(email ? { email } : {}),
        }),
      });

      const data = await res.json();
      if (data.reply) {
        setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
        // Show email capture after 3 user messages
        if (newMessages.filter((m) => m.role === "user").length >= 3) {
          setShowEmail(true);
        }
      }
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: "Sorry, I'm having trouble connecting. Please try again in a moment." }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden">
      {/* Messages */}
      <div className="h-96 overflow-y-auto p-4 space-y-4">
        {messages.map((m, i) => (
          <div key={i} className={`flex gap-3 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
            <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs ${
              m.role === "assistant"
                ? "bg-gradient-to-br from-indigo-500 to-sky-500 text-white"
                : "bg-slate-700 text-slate-300"
            }`}>
              {m.role === "assistant" ? <Bot className="h-3.5 w-3.5" /> : <User className="h-3.5 w-3.5" />}
            </div>
            <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
              m.role === "assistant"
                ? "bg-slate-800 text-slate-200"
                : "bg-indigo-600 text-white"
            }`}>
              {m.content.split("\n").map((line, j) => (
                <span key={j}>
                  {line}
                  {j < m.content.split("\n").length - 1 && <br />}
                </span>
              ))}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex gap-3">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-sky-500">
              <Bot className="h-3.5 w-3.5 text-white" />
            </div>
            <div className="rounded-2xl bg-slate-800 px-4 py-3">
              <Loader className="h-4 w-4 animate-spin text-slate-500" />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Email capture */}
      {showEmail && !email && (
        <div className="border-t border-slate-800 bg-slate-950/60 px-4 py-3 flex items-center gap-3">
          <input
            type="email"
            placeholder="Your email (optional) — to follow up with you"
            className="flex-1 bg-transparent text-xs text-slate-300 placeholder-slate-600 outline-none"
            onBlur={(e) => setEmail(e.target.value)}
          />
        </div>
      )}

      {/* Input */}
      <div className="border-t border-slate-800 p-3 flex items-end gap-2">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
          placeholder="Type your question…"
          rows={1}
          className="flex-1 resize-none rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder-slate-600 outline-none focus:border-indigo-500 max-h-32"
        />
        <button
          onClick={() => sendMessage()}
          disabled={!input.trim() || loading}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 transition"
        >
          <Send className="h-4 w-4 text-white" />
        </button>
      </div>
    </div>
  );
}
