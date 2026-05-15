import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import axios from "@/lib/axios";
import { Bell, Megaphone, Clock, X } from "lucide-react";
import { useState } from "react";

interface Announcement {
  id: number;
  title: string;
  message: string;
  audience: string;
  sentBy: string;
  createdAt: string;
}

const audienceLabel: Record<string, string> = {
  all: "Everyone",
  admin: "Admins",
  leadership: "Leadership",
  workforce: "Workforce",
  member: "Members",
};

const audienceBadge: Record<string, string> = {
  all: "bg-violet-100 dark:bg-violet-950 text-violet-700 dark:text-violet-300",
  admin: "bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300",
  leadership: "bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300",
  workforce: "bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300",
  member: "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300",
};

const DISMISSED_KEY = "dcl_dismissed_broadcasts";

function getDismissed(): number[] {
  try { return JSON.parse(localStorage.getItem(DISMISSED_KEY) || "[]"); } catch { return []; }
}

function addDismissed(id: number) {
  const list = getDismissed();
  if (!list.includes(id)) { list.push(id); localStorage.setItem(DISMISSED_KEY, JSON.stringify(list)); }
}

export default function BroadcastCard() {
  const { user } = useAuth();
  const [dismissed, setDismissed] = useState<number[]>(getDismissed);

  const { data = [] } = useQuery<Announcement[]>({
    queryKey: ["announcements", user?.role],
    queryFn: () =>
      axios.get<Announcement[]>("/api/announcements", {
        params: { audience: user?.role ?? "all" },
      }).then(r => r.data).catch(() => [] as Announcement[]),
    refetchInterval: 60_000,
    enabled: !!user,
  });

  const visible = data.filter(a => !dismissed.includes(a.id));
  if (visible.length === 0) return null;

  function dismiss(id: number) {
    addDismissed(id);
    setDismissed(prev => [...prev, id]);
  }

  function formatTime(iso: string) {
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHrs = Math.floor(diffMins / 60);
    if (diffHrs < 24) return `${diffHrs}h ago`;
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  }

  return (
    <div className="mb-6 space-y-3">
      <div className="flex items-center gap-2 mb-1">
        <Megaphone className="h-4 w-4 text-primary" />
        <span className="text-sm font-semibold text-foreground">Broadcasts</span>
        <span className="ml-auto text-xs text-muted-foreground">{visible.length} new</span>
      </div>

      {visible.slice(0, 3).map(ann => (
        <div key={ann.id}
          className="glass-card p-4 border-l-4 border-primary animate-slide-in-up relative group">
          <button
            onClick={() => dismiss(ann.id)}
            className="absolute top-3 right-3 text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
            title="Dismiss"
          >
            <X className="h-3.5 w-3.5" />
          </button>

          <div className="flex items-start gap-2 pr-6">
            <Bell className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="font-semibold text-sm">{ann.title}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${audienceBadge[ann.audience] ?? audienceBadge.all}`}>
                  {audienceLabel[ann.audience] ?? ann.audience}
                </span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{ann.message}</p>
              <div className="flex items-center gap-1.5 mt-2 text-[10px] text-muted-foreground">
                <Clock className="h-3 w-3" />
                {formatTime(ann.createdAt)} · by {ann.sentBy}
              </div>
            </div>
          </div>
        </div>
      ))}

      {visible.length > 3 && (
        <p className="text-xs text-muted-foreground text-center py-1">
          +{visible.length - 3} more broadcast{visible.length - 3 > 1 ? "s" : ""}
        </p>
      )}
    </div>
  );
}
