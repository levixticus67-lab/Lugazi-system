import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { MessageSquare, Send, X, Archive, Search, ChevronLeft, ChevronRight } from "lucide-react";
import axios from "@/lib/axios";

interface ChatMessage {
  id: number;
  userId: number;
  displayName: string;
  role: string;
  message: string;
  createdAt: string;
}

interface ChatResponse {
  messages: ChatMessage[];
  total: number;
  hasLogs: boolean;
}

interface LogsResponse {
  messages: ChatMessage[];
  total: number;
  page: number;
  pages: number;
}

interface LiveChatProps {
  scope?: string;
}

const POLL_INTERVAL = 2500;

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

export default function LiveChat({ scope = "global" }: LiveChatProps) {
  const { user, token } = useAuth();
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<"chat" | "logs">("chat");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [hasLogs, setHasLogs] = useState(false);
  const [total, setTotal] = useState(0);
  const [seenCount, setSeenCount] = useState(0);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [logSearch, setLogSearch] = useState("");
  const [logPage, setLogPage] = useState(0);
  const [logs, setLogs] = useState<LogsResponse | null>(null);
  const [logsLoading, setLogsLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;

    async function fetchMessages() {
      try {
        const res = await axios.get<ChatResponse | ChatMessage[]>(`/api/chat/${scope}`);
        if (!cancelled) {
          if (Array.isArray(res.data)) {
            setMessages(res.data as ChatMessage[]);
          } else {
            const d = res.data as ChatResponse;
            setMessages(d.messages);
            setHasLogs(d.hasLogs);
            setTotal(d.total);
          }
        }
      } catch {
        // silently ignore poll errors
      }
    }

    fetchMessages();
    const interval = setInterval(fetchMessages, POLL_INTERVAL);
    return () => { cancelled = true; clearInterval(interval); };
  }, [token, scope]);

  useEffect(() => {
    if (open && view === "chat") {
      setSeenCount(messages.length);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    }
  }, [messages, open, view]);

  async function fetchLogs(search: string, page: number) {
    setLogsLoading(true);
    try {
      const res = await axios.get<LogsResponse>(`/api/chat/${scope}/logs`, { params: { search, page } });
      setLogs(res.data);
    } catch {
      // ignore
    } finally {
      setLogsLoading(false);
    }
  }

  function openLogs() {
    setView("logs");
    setLogSearch("");
    setLogPage(0);
    fetchLogs("", 0);
  }

  function handleSearchChange(val: string) {
    setLogSearch(val);
    setLogPage(0);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => fetchLogs(val, 0), 350);
  }

  function handleLogPageChange(newPage: number) {
    setLogPage(newPage);
    fetchLogs(logSearch, newPage);
  }

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

  function formatDate(iso: string) {
    const d = new Date(iso);
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) + " " + formatTime(iso);
  }

  const unread = Math.max(0, messages.length - seenCount);

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {open ? (
        <div className="glass-card w-80 flex flex-col shadow-2xl animate-fade-in-scale" style={{ height: 460 }}>
          {/* Header */}
          <div className="flex items-center gap-2 px-4 py-3 border-b border-white/20 blue-gradient-bg rounded-t-[calc(var(--radius)-1px)] shrink-0">
            {view === "logs" ? (
              <button onClick={() => setView("chat")} className="text-white/70 hover:text-white">
                <ChevronLeft className="h-4 w-4" />
              </button>
            ) : (
              <MessageSquare className="h-4 w-4 text-white" />
            )}
            <span className="text-white font-semibold text-sm flex-1">
              {view === "logs" ? "Chat Logs" : "Church Live Chat"}
            </span>
            {view === "chat" && (
              <>
                <span className="text-white/70 text-[10px]">All Portals</span>
                <span className="h-2 w-2 rounded-full bg-green-400 animate-pulse ml-1" />
              </>
            )}
            {view === "chat" && (hasLogs || total > 50) && (
              <button onClick={openLogs} title="View all logs" className="text-white/70 hover:text-white ml-1">
                <Archive className="h-3.5 w-3.5" />
              </button>
            )}
            <button onClick={() => { setOpen(false); setView("chat"); }} className="text-white/70 hover:text-white ml-1">
              <X className="h-4 w-4" />
            </button>
          </div>

          {view === "chat" ? (
            <>
              <div className="flex-1 overflow-y-auto p-3 space-y-3">
                {total > messages.length && (
                  <div className="text-center">
                    <button onClick={openLogs} className="text-[10px] text-muted-foreground underline underline-offset-2 hover:text-primary">
                      {total - messages.length} older messages in logs →
                    </button>
                  </div>
                )}
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
                          {!isMe && <span className="text-[10px] font-semibold text-foreground">{msg.displayName}</span>}
                          {isMe && <span className="text-[10px] font-semibold text-foreground">You</span>}
                          <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${roleBadge[msg.role] ?? "bg-muted text-muted-foreground"}`}>
                            {roleLabel[msg.role] ?? msg.role}
                          </span>
                        </div>
                        <div className={`max-w-[85%] px-3 py-1.5 rounded-2xl text-sm ${isMe ? "blue-gradient-bg text-white rounded-br-sm" : "bg-muted text-foreground rounded-bl-sm"}`}>
                          {msg.message}
                        </div>
                        <span className="text-[9px] text-muted-foreground mt-0.5">{formatTime(msg.createdAt)}</span>
                      </div>
                    );
                  })
                )}
                <div ref={bottomRef} />
              </div>

              <div className="px-3 pb-3 pt-2 border-t border-white/10 shrink-0">
                <div className="flex gap-2 items-center">
                  <input
                    className="flex-1 text-sm bg-muted rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-primary/40 placeholder:text-muted-foreground"
                    placeholder="Type a message…"
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                  />
                  <button onClick={sendMessage} disabled={!input.trim() || sending}
                    className="blue-gradient-bg text-white rounded-xl p-2 disabled:opacity-40 hover:opacity-90 transition">
                    <Send className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="px-3 pt-3 pb-2 shrink-0 border-b border-white/10">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <input
                    className="w-full text-xs bg-muted rounded-lg pl-8 pr-3 py-2 outline-none focus:ring-2 focus:ring-primary/40 placeholder:text-muted-foreground"
                    placeholder="Search messages or names…"
                    value={logSearch}
                    onChange={e => handleSearchChange(e.target.value)}
                  />
                </div>
                {logs && (
                  <p className="text-[10px] text-muted-foreground mt-1.5 px-1">
                    {logs.total.toLocaleString()} total message{logs.total !== 1 ? "s" : ""}
                  </p>
                )}
              </div>

              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {logsLoading ? (
                  <div className="space-y-2">
                    {[...Array(5)].map((_, i) => <div key={i} className="h-14 rounded-lg bg-muted animate-pulse" />)}
                  </div>
                ) : !logs || logs.messages.length === 0 ? (
                  <p className="text-center text-muted-foreground text-xs py-8">
                    {logSearch ? "No messages match your search." : "No messages in logs yet."}
                  </p>
                ) : (
                  logs.messages.map(msg => (
                    <div key={msg.id} className="bg-muted/50 rounded-lg px-3 py-2">
                      <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                        <span className="text-[10px] font-semibold">{msg.displayName}</span>
                        <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${roleBadge[msg.role] ?? "bg-muted text-muted-foreground"}`}>
                          {roleLabel[msg.role] ?? msg.role}
                        </span>
                        <span className="ml-auto text-[9px] text-muted-foreground">{formatDate(msg.createdAt)}</span>
                      </div>
                      <p className="text-xs text-foreground leading-relaxed">{msg.message}</p>
                    </div>
                  ))
                )}
              </div>

              {logs && logs.pages > 1 && (
                <div className="px-3 pb-3 pt-2 border-t border-white/10 flex items-center justify-between shrink-0">
                  <button onClick={() => handleLogPageChange(logPage - 1)} disabled={logPage === 0}
                    className="p-1 rounded disabled:opacity-30 hover:bg-muted transition">
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <span className="text-xs text-muted-foreground">Page {logPage + 1} of {logs.pages}</span>
                  <button onClick={() => handleLogPageChange(logPage + 1)} disabled={logPage >= logs.pages - 1}
                    className="p-1 rounded disabled:opacity-30 hover:bg-muted transition">
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      ) : (
        <button onClick={() => setOpen(true)}
          className="blue-gradient-bg text-white rounded-full p-4 shadow-lg glow-blue hover:scale-105 transition-transform relative">
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
