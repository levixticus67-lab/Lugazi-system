import { useQuery } from "@tanstack/react-query";
import axios from "@/lib/axios";
import { Calendar, Clock, MapPin, Users, X } from "lucide-react";
import { useState } from "react";

interface Meeting {
  id: number;
  title: string;
  description: string | null;
  scheduledAt: string;
  location: string;
  portalTarget: string;
  status: string;
  agenda: string | null;
}

const TWO_DAYS_MS = 2 * 24 * 60 * 60 * 1000;

interface MeetingDashCardProps {
  portalTarget: string;
}

export default function MeetingDashCard({ portalTarget }: MeetingDashCardProps) {
  const [dismissed, setDismissed] = useState<Set<number>>(() => {
    try {
      const s = localStorage.getItem("dismissed_meetings");
      return s ? new Set(JSON.parse(s)) : new Set();
    } catch { return new Set(); }
  });

  const { data: meetings = [] } = useQuery<Meeting[]>({
    queryKey: ["meetings-dash", portalTarget],
    queryFn: () =>
      axios.get(`/api/meetings?target=${portalTarget}`).then(r => r.data as Meeting[]).catch(() => [] as Meeting[]),
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

  const now = Date.now();
  const visible = meetings.filter(m => {
    if (m.status === "cancelled") return false;
    const at = new Date(m.scheduledAt).getTime();
    if (at + TWO_DAYS_MS < now) return false;
    if (dismissed.has(m.id)) return false;
    return true;
  });

  function dismiss(id: number) {
    const next = new Set(dismissed);
    next.add(id);
    setDismissed(next);
    try { localStorage.setItem("dismissed_meetings", JSON.stringify([...next])); } catch {}
  }

  if (visible.length === 0) return null;

  const m = visible[0];
  const scheduledAt = new Date(m.scheduledAt);
  const isPast = scheduledAt.getTime() < now;
  const isToday = scheduledAt.toDateString() === new Date().toDateString();
  const isTomorrow = scheduledAt.toDateString() === new Date(now + 86400000).toDateString();

  function whenLabel() {
    if (isToday) return `Today · ${scheduledAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
    if (isTomorrow) return `Tomorrow · ${scheduledAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
    if (isPast) return `${scheduledAt.toLocaleDateString("en-GB", { day: "numeric", month: "short" })} (passed)`;
    return scheduledAt.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) + " · " +
      scheduledAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  return (
    <div className="glass-card p-4 animate-slide-in-up border-l-4 border-primary relative overflow-hidden">
      <div className="absolute top-0 right-0 w-20 h-20 bg-primary/5 rounded-bl-full" />
      <button
        onClick={() => dismiss(m.id)}
        className="absolute top-2 right-2 text-muted-foreground hover:text-foreground transition p-1"
        title="Dismiss"
      >
        <X className="h-3.5 w-3.5" />
      </button>

      <div className="flex items-start gap-3 pr-6">
        <div className="w-9 h-9 rounded-xl blue-gradient-bg flex items-center justify-center shrink-0">
          <Calendar className="h-4 w-4 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${isToday ? "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300" : isPast ? "bg-muted text-muted-foreground" : "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300"}`}>
              {isToday ? "TODAY" : isPast ? "RECENT" : "UPCOMING"}
            </span>
            {visible.length > 1 && (
              <span className="text-[10px] text-muted-foreground">+{visible.length - 1} more</span>
            )}
          </div>
          <h4 className="font-semibold text-sm leading-tight truncate">{m.title}</h4>
          {m.description && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{m.description}</p>}
          <div className="flex flex-wrap items-center gap-3 mt-2">
            <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <Clock className="h-3 w-3" /> {whenLabel()}
            </span>
            {m.location && (
              <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <MapPin className="h-3 w-3" /> {m.location}
              </span>
            )}
          </div>
          {m.agenda && (
            <details className="mt-2">
              <summary className="text-[11px] text-primary cursor-pointer flex items-center gap-1">
                <Users className="h-3 w-3" /> View agenda
              </summary>
              <pre className="text-[11px] text-muted-foreground mt-1 whitespace-pre-wrap font-sans leading-relaxed">{m.agenda}</pre>
            </details>
          )}
        </div>
      </div>
    </div>
  );
}
