import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { MessageSquare, Send, X, ChevronDown } from "lucide-react";
import axios from "@/lib/axios";

interface ChatMessage {
  id: number;
  userId: number;
  displayName: string;
  role: string;
  message: string;
  createdAt: string;
}

interface LiveChatProps {
  scope: string;
}

const POLL_INTERVAL = 5000;

const roleColors: Record<string, string> = {
  admin: "text-blue-500",
  leadership: "text-sky-500",
  workforce: "text-indigo-400",
  member: "text-slate-400",
};

export default function LiveChat({ scope }: LiveChatProps) {
  const { user, token } = useAuth();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;

    async function fetchMessages() {
      try {
        const res = await axios.get<ChatMessage[]>(`/api/chat/${scope}`);
        if (!cancelled) setMessages(res.data);
      } catch {
        // silently ignore poll errors
      }
    }

    fetchMessages();
    const interval = setInterval(fetchMessages, POLL_INTERVAL);
    return () => { cancelled = true; clearInterval(interval); };
  }, [scope, token]);

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  async function sendMessage() {
    if (!input.trim() || !user || sending) return;
    setSending(true);
    try {
      const res = await axios.post<ChatMessage>(`/api/chat/${scope}`, {
        message: input.trim(),
        displayName: user.displayName,
        role: user.role,
      });
      setMessages(prev => [...prev, res.data]);
      setInput("");
    } catch {
      // ignore
    } finally {
      setSending(false);
    }
  }

  function formatTime(iso: string) {
    return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  const unread = messages.length;

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {open ? (
        <div className="glass-card w-80 flex flex-col shadow-xl animate-fade-in-scale"
             style={{ height: 420 }}>
          {/* Header */}
          <div className="flex items-center gap-2 px-4 py-3 border-b border-white/20 blue-gradient-bg rounded-t-[calc(var(--radius)-1px)]">
            <MessageSquare className="h-4 w-4 text-white" />
            <span className="text-white font-semibold text-sm flex-1">Live Chat</span>
            <span className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
            <button onClick={() => setOpen(false)} className="text-white/70 hover:text-white ml-1">
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {messages.length === 0 ? (
              <p className="text-center text-muted-foreground text-xs py-8">
                No messages yet. Start the conversation!
              </p>
            ) : (
              messages.map(msg => {
                const isMe = msg.userId === user?.id;
                return (
                  <div key={msg.id} className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                    {!isMe && (
                      <span className={`text-[10px] font-medium mb-0.5 ${roleColors[msg.role] ?? "text-muted-foreground"}`}>
                        {msg.displayName}
                      </span>
                    )}
                    <div className={`max-w-[85%] px-3 py-1.5 rounded-2xl text-sm ${
                      isMe
                        ? "blue-gradient-bg text-white rounded-br-sm"
                        : "bg-muted text-foreground rounded-bl-sm"
                    }`}>
                      {msg.message}
                    </div>
                    <span className="text-[9px] text-muted-foreground mt-0.5">{formatTime(msg.createdAt)}</span>
                  </div>
                );
              })
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="px-3 pb-3 pt-2 border-t border-white/10">
            <div className="flex gap-2 items-center">
              <input
                className="flex-1 text-sm bg-muted rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-primary/40 placeholder:text-muted-foreground"
                placeholder="Type a message…"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
              />
              <button
                onClick={sendMessage}
                disabled={!input.trim() || sending}
                className="blue-gradient-bg text-white rounded-xl p-2 disabled:opacity-40 hover:opacity-90 transition"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setOpen(true)}
          className="blue-gradient-bg text-white rounded-full p-4 shadow-lg glow-blue hover:scale-105 transition-transform relative"
        >
          <MessageSquare className="h-5 w-5" />
          {unread > 0 && (
            <span className="absolute -top-1 -right-1 bg-green-500 text-white text-[9px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-1">
              {unread > 99 ? "99+" : unread}
            </span>
          )}
        </button>
      )}
    </div>
  );
}
