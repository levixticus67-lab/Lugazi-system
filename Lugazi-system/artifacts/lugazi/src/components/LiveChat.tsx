import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { MessageSquare, Send, X } from "lucide-react";
import axios from "@/lib/axios";

interface ChatMessage {
  id: number;
  userId: number;
  displayName: string;
  role: string;
  message: string;
  createdAt: string;
}

const POLL_INTERVAL = 2500;
const GLOBAL_SCOPE = "global";

const roleBadge: Record<string, string> = {
  admin: "bg-blue-500/20 text-blue-400 border border-blue-500/30",
  leadership: "bg-sky-500/20 text-sky-400 border border-sky-500/30",
  workforce: "bg-indigo-500/20 text-indigo-400 border border-indigo-500/30",
  member: "bg-slate-500/20 text-slate-400 border border-slate-500/30",
};

const roleLabel: Record<string, string> = {
  admin: "Admin",
  leadership: "Leader",
  workforce: "Workforce",
  member: "Member",
};

export default function LiveChat() {
  const { user, token } = useAuth();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [seenCount, setSeenCount] = useState(0);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;

    async function fetchMessages() {
      try {
        const res = await axios.get<ChatMessage[]>(`/api/chat/${GLOBAL_SCOPE}`);
        if (!cancelled) setMessages(res.data);
      } catch {
        // silently ignore poll errors
      }
    }

    fetchMessages();
    const interval = setInterval(fetchMessages, POLL_INTERVAL);
    return () => { cancelled = true; clearInterval(interval); };
  }, [token]);

  useEffect(() => {
    if (open) {
      setSeenCount(messages.length);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    }
  }, [messages, open]);

  async function sendMessage() {
    if (!input.trim() || !user || sending) return;
    setSending(true);
    try {
      const res = await axios.post<ChatMessage>(`/api/chat/${GLOBAL_SCOPE}`, {
        message: input.trim(),
        displayName: user.displayName,
        role: user.role,
      });
      setMessages(prev => [...prev, res.data]);
      setInput("");
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    } catch {
      // ignore
    } finally {
      setSending(false);
    }
  }

  function formatTime(iso: string) {
    return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  const unread = Math.max(0, messages.length - seenCount);

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {open ? (
        <div className="glass-card w-80 flex flex-col shadow-2xl animate-fade-in-scale" style={{ height: 460 }}>
          <div className="flex items-center gap-2 px-4 py-3 border-b border-white/20 blue-gradient-bg rounded-t-[calc(var(--radius)-1px)]">
            <MessageSquare className="h-4 w-4 text-white" />
            <span className="text-white font-semibold text-sm flex-1">Church Live Chat</span>
            <span className="text-white/70 text-[10px]">All Portals</span>
            <span className="h-2 w-2 rounded-full bg-green-400 animate-pulse ml-1" />
            <button onClick={() => setOpen(false)} className="text-white/70 hover:text-white ml-1">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {messages.length === 0 ? (
              <p className="text-center text-muted-foreground text-xs py-8">
                No messages yet. Be the first to say something!
              </p>
            ) : (
              messages.map(msg => {
                const isMe = msg.userId === user?.id;
                return (
                  <div key={msg.id} className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                    <div className="flex items-center gap-1.5 mb-0.5">
                      {!isMe && (
                        <span className="text-[10px] font-semibold text-foreground">{msg.displayName}</span>
                      )}
                      {isMe && (
                        <span className="text-[10px] font-semibold text-foreground">You</span>
                      )}
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${roleBadge[msg.role] ?? "bg-muted text-muted-foreground"}`}>
                        {roleLabel[msg.role] ?? msg.role}
                      </span>
                    </div>
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
          onClick={() => { setOpen(true); }}
          className="blue-gradient-bg text-white rounded-full p-4 shadow-lg glow-blue hover:scale-105 transition-transform relative"
        >
          <MessageSquare className="h-5 w-5" />
          {unread > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 animate-bounce">
              {unread > 99 ? "99+" : unread}
            </span>
          )}
        </button>
      )}
    </div>
  );
}
