import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  MessageSquare, Send, X, Archive, Search, ChevronLeft, ChevronRight,
  Smile, Trash2, Reply, Lock, LockOpen, Users, Wifi, WifiOff,
  Bell, BellOff, Sparkles, MoreHorizontal, Check, CheckCheck, AtSign,
} from "lucide-react";
import axios from "@/lib/axios";

interface ChatMessage {
  id: number;
  userId: number;
  displayName: string;
  role: string;
  photoUrl?: string | null;
  message: string;
  replyToId?: number | null;
  replyToText?: string | null;
  replyToName?: string | null;
  isDeleted: boolean;
  createdAt: string;
}

interface ChatReaction {
  id: number;
  messageId: number;
  userId: number;
  displayName: string;
  emoji: string;
}

interface ChatResponse {
  messages: ChatMessage[];
  reactions: ChatReaction[];
  total: number;
  hasLogs: boolean;
}

interface PrivateMessage {
  id: number;
  fromUserId: number;
  toUserId: number;
  fromName: string;
  toName: string;
  fromPhotoUrl?: string | null;
  message: string;
  replyToId?: number | null;
  replyToText?: string | null;
  isRead: boolean;
  isPrivateMode: boolean;
  createdAt: string;
}

interface DMUser {
  userId: number;
  displayName: string;
  photoUrl?: string | null;
  role: string;
}

interface UserStatus {
  userId: number;
  displayName: string;
  photoUrl?: string | null;
  status: string;
}

interface LogsResponse {
  messages: ChatMessage[];
  total: number;
  page: number;
  pages: number;
}

const POLL_INTERVAL = 2500;

const QUICK_REACTIONS = ["🙏", "❤️", "🙌", "👍", "😂", "🎉", "🔥", "🕊️"];
const FULL_EMOJI_ROWS = [
  ["😀","😂","🥰","😍","🤩","😎","🥳","😇","🙏","❤️","🧡","💛","💚","💙","💜"],
  ["🙌","👏","👍","👎","✋","🤝","🫶","💪","🎉","🎊","🎈","🌟","⭐","✨","🔥"],
  ["🕊️","✝️","📖","⛪","🎵","🎶","🌺","🌸","🌼","🌻","🌹","💐","🙌","🫙","🕯️"],
  ["😢","😔","🥺","😮","😲","🤔","🙄","😅","😬","🤣","😁","😊","😌","🥹","😴"],
];
const CHURCH_STICKERS = [
  { label: "Amen 🙏", text: "Amen 🙏" },
  { label: "God is good ✝️", text: "God is good! ✝️" },
  { label: "Praise the Lord 🙌", text: "Praise the Lord! 🙌" },
  { label: "Hallelujah 🎉", text: "Hallelujah! 🎉" },
  { label: "Blessed 💫", text: "Blessed and highly favoured 💫" },
  { label: "Grace & Peace 🕊️", text: "Grace and Peace to you 🕊️" },
  { label: "Praying 🙏", text: "Standing in prayer with you 🙏" },
  { label: "To God be glory 🌟", text: "To God be all the glory! 🌟" },
];

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  online: { label: "Online", color: "bg-green-500", icon: "🟢" },
  offline: { label: "Offline", color: "bg-gray-400", icon: "⚫" },
  "in-service": { label: "In Service", color: "bg-blue-500", icon: "⛪" },
  dnd: { label: "Do Not Disturb", color: "bg-red-500", icon: "🔴" },
};

const roleBadge: Record<string, string> = {
  admin: "bg-blue-500/20 text-blue-400 border border-blue-500/30",
  leadership: "bg-sky-500/20 text-sky-400 border border-sky-500/30",
  workforce: "bg-indigo-500/20 text-indigo-400 border border-indigo-500/30",
  member: "bg-slate-500/20 text-slate-400 border border-slate-500/30",
};
const roleLabel: Record<string, string> = {
  admin: "Admin", leadership: "Leader", workforce: "Workforce", member: "Member",
};

