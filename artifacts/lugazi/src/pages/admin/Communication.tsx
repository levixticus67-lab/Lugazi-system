import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "@/lib/axios";
import PortalLayout from "@/components/PortalLayout";
import PageHeader from "@/components/PageHeader";
import LiveChat from "@/components/LiveChat";
import AIAssistant from "@/components/AIAssistant";
import { adminNavItems } from "./navItems";
import { Send, Users, UsersRound, User, Bell, Megaphone, Clock, CheckCircle2, Trash2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface Announcement {
  id: number;
  title: string;
  message: string;
  audience: string;
  createdAt: string;
  sentBy: string;
}

const audienceOptions = [
  { value: "all", label: "Entire Congregation", icon: <UsersRound className="h-4 w-4" /> },
  { value: "admin", label: "Admins Only", icon: <User className="h-4 w-4" /> },
  { value: "leadership", label: "Leadership Team", icon: <Users className="h-4 w-4" /> },
  { value: "workforce", label: "Workforce", icon: <Users className="h-4 w-4" /> },
  { value: "member", label: "Members Only", icon: <User className="h-4 w-4" /> },
];

export default function AdminCommunication() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [audience, setAudience] = useState("all");

  const { data: announcements = [], isLoading } = useQuery<Announcement[]>({
    queryKey: ["announcements"],
    queryFn: () => axios.get<Announcement[]>("/api/announcements").then(r => r.data).catch(() => [] as Announcement[]),
    staleTime: 30_000,
  });

  const sendBroadcast = useMutation({
    mutationFn: (data: { title: string; message: string; audience: string; sentBy: string }) =>
      axios.post<Announcement>("/api/announcements", data).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["announcements"] });
      setTitle("");
      setMessage("");
      setAudience("all");
    },
  });

  const deleteBroadcast = useMutation({
    mutationFn: (id: number) => axios.delete(`/api/announcements/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["announcements"] }),
  });

  function handleSend() {
    if (!title.trim() || !message.trim() || sendBroadcast.isPending) return;
    sendBroadcast.mutate({
      title: title.trim(),
      message: message.trim(),
      audience,
      sentBy: user?.displayName ?? "Admin",
    });
  }

  function audienceLabel(val: string) {
    return audienceOptions.find(a => a.value === val)?.label ?? val;
  }

  return (
    <PortalLayout navItems={adminNavItems} portalLabel="Admin Portal">
      <PageHeader title="Communication Hub" subtitle="Broadcast messages to the congregation" />

      <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Compose */}
        <div className="lg:col-span-1">
          <div className="glass-card p-5 space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="blue-gradient-bg rounded-lg p-2"><Megaphone className="h-4 w-4 text-white" /></div>
              <span className="font-semibold text-sm">Compose Broadcast</span>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Audience</label>
              <select className="w-full bg-muted rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
                value={audience} onChange={e => setAudience(e.target.value)}>
                {audienceOptions.map(a => (
                  <option key={a.value} value={a.value}>{a.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Title</label>
              <input className="w-full bg-muted rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
                placeholder="Announcement title…" value={title} onChange={e => setTitle(e.target.value)} />
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Message</label>
              <textarea className="w-full bg-muted rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40 resize-none"
                rows={5} placeholder="Write your message here…" value={message} onChange={e => setMessage(e.target.value)} />
            </div>

            <button onClick={handleSend} disabled={!title.trim() || !message.trim() || sendBroadcast.isPending}
              className="w-full blue-gradient-bg text-white py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60 hover:opacity-90 transition">
              {sendBroadcast.isPending
                ? <><CheckCircle2 className="h-4 w-4 animate-spin" /> Sending…</>
                : sendBroadcast.isSuccess
                  ? <><CheckCircle2 className="h-4 w-4" /> Sent!</>
                  : <><Send className="h-4 w-4" /> Send Broadcast</>
              }
            </button>

            {sendBroadcast.isError && (
              <p className="text-xs text-destructive text-center">Failed to send. Please try again.</p>
            )}

            <p className="text-[10px] text-muted-foreground text-center">
              Broadcasts appear on dashboards for the selected audience.
            </p>
          </div>

          {/* Stats */}
          <div className="glass-card p-4 mt-4 space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Reach Stats</p>
            {audienceOptions.map(a => (
              <div key={a.value} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">{a.icon}{a.label}</div>
                <span className="font-semibold text-foreground">{a.value === "all" ? "All" : `${a.value} group`}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Sent Messages */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Sent Announcements</h2>
            <span className="text-xs text-muted-foreground">{announcements.length} messages</span>
          </div>

          {isLoading ? (
            <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="glass-card p-4 animate-pulse h-24" />)}</div>
          ) : announcements.length === 0 ? (
            <div className="glass-card p-8 text-center text-muted-foreground text-sm">
              No broadcasts sent yet. Compose one to get started.
            </div>
          ) : (
            announcements.map(ann => (
              <div key={ann.id} className="glass-card p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Bell className="h-4 w-4 text-primary shrink-0" />
                      <span className="font-semibold text-sm truncate">{ann.title}</span>
                      <span className="shrink-0 text-[10px] px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-medium">
                        {audienceLabel(ann.audience)}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">{ann.message}</p>
                    <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {new Date(ann.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                      <span>· by {ann.sentBy ?? "Admin"}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => deleteBroadcast.mutate(ann.id)}
                    disabled={deleteBroadcast.isPending}
                    className="text-muted-foreground hover:text-destructive transition-colors disabled:opacity-40">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <AIAssistant context="church communication and announcements" suggestions={[
        "Draft a Sunday service reminder message",
        "Write a message encouraging tithe and offering",
        "Compose a welfare awareness announcement",
        "Create an invitation message for a new event",
      ]} />
      <LiveChat scope="global" />
    </PortalLayout>
  );
}
