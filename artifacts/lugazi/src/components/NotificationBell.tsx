import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Bell, BellRing, Check } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import axios from "@/lib/axios";
import { useAuth } from "@/contexts/AuthContext";

interface InAppNotification {
  id: number;
  userId: number;
  title: string;
  message: string;
  isRead: boolean;
  relatedEntityType: string | null;
  relatedEntityId: number | null;
  createdAt: string;
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function NotificationBell() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data: notifications = [] } = useQuery<InAppNotification[]>({
    queryKey: ["inbox-notifications", user?.id],
    queryFn: () => axios.get("/api/notifications/inbox").then(r => r.data),
    enabled: !!user,
    refetchInterval: 30_000,
    staleTime: 20_000,
  });

  const markAllRead = useMutation({
    mutationFn: () => axios.patch("/api/notifications/inbox/read-all"),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["inbox-notifications", user?.id] }),
  });

  const unreadCount = notifications.length;
  const hasNew = unreadCount > 0;

  function handleOpen(val: boolean) {
    setOpen(val);
    // Mark all as read when the user opens the popover so the bell clears
    // after they've seen the notifications. They persist until opened.
    if (val && hasNew) {
      markAllRead.mutate();
    }
  }

  return (
    <Popover open={open} onOpenChange={handleOpen}>
      <PopoverTrigger asChild>
        <button
          className="relative flex items-center justify-center w-8 h-8 rounded-full transition-colors hover:bg-accent"
          aria-label="Notifications"
        >
          {hasNew
            ? <BellRing className="h-4 w-4 text-primary animate-[ring_0.6s_ease-in-out]" />
            : <Bell className="h-4 w-4 text-muted-foreground" />}
          {hasNew && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white leading-none">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0 shadow-lg" sideOffset={8}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h3 className="text-sm font-semibold text-foreground">Notifications</h3>
          {hasNew && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground gap-1"
              onClick={() => markAllRead.mutate()}
            >
              <Check className="h-3 w-3" />
              Mark all read
            </Button>
          )}
        </div>
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
            <Bell className="h-8 w-8 text-muted-foreground/40 mb-2" />
            <p className="text-sm text-muted-foreground">You're all caught up!</p>
            <p className="text-xs text-muted-foreground/60 mt-0.5">No new notifications</p>
          </div>
        ) : (
          <ScrollArea className="max-h-[360px]">
            <div className="divide-y divide-border">
              {notifications.map(n => (
                <div key={n.id} className="px-4 py-3 hover:bg-accent/50 transition-colors">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-xs font-semibold text-foreground leading-tight">{n.title}</p>
                    <span className="text-[10px] text-muted-foreground shrink-0 mt-0.5">{timeAgo(n.createdAt)}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{n.message}</p>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </PopoverContent>
    </Popover>
  );
}