function Avatar({ name, photoUrl, size = "sm" }: { name: string; photoUrl?: string | null; size?: "sm" | "xs" }) {
  const sz = size === "xs" ? "w-5 h-5 text-[9px]" : "w-7 h-7 text-xs";
  if (photoUrl) return <img src={photoUrl} alt={name} className={`${sz} rounded-full object-cover shrink-0`} />;
  return (
    <div className={`${sz} rounded-full blue-gradient-bg flex items-center justify-center text-white font-bold shrink-0`}>
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

type ChatView = "chat" | "logs" | "emoji" | "stickers" | "dm" | "dm-thread" | "status" | "ai-summary";

export default function LiveChat() {
  const { user, token } = useAuth();
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<ChatView>("chat");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [reactions, setReactions] = useState<ChatReaction[]>([]);
  const [hasLogs, setHasLogs] = useState(false);
  const [total, setTotal] = useState(0);
  const [seenCount, setSeenCount] = useState(0);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [dnd, setDnd] = useState(() => localStorage.getItem("chat_dnd") === "1");
  const [myStatus, setMyStatus] = useState("online");

  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [showEmojiFor, setShowEmojiFor] = useState<number | null>(null);
  const [showFullEmoji, setShowFullEmoji] = useState(false);
  const [showMsgMenu, setShowMsgMenu] = useState<number | null>(null);

  const [logSearch, setLogSearch] = useState("");
  const [logPage, setLogPage] = useState(0);
  const [logs, setLogs] = useState<LogsResponse | null>(null);
  const [logsLoading, setLogsLoading] = useState(false);

  const [dmUsers, setDmUsers] = useState<DMUser[]>([]);
  const [dmTarget, setDmTarget] = useState<DMUser | null>(null);
  const [dmMessages, setDmMessages] = useState<PrivateMessage[]>([]);
  const [dmInput, setDmInput] = useState("");
  const [privateMode, setPrivateMode] = useState(false);
  const [dmReplyTo, setDmReplyTo] = useState<PrivateMessage | null>(null);
  const [onlineStatuses, setOnlineStatuses] = useState<UserStatus[]>([]);

  const [aiSummary, setAiSummary] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [mentionSearch, setMentionSearch] = useState("");
  const [showMentions, setShowMentions] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dmPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const SCOPE = "global";

  const fetchMessages = useCallback(async () => {
    if (!token) return;
    try {
      const res = await axios.get<ChatResponse>(`/api/chat/${SCOPE}`);
      setMessages(res.data.messages);
      setReactions(res.data.reactions || []);
      setHasLogs(res.data.hasLogs);
      setTotal(res.data.total);
    } catch { }
  }, [token]);

  useEffect(() => {
    if (!token) return;
    fetchMessages();
    const interval = setInterval(fetchMessages, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [token, fetchMessages]);

  useEffect(() => {
    if (!token) return;
    axios.get<UserStatus[]>("/api/chat/statuses").then(r => setOnlineStatuses(r.data)).catch(() => {});
  }, [token, open]);

  useEffect(() => {
    if (open && view === "chat") {
      setSeenCount(messages.length);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    }
  }, [messages, open, view]);

  useEffect(() => {
    if (!token || !user) return;
    axios.patch("/api/chat/status", { status: myStatus, displayName: user.displayName, photoUrl: (user as any).photoUrl }).catch(() => {});
  }, [myStatus, token, user]);

  useEffect(() => {
    if (!token || view !== "dm" || !open) return;
    axios.get<ChatMessage[]>(`/api/chat/${SCOPE}`).then(r => {
      const seen = new Set<number>();
      const users: DMUser[] = [];
      (r.data as any[]).forEach((m: ChatMessage) => {
        if (m.userId !== user?.id && !seen.has(m.userId)) {
          seen.add(m.userId);
          users.push({ userId: m.userId, displayName: m.displayName, photoUrl: m.photoUrl, role: m.role });
        }
      });
      setDmUsers(users);
    }).catch(() => {});
  }, [token, view, open, user?.id]);

  useEffect(() => {
    if (!token || !dmTarget) return;
    const poll = async () => {
      try {
        const res = await axios.get<PrivateMessage[]>(`/api/chat/dm/${dmTarget.userId}`);
        setDmMessages(res.data);
      } catch { }
    };
    poll();
    dmPollRef.current = setInterval(poll, POLL_INTERVAL);
    return () => { if (dmPollRef.current) clearInterval(dmPollRef.current); };
  }, [token, dmTarget]);

  async function fetchLogs(search: string, page: number) {
    setLogsLoading(true);
    try {
      const res = await axios.get<LogsResponse>(`/api/chat/${SCOPE}/logs`, { params: { search, page } });
      setLogs(res.data);
    } catch { } finally { setLogsLoading(false); }
  }

  function openLogs() { setView("logs"); setLogSearch(""); setLogPage(0); fetchLogs("", 0); }

  function handleSearchChange(val: string) {
    setLogSearch(val); setLogPage(0);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => fetchLogs(val, 0), 350);
  }

  async function sendMessage() {
    if (!input.trim() || !user || sending) return;
    setSending(true);
    try {
      const payload: Record<string, unknown> = {
        message: input.trim(), displayName: user.displayName, role: user.role,
        photoUrl: (user as any).photoUrl ?? null,
      };
      if (replyTo) {
        payload.replyToId = replyTo.id;
        payload.replyToText = replyTo.message.slice(0, 100);
        payload.replyToName = replyTo.displayName;
      }
      const res = await axios.post<ChatMessage>(`/api/chat/${SCOPE}`, payload);
      setMessages(prev => [...prev, res.data]);
      setInput(""); setReplyTo(null); setShowFullEmoji(false); setShowMentions(false);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    } catch { } finally { setSending(false); }
  }

  async function deleteMessage(id: number) {
    try {
      await axios.delete(`/api/chat/${SCOPE}/${id}`);
      setMessages(prev => prev.map(m => m.id === id ? { ...m, isDeleted: true } : m));
    } catch { }
    setShowMsgMenu(null);
  }

  async function toggleReaction(messageId: number, emoji: string) {
    if (!user) return;
    try {
      await axios.post(`/api/chat/${SCOPE}/${messageId}/react`, { emoji, displayName: user.displayName });
      const existing = reactions.find(r => r.messageId === messageId && r.userId === user.id && r.emoji === emoji);
      if (existing) {
        setReactions(prev => prev.filter(r => !(r.messageId === messageId && r.userId === user.id && r.emoji === emoji)));
      } else {
        setReactions(prev => [...prev, { id: Date.now(), messageId, userId: user.id, displayName: user.displayName, emoji }]);
      }
    } catch { }
    setShowEmojiFor(null);
  }

  async function sendDm() {
    if (!dmInput.trim() || !user || !dmTarget) return;
    try {
      const payload: Record<string, unknown> = {
        message: dmInput.trim(), fromName: user.displayName, toName: dmTarget.displayName,
        fromPhotoUrl: (user as any).photoUrl, isPrivateMode: privateMode,
      };
      if (dmReplyTo) { payload.replyToId = dmReplyTo.id; payload.replyToText = dmReplyTo.message.slice(0, 100); }
      const res = await axios.post<PrivateMessage>(`/api/chat/dm/${dmTarget.userId}`, payload);
      setDmMessages(prev => [...prev, res.data]);
      setDmInput(""); setDmReplyTo(null);
    } catch { }
  }

  async function endPrivateMode() {
    if (!dmTarget) return;
    await axios.delete(`/api/chat/dm/${dmTarget.userId}/end-private`).catch(() => {});
    setDmMessages(prev => prev.filter(m => !m.isPrivateMode));
    setPrivateMode(false);
  }

  async function getAiSummary() {
    setAiLoading(true); setView("ai-summary");
    try {
      const recentMsgs = messages.slice(-20).map(m => `${m.displayName}: ${m.message}`).join("\n");
      const res = await axios.post<{ reply: string }>("/api/ai", {
        message: `Summarize these recent church chat messages in bullet points, highlighting key discussions and any action items:\n\n${recentMsgs}`,
        context: "church live chat AI catch-up summarization",
      });
      setAiSummary(res.data.reply);
    } catch { setAiSummary("Could not generate summary. Try again later."); } finally { setAiLoading(false); }
  }

  function handleInput(val: string) {
    setInput(val);
    const atMatch = val.match(/@(\w*)$/);
    if (atMatch) { setMentionSearch(atMatch[1]); setShowMentions(true); }
    else { setShowMentions(false); setMentionSearch(""); }
  }

  function insertMention(name: string) {
    setInput(prev => prev.replace(/@\w*$/, `@${name} `));
    setShowMentions(false); setMentionSearch(""); inputRef.current?.focus();
  }

  function toggleDnd(val: boolean) {
    setDnd(val); localStorage.setItem("chat_dnd", val ? "1" : "0");
    if (val) setMyStatus("dnd"); else setMyStatus("online");
  }

  function formatTime(iso: string) { return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }); }
  function formatDate(iso: string) {
    const d = new Date(iso);
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) + " " + formatTime(iso);
  }

  const unread = dnd ? 0 : Math.max(0, messages.length - seenCount);

  function getReactionsForMsg(msgId: number): Record<string, { count: number; mine: boolean }> {
    const grouped: Record<string, { count: number; mine: boolean }> = {};
    reactions.filter(r => r.messageId === msgId).forEach(r => {
      if (!grouped[r.emoji]) grouped[r.emoji] = { count: 0, mine: false };
      grouped[r.emoji].count++;
      if (r.userId === user?.id) grouped[r.emoji].mine = true;
    });
    return grouped;
  }

  const mentionUsers = dmUsers.filter(u => u.displayName.toLowerCase().includes(mentionSearch.toLowerCase())).slice(0, 5);

  function renderMessage(msg: ChatMessage, isPrivate = false) {
    const isMe = msg.userId === user?.id;
    const msgReactions = getReactionsForMsg(msg.id);
    const hasReactions = Object.keys(msgReactions).length > 0;

    return (
      <div key={msg.id} className={`flex flex-col ${isMe ? "items-end" : "items-start"} group`}>
        {msg.replyToId && msg.replyToText && (
          <div className={`max-w-[85%] mb-0.5 px-2 py-1 rounded-lg border-l-2 border-primary/40 bg-muted/60 text-[10px] text-muted-foreground ${isMe ? "self-end" : "self-start"}`}>
            <span className="font-medium">{msg.replyToName}</span>: {msg.replyToText.slice(0, 60)}{msg.replyToText.length > 60 ? "…" : ""}
          </div>
        )}
        <div className="flex items-end gap-1.5">
          {!isMe && <Avatar name={msg.displayName} photoUrl={msg.photoUrl} size="xs" />}
          <div className="flex flex-col">
            {!isMe && <span className="text-[10px] font-semibold mb-0.5 ml-0.5">{msg.displayName}</span>}
            <div className="relative">
              {msg.isDeleted ? (
                <div className="px-3 py-1.5 rounded-2xl text-xs italic text-muted-foreground bg-muted/50">Message deleted</div>
              ) : (
                <div className={`max-w-[85%] px-3 py-1.5 rounded-2xl text-sm leading-relaxed ${isMe ? "blue-gradient-bg text-white rounded-br-sm" : "bg-muted text-foreground rounded-bl-sm"}`}>
                  {msg.message.split(/(@\w+)/g).map((part, i) =>
                    part.startsWith("@") ? <span key={i} className={`font-semibold ${isMe ? "text-yellow-200" : "text-primary"}`}>{part}</span> : part
                  )}
                </div>
              )}
              {!msg.isDeleted && (
                <div className={`absolute top-0 ${isMe ? "-left-14" : "-right-14"} hidden group-hover:flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity`}>
                  <button onClick={() => { setShowEmojiFor(msg.id); setShowMsgMenu(null); }}
                    className="p-1 rounded-full hover:bg-muted transition text-muted-foreground hover:text-foreground" title="React">
                    <Smile className="h-3 w-3" />
                  </button>
                  <button onClick={() => { setReplyTo(msg); setShowMsgMenu(null); inputRef.current?.focus(); }}
                    className="p-1 rounded-full hover:bg-muted transition text-muted-foreground hover:text-foreground" title="Reply">
                    <Reply className="h-3 w-3" />
                  </button>
                  {isMe && (
                    <button onClick={() => deleteMessage(msg.id)}
                      className="p-1 rounded-full hover:bg-muted transition text-muted-foreground hover:text-destructive" title="Delete">
                      <Trash2 className="h-3 w-3" />
                    </button>
                  )}
                </div>
              )}
            </div>

            {showEmojiFor === msg.id && (
              <div className={`flex flex-wrap gap-1 mt-1 p-1.5 rounded-xl bg-popover border border-border shadow-lg ${isMe ? "self-end" : "self-start"}`}>
                {QUICK_REACTIONS.map(e => (
                  <button key={e} onClick={() => toggleReaction(msg.id, e)}
                    className="text-base hover:scale-125 transition-transform leading-none p-0.5 rounded">{e}</button>
                ))}
                <button onClick={() => { setShowEmojiFor(null); setShowFullEmoji(true); setShowMsgMenu(msg.id); }}
                  className="text-[10px] text-muted-foreground hover:text-foreground px-1">+</button>
                <button onClick={() => setShowEmojiFor(null)} className="text-muted-foreground hover:text-foreground">
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}

            {hasReactions && !msg.isDeleted && (
              <div className={`flex flex-wrap gap-0.5 mt-0.5 ${isMe ? "self-end" : "self-start"}`}>
                {Object.entries(msgReactions).map(([emoji, { count, mine }]) => (
                  <button key={emoji} onClick={() => toggleReaction(msg.id, emoji)}
                    className={`flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full border transition ${mine ? "bg-primary/10 border-primary/30 text-primary" : "bg-muted border-border text-muted-foreground hover:border-primary/30"}`}>
                    {emoji} <span className="font-medium">{count}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          {isMe && <Avatar name={msg.displayName} photoUrl={msg.photoUrl} size="xs" />}
        </div>
        <span className="text-[9px] text-muted-foreground mt-0.5 mx-8">{formatTime(msg.createdAt)}</span>
      </div>
    );
  }

  function renderDmMessage(msg: PrivateMessage) {
    const isMe = msg.fromUserId === user?.id;
    return (
      <div key={msg.id} className={`flex flex-col ${isMe ? "items-end" : "items-start"} group`}>
        {msg.replyToText && (
          <div className={`max-w-[85%] mb-0.5 px-2 py-1 rounded-lg border-l-2 border-primary/40 bg-muted/60 text-[10px] text-muted-foreground ${isMe ? "self-end" : "self-start"}`}>
            {msg.replyToText.slice(0, 60)}
          </div>
        )}
        <div className={`max-w-[85%] px-3 py-1.5 rounded-2xl text-sm leading-relaxed relative ${isMe ? "blue-gradient-bg text-white rounded-br-sm" : "bg-muted text-foreground rounded-bl-sm"} ${msg.isPrivateMode ? "border border-purple-500/40" : ""}`}>
          {msg.isPrivateMode && <Lock className="h-2.5 w-2.5 absolute top-1 right-1 opacity-50" />}
          {msg.message}
        </div>
        <div className={`flex items-center gap-2 mt-0.5 ${isMe ? "flex-row-reverse" : ""}`}>
          <span className="text-[9px] text-muted-foreground">{formatTime(msg.createdAt)}</span>
          {!isMe && (
            <button onClick={() => setDmReplyTo(msg)} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground transition">
              <Reply className="h-2.5 w-2.5" />
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {open ? (
        <div className="glass-card flex flex-col shadow-2xl animate-fade-in-scale" style={{ width: 340, height: 500 }}>
          {/* Header */}
          <div className="flex items-center gap-2 px-3 py-2.5 border-b border-white/20 blue-gradient-bg rounded-t-[calc(var(--radius)-1px)] shrink-0">
            {(view === "logs" || view === "dm-thread" || view === "ai-summary" || view === "status") && (
              <button onClick={() => { setView(view === "dm-thread" ? "dm" : "chat"); setDmTarget(null); }}
                className="text-white/70 hover:text-white">
                <ChevronLeft className="h-4 w-4" />
              </button>
            )}
            {view === "dm" && (
              <button onClick={() => setView("chat")} className="text-white/70 hover:text-white">
                <ChevronLeft className="h-4 w-4" />
              </button>
            )}
            <MessageSquare className="h-4 w-4 text-white shrink-0" />
            <span className="text-white font-semibold text-sm flex-1 truncate">
              {view === "chat" ? "Church Live Chat" :
               view === "logs" ? "Chat Archive" :
               view === "dm" ? "Direct Messages" :
               view === "dm-thread" && dmTarget ? `💬 ${dmTarget.displayName}` :
               view === "ai-summary" ? "AI Catch-Up ✨" :
               view === "status" ? "My Status" : ""}
            </span>
            {view === "chat" && (
              <div className="flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
                <span className="text-white/70 text-[9px]">Live</span>
              </div>
            )}
            {view === "chat" && (
              <>
                <button onClick={getAiSummary} title="AI Catch-Up" className="text-white/70 hover:text-white ml-0.5">
                  <Sparkles className="h-3.5 w-3.5" />
                </button>
                <button onClick={() => setView("dm")} title="Direct Messages" className="text-white/70 hover:text-white ml-0.5">
                  <AtSign className="h-3.5 w-3.5" />
                </button>
                <button onClick={() => toggleDnd(!dnd)} title={dnd ? "DND On" : "DND Off"} className="text-white/70 hover:text-white ml-0.5">
                  {dnd ? <BellOff className="h-3.5 w-3.5" /> : <Bell className="h-3.5 w-3.5" />}
                </button>
                <button onClick={() => setView("status")} title="My Status" className="text-white/70 hover:text-white ml-0.5">
                  <div className={`h-2 w-2 rounded-full ${STATUS_CONFIG[myStatus]?.color ?? "bg-gray-400"}`} />
                </button>
                {(hasLogs || total > 50) && (
                  <button onClick={openLogs} title="Archive" className="text-white/70 hover:text-white ml-0.5">
                    <Archive className="h-3.5 w-3.5" />
                  </button>
                )}
              </>
            )}
            {view === "dm-thread" && dmTarget && (
              <button onClick={() => setPrivateMode(p => !p)} title={privateMode ? "Exit private mode" : "Enter private mode"}
                className={`ml-0.5 ${privateMode ? "text-purple-300" : "text-white/70 hover:text-white"}`}>
                {privateMode ? <Lock className="h-3.5 w-3.5" /> : <LockOpen className="h-3.5 w-3.5" />}
              </button>
            )}
            <button onClick={() => { setOpen(false); setView("chat"); setReplyTo(null); setShowEmojiFor(null); setShowMsgMenu(null); }}
              className="text-white/70 hover:text-white ml-0.5">
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Private mode banner */}
          {view === "dm-thread" && privateMode && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-purple-500/10 border-b border-purple-500/20 text-xs text-purple-400 shrink-0">
              <Lock className="h-3 w-3" />
              <span className="flex-1">Private mode — messages auto-delete when session ends</span>
              <button onClick={endPrivateMode} className="text-purple-400 hover:text-purple-300 underline">End</button>
            </div>
          )}

          {/* Chat view */}
          {view === "chat" && (
            <>
              <div className="flex-1 overflow-y-auto p-3 space-y-2.5" onClick={() => { setShowEmojiFor(null); setShowMsgMenu(null); }}>
                {total > messages.length && (
                  <div className="text-center">
                    <button onClick={openLogs} className="text-[10px] text-muted-foreground underline underline-offset-2 hover:text-primary">
                      {total - messages.length} older messages in archive →
                    </button>
                  </div>
                )}
                {messages.length === 0 ? (
                  <p className="text-center text-muted-foreground text-xs py-8">No messages yet. Be the first to say something!</p>
                ) : (
                  messages.map(msg => renderMessage(msg))
                )}
                <div ref={bottomRef} />
              </div>

              {/* Full emoji picker */}
              {showFullEmoji && (
                <div className="px-3 pb-2 shrink-0 border-t border-white/10">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-muted-foreground">Pick emoji</span>
                    <button onClick={() => setShowFullEmoji(false)}><X className="h-3 w-3 text-muted-foreground" /></button>
                  </div>
                  <div className="space-y-1">
                    {FULL_EMOJI_ROWS.map((row, ri) => (
                      <div key={ri} className="flex gap-0.5 flex-wrap">
                        {row.map(e => (
                          <button key={e} onClick={() => { setInput(prev => prev + e); setShowFullEmoji(false); inputRef.current?.focus(); }}
                            className="text-base hover:scale-125 transition-transform leading-none p-0.5 rounded">{e}</button>
                        ))}
                      </div>
                    ))}
                  </div>
                  <div className="mt-2 border-t border-white/10 pt-2">
                    <p className="text-[10px] text-muted-foreground mb-1">Church Stickers</p>
                    <div className="flex flex-wrap gap-1">
                      {CHURCH_STICKERS.map(s => (
                        <button key={s.label} onClick={() => { setInput(s.text); setShowFullEmoji(false); inputRef.current?.focus(); }}
                          className="text-[10px] px-2 py-1 rounded-full bg-primary/10 border border-primary/20 hover:bg-primary/20 transition text-primary font-medium">
                          {s.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* @mention suggestions */}
              {showMentions && mentionUsers.length > 0 && (
                <div className="px-3 shrink-0 border-t border-white/10">
                  <div className="bg-popover border border-border rounded-lg overflow-hidden">
                    {mentionUsers.map(u => (
                      <button key={u.userId} onClick={() => insertMention(u.displayName)}
                        className="w-full text-left flex items-center gap-2 px-2 py-1.5 hover:bg-muted transition text-xs">
                        <Avatar name={u.displayName} photoUrl={u.photoUrl} size="xs" />
                        <span className="font-medium">{u.displayName}</span>
                        <span className={`text-[9px] px-1 rounded-full ${roleBadge[u.role] ?? ""}`}>{roleLabel[u.role] ?? u.role}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Reply preview */}
              {replyTo && (
                <div className="mx-3 mb-1 px-2 py-1 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-between gap-2 shrink-0">
                  <div className="min-w-0">
                    <p className="text-[10px] font-medium text-primary">Replying to {replyTo.displayName}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{replyTo.message.slice(0, 60)}</p>
                  </div>
                  <button onClick={() => setReplyTo(null)}><X className="h-3 w-3 text-muted-foreground" /></button>
                </div>
              )}

              <div className="px-3 pb-3 pt-1 border-t border-white/10 shrink-0">
                <div className="flex gap-2 items-center">
                  <button onClick={() => setShowFullEmoji(p => !p)} className="text-muted-foreground hover:text-foreground transition shrink-0">
                    <Smile className="h-4 w-4" />
                  </button>
                  <input
                    ref={inputRef}
                    className="flex-1 text-sm bg-muted rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-primary/40 placeholder:text-muted-foreground"
                    placeholder="Type a message… (@mention)"
                    value={input}
                    onChange={e => handleInput(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                  />
                  <button onClick={sendMessage} disabled={!input.trim() || sending}
                    className="blue-gradient-bg text-white rounded-xl p-2 disabled:opacity-40 hover:opacity-90 transition shrink-0">
                    <Send className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </>
          )}

          {/* Archive / Logs view */}
          {view === "logs" && (
            <>
              <div className="px-3 pt-3 pb-2 shrink-0 border-b border-white/10">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <input className="w-full text-xs bg-muted rounded-lg pl-8 pr-3 py-2 outline-none focus:ring-2 focus:ring-primary/40"
                    placeholder="Search messages…" value={logSearch} onChange={e => handleSearchChange(e.target.value)} />
                </div>
                {logs && <p className="text-[10px] text-muted-foreground mt-1 px-1">{logs.total.toLocaleString()} total messages</p>}
              </div>
              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {logsLoading ? [...Array(5)].map((_, i) => <div key={i} className="h-14 rounded-lg bg-muted animate-pulse" />) :
                 !logs || logs.messages.length === 0 ? (
                   <p className="text-center text-muted-foreground text-xs py-8">{logSearch ? "No results." : "No archived messages."}</p>
                 ) : (
                   logs.messages.map(msg => (
                     <div key={msg.id} className="bg-muted/50 rounded-lg px-3 py-2">
                       <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                         <span className="text-[10px] font-semibold">{msg.displayName}</span>
                         <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${roleBadge[msg.role] ?? ""}`}>{roleLabel[msg.role] ?? msg.role}</span>
                         <span className="ml-auto text-[9px] text-muted-foreground">{formatDate(msg.createdAt)}</span>
                       </div>
                       <p className="text-xs leading-relaxed">{msg.isDeleted ? <em className="text-muted-foreground">Deleted</em> : msg.message}</p>
                     </div>
                   ))
                 )}
              </div>
              {logs && logs.pages > 1 && (
                <div className="px-3 pb-3 pt-2 border-t border-white/10 flex items-center justify-between shrink-0">
                  <button onClick={() => { setLogPage(p => p - 1); fetchLogs(logSearch, logPage - 1); }} disabled={logPage === 0}
                    className="p-1 rounded disabled:opacity-30 hover:bg-muted"><ChevronLeft className="h-4 w-4" /></button>
                  <span className="text-xs text-muted-foreground">Page {logPage + 1} of {logs.pages}</span>
                  <button onClick={() => { setLogPage(p => p + 1); fetchLogs(logSearch, logPage + 1); }} disabled={logPage >= logs.pages - 1}
                    className="p-1 rounded disabled:opacity-30 hover:bg-muted"><ChevronRight className="h-4 w-4" /></button>
                </div>
              )}
            </>
          )}

          {/* DM List */}
          {view === "dm" && (
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              <p className="text-xs text-muted-foreground mb-2">Chat directly with anyone from the conversation</p>
              {dmUsers.length === 0 ? (
                <p className="text-center text-xs text-muted-foreground py-8">No contacts yet. Join the group chat to see people.</p>
              ) : (
                dmUsers.map(u => {
                  const status = onlineStatuses.find(s => s.userId === u.userId);
                  return (
                    <button key={u.userId} onClick={() => { setDmTarget(u); setView("dm-thread"); }}
                      className="w-full flex items-center gap-2.5 p-2.5 rounded-xl hover:bg-muted/60 transition text-left">
                      <div className="relative">
                        <Avatar name={u.displayName} photoUrl={u.photoUrl} />
                        {status && (
                          <div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border border-background ${STATUS_CONFIG[status.status]?.color ?? "bg-gray-400"}`} />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{u.displayName}</p>
                        <p className="text-[10px] text-muted-foreground capitalize">{roleLabel[u.role] ?? u.role} · {status ? STATUS_CONFIG[status.status]?.label : "Unknown"}</p>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          )}

          {/* DM Thread */}
          {view === "dm-thread" && dmTarget && (
            <>
              <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
                {dmMessages.length === 0 ? (
                  <p className="text-center text-xs text-muted-foreground py-8">No messages yet. Start the conversation!</p>
                ) : (
                  dmMessages.map(msg => renderDmMessage(msg))
                )}
                <div ref={bottomRef} />
              </div>
              {dmReplyTo && (
                <div className="mx-3 mb-1 px-2 py-1 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-between shrink-0">
                  <p className="text-[10px] text-muted-foreground truncate">Replying: {dmReplyTo.message.slice(0, 50)}</p>
                  <button onClick={() => setDmReplyTo(null)}><X className="h-3 w-3" /></button>
                </div>
              )}
              <div className="px-3 pb-3 pt-1 border-t border-white/10 shrink-0">
                <div className="flex gap-2 items-center">
                  {privateMode && <Lock className="h-3.5 w-3.5 text-purple-400 shrink-0" />}
                  <input className="flex-1 text-sm bg-muted rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-primary/40 placeholder:text-muted-foreground"
                    placeholder={privateMode ? "Private message…" : "Message…"}
                    value={dmInput} onChange={e => setDmInput(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendDm(); } }} />
                  <button onClick={sendDm} disabled={!dmInput.trim()}
                    className="blue-gradient-bg text-white rounded-xl p-2 disabled:opacity-40 shrink-0">
                    <Send className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </>
          )}

          {/* AI Summary */}
          {view === "ai-summary" && (
            <div className="flex-1 overflow-y-auto p-4">
              {aiLoading ? (
                <div className="flex flex-col items-center gap-3 py-8">
                  <Sparkles className="h-8 w-8 text-primary animate-pulse" />
                  <p className="text-sm text-muted-foreground">Generating AI catch-up…</p>
                </div>
              ) : aiSummary ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles className="h-4 w-4 text-primary" />
                    <h3 className="font-semibold text-sm">AI Chat Summary</h3>
                  </div>
                  <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 text-sm leading-relaxed whitespace-pre-wrap">{aiSummary}</div>
                  <button onClick={getAiSummary} className="text-xs text-primary hover:underline">Refresh summary</button>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">Click the ✨ button in the chat to get an AI summary of recent messages.</p>
              )}
            </div>
          )}

          {/* Status picker */}
          {view === "status" && (
            <div className="flex-1 p-4 space-y-3">
              <p className="text-xs text-muted-foreground mb-2">Set your presence status</p>
              {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                <button key={key} onClick={() => { setMyStatus(key); if (key === "dnd") setDnd(true); else setDnd(false); setView("chat"); }}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl border transition ${myStatus === key ? "border-primary bg-primary/5" : "border-border hover:border-primary/40 hover:bg-muted/40"}`}>
                  <div className={`w-3 h-3 rounded-full ${cfg.color}`} />
                  <span className="text-sm font-medium">{cfg.label}</span>
                  {myStatus === key && <Check className="h-4 w-4 text-primary ml-auto" />}
                </button>
              ))}
              <div className="pt-2 border-t border-border">
                <p className="text-[10px] text-muted-foreground">Sunday tip: Set "In Service" during services for focused worship</p>
              </div>
            </div>
          )}
        </div>
      ) : (
        <button onClick={() => setOpen(true)}
          className="blue-gradient-bg text-white rounded-full p-4 shadow-lg glow-blue hover:scale-105 transition-transform relative">
          <MessageSquare className="h-5 w-5" />
          {unread > 0 && !dnd && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 animate-bounce">
              {unread > 99 ? "99+" : unread}
            </span>
          )}
          {dnd && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center">
              <BellOff className="h-2.5 w-2.5" />
            </span>
          )}
        </button>
      )}
    </div>
  );
}
