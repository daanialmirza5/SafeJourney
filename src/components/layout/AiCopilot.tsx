"use client";

import { useState } from "react";
import { MessageCircle, X, Send, Loader2 } from "lucide-react";
import { apiFetch } from "@/lib/clientApi";

interface Message {
  role: "user" | "assistant";
  text: string;
  citations?: { title: string; source: string; lastVerified: string }[];
}

export function AiCopilot() {
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      text: "Hi, I'm the SafeJourney assistant. I can help with referral status, documents, transport and benefit pathways -- I can't give medical advice.",
    },
  ]);

  async function ask() {
    const q = question.trim();
    if (!q || loading) return;
    setMessages((prev) => [...prev, { role: "user", text: q }]);
    setQuestion("");
    setLoading(true);
    try {
      const data = await apiFetch<{ answer: string; citations: Message["citations"] }>("/api/ai/assistant", {
        method: "POST",
        body: JSON.stringify({ question: q }),
      });
      setMessages((prev) => [...prev, { role: "assistant", text: data.answer, citations: data.citations }]);
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", text: "Something went wrong. Please try again." }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed bottom-4 right-4 z-40 sm:bottom-6 sm:right-6">
      {open && (
        <div
          role="dialog"
          aria-label="SafeJourney assistant"
          onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
          className="mb-3 flex h-[min(28rem,70vh)] w-[min(22rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-xl border border-border bg-white shadow-2xl"
        >
          <div className="flex items-center justify-between border-b border-border bg-brand-soft px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-brand-dark">SafeJourney Assistant</p>
              <p className="text-[11px] text-slate-500">Administrative help only, not medical advice</p>
            </div>
            <button onClick={() => setOpen(false)} className="text-slate-500 hover:text-slate-700" aria-label="Close assistant">
              <X className="size-4" />
            </button>
          </div>
          <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
            {messages.map((m, i) => (
              <div key={i} className={m.role === "user" ? "text-right" : "text-left"}>
                <div
                  className={`inline-block max-w-[85%] rounded-lg px-3 py-2 text-xs leading-relaxed ${
                    m.role === "user" ? "bg-brand text-white" : "bg-slate-100 text-slate-700"
                  }`}
                >
                  {m.text}
                  {m.citations && m.citations.length > 0 && (
                    <ul className="mt-2 space-y-1 border-t border-slate-200 pt-2 text-[10px] text-slate-500">
                      {m.citations.map((c, ci) => (
                        <li key={ci}>
                          {c.title} · {c.source} · verified {c.lastVerified}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            ))}
            {loading && <Loader2 className="size-4 animate-spin text-slate-400" />}
          </div>
          <div className="flex items-center gap-2 border-t border-border px-3 py-2">
            <input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && ask()}
              placeholder="Ask about documents, status, benefits..."
              aria-label="Ask the assistant a question"
              className="flex-1 rounded-md border border-slate-200 px-2 py-1.5 text-xs outline-none focus:border-brand"
            />
            <button onClick={ask} disabled={loading} className="rounded-md bg-brand p-1.5 text-white disabled:opacity-50" aria-label="Send question">
              <Send className="size-3.5" />
            </button>
          </div>
        </div>
      )}
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex size-12 items-center justify-center rounded-full bg-brand text-white shadow-lg hover:bg-brand-dark"
        aria-label={open ? "Close assistant" : "Open assistant"}
        aria-expanded={open}
      >
        {open ? <X className="size-5" /> : <MessageCircle className="size-5" />}
      </button>
    </div>
  );
}
