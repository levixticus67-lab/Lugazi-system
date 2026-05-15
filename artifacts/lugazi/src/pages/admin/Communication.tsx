import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "@/lib/axios";
import PortalLayout from "@/components/PortalLayout";
import PageHeader from "@/components/PageHeader";
import LiveChat from "@/components/LiveChat";
import AIAssistant from "@/components/AIAssistant";
import { adminNavItems } from "./navItems";
import { Send, Users, UsersRound, User, Bell, Megaphone, Clock, CheckCircle2, Trash2 } from "lucide-react";

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
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [audience, setAudience] = useState("all");
  const [sent, setSent] = useState(false);

  const { data: announcements = [], isLoading } = useQuery<Announcement[]>({
    queryKey: ["announcements"],
    queryFn: () => axios.get("/api/reports?type=announcement").then(r => r.data).catch(() => [] as Announcement[]),
    staleTime: 30_000,
  });

  const mock: Announcement[] = [
    { id: 1, title: "Sunday Service Reminder", message: "Join us this Sunday at 9:00 AM for our regular worship service. Come ready to receive!", audience: "all", createdAt: new Date(Date.now() - 86400000).toISOString(), sentBy: "Admin" },
    { id: 2, title: "Leadership Meeting — Friday", message: "All leaders are required to attend the leadership council meeting on Friday at 5 PM in the main hall.", audience: "leadership", createdAt: new Date(Date.now() - 172800000).toISOString(), sentBy: "Admin" },
    { id: 3, title: "Welfare Support Available", message: "Members in need of welfare support can now submit requests through the Member Portal. All requests are handled confidentially.", audience: "member", createdAt: new Date(Date.now() - 259200000).toISOString(), sentBy: "Admin" },
  ];

  const displayAnnouncements = announcements.length > 0 ? announcements : mock;

  function handleSend() {
    if (!title.trim() || !message.trim()) return;
    setSent(true);
    setTimeout(() => {
      setSent(false);
      setTitle("");
      setMessage("");
      setAudience("all");
    }, 2500);
  }

  function audienceLabel(val: string) {
    return audienceOptions.find(a => a.value === val)?.label ?? val;
  }

  return (
    <PortalLayout title="DCL Lugazi ERP" navItems={adminNavItems}>
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

            <button onClick={handleSend} disabled={!title.trim() || !message.trim() || sent}
              className="w-full blue-gradient-bg text-white py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60 hover:opacity-90 transition">
              {sent ? <><CheckCircle2 className="h-4 w-4" /> Sent!</> : <><Send className="h-4 w-4" /> Send Broadcast</>}
            </button>

            <p className="text-[10px] text-muted-foreground text-center">
              To enable SMS/email delivery, configure your notification service in Settings.
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
            <span className="text-xs text-muted-foreground">{displayAnnouncements.length} messages</span>
          </div>

          {isLoading ? (
            <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="glass-card p-4 animate-pulse h-24" />)}</div>
          ) : displayAnnouncements.map(ann => (
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
                <button className="text-muted-foreground hover:text-destructive transition-colors">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <AIAssistant context="church communication and announcements" suggestions={[
        "Draft a Sunday service reminder message",
        "Write a message encouraging tithe and offering",
        "Compose a welfare awareness announcement",
        "Create an invitation message for a new event",
      ]} />
      <LiveChat />
    </PortalLayout>
  );
}
