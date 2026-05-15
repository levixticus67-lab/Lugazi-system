import { useState } from "react";
import { X, Send, Lightbulb, RefreshCw } from "lucide-react";
import axios from "@/lib/axios";

interface AIAssistantProps {
  context?: string;
  suggestions?: string[];
}

const defaultSuggestions = [
  "Summarize this week's key ministry activities",
  "What should I focus on to improve member engagement?",
  "Give me insights on attendance trends",
  "Suggest follow-up actions for new visitors",
];

function GeminiIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 28 28" fill="none" className={className} aria-hidden="true">
      <path d="M14 2C14 2 16.5 9 21 11.5C16.5 14 14 21 14 21C14 21 11.5 14 7 11.5C11.5 9 14 2 14 2Z" fill="currentColor" opacity="0.9" />
      <path d="M14 8C14 8 15.2 12 18 13.5C15.2 15 14 19 14 19C14 19 12.8 15 10 13.5C12.8 12 14 8 14 8Z" fill="white" opacity="0.5" />
    </svg>
  );
}

export default function AIAssistant({ context, suggestions }: AIAssistantProps) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<{ role: "user" | "ai"; text: string }[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const prompts = suggestions ?? defaultSuggestions;

  async function ask(prompt: string, isRetry = false) {
    if (!prompt.trim() || loading) return;
    const userMsg = prompt.trim();
    if (!isRetry) {
      setMessages(prev => [...prev, { role: "user", text: userMsg }]);
      setInput("");
    }
    setLoading(true);
    try {
      const res = await axios.post<{ response: string }>("/api/ai/assist", { prompt: userMsg, context });
      setMessages(prev => [...prev, { role: "ai", text: res.data.response }]);
    } catch {
      setMessages(prev => [
        ...prev,
        {
          role: "ai",
          text: "The AI is warming up — this happens on first use. Retrying in a moment…",
        },
      ]);
      setTimeout(() => {
        setMessages(prev => prev.filter(m => m.text !== "The AI is warming up — this happens on first use. Retrying in a moment…"));
        ask(userMsg, true);
      }, 4000);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed bottom-6 left-6 z-50">
      {open ? (
        <div className="glass-card w-80 flex flex-col shadow-2xl" style={{ height: 460 }}>
          <div className="flex items-center gap-2 px-4 py-3 border-b border-white/20 rounded-t-[calc(var(--radius)-1px)]"
               style={{ background: "linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)" }}>
            <GeminiIcon className="h-4 w-4 text-white" />
            <span className="text-white font-semibold text-sm flex-1">DCL AI Assistant</span>
            <span className="text-white/50 text-[9px] font-medium tracking-wide">Gemini</span>
            <button onClick={() => setOpen(false)} className="text-white/70 hover:text-white ml-1">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {messages.length === 0 ? (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground text-center py-2 font-medium">
                  Ask me anything about your church management
                </p>
                {prompts.map((s, i) => (
                  <button key={i} onClick={() => ask(s)}
                    className="w-full text-left text-xs p-2.5 rounded-lg bg-muted hover:bg-primary/10 hover:text-primary border border-transparent hover:border-primary/20 transition-all flex items-start gap-2">
                    <Lightbulb className="h-3 w-3 mt-0.5 shrink-0 text-yellow-500" />
                    {s}
                  </button>
                ))}
              </div>
            ) : (
              messages.map((m, i) => (
                <div key={i} className={`flex flex-col ${m.role === "user" ? "items-end" : "items-start"}`}>
                  <div className={`max-w-[90%] px-3 py-2 rounded-2xl text-xs leading-relaxed ${
                    m.role === "user"
                      ? "text-white rounded-br-sm"
                      : "bg-muted text-foreground rounded-bl-sm"
                  }`} style={m.role === "user" ? { background: "linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)" } : {}}>
                    {m.text}
                  </div>
                </div>
              ))
            )}
            {loading && (
              <div className="flex items-start">
                <div className="bg-muted px-3 py-2 rounded-2xl rounded-bl-sm flex items-center gap-1.5">
                  <RefreshCw className="h-3 w-3 animate-spin text-muted-foreground" />
                  <span className="text-[10px] text-muted-foreground">Thinking…</span>
                </div>
              </div>
            )}
          </div>

          <div className="px-3 pb-3 pt-2 border-t border-white/10">
            <div className="flex gap-2 items-center">
              <input
                className="flex-1 text-xs bg-muted rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-violet-500/40 placeholder:text-muted-foreground"
                placeholder="Ask AI a question…"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); ask(input); } }}
              />
              <button onClick={() => ask(input)} disabled={!input.trim() || loading}
                className="text-white rounded-xl p-2 disabled:opacity-40 hover:opacity-90 transition"
                style={{ background: "linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)" }}>
                <Send className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <button onClick={() => setOpen(true)}
          className="text-white rounded-full p-3.5 shadow-lg hover:scale-105 transition-transform relative"
          style={{ background: "linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)", boxShadow: "0 0 20px rgba(124,58,237,0.4)" }}>
          <GeminiIcon className="h-5 w-5" />
        </button>
      )}
    </div>
  );
}
