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

  const markOneRead = useMutation({
    mutationFn: (id: number) => axios.patch(`/api/notifications/inbox/${id}/read`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["inbox-notifications", user?.id] }),
  });

  // Count only genuinely unread notifications for the badge
  const unreadCount = notifications.filter(n => !n.isRead).length;
  const hasUnread = unreadCount > 0;

  function handleOpen(val: boolean) {
    setOpen(val);
    // Mark all as read the moment the popover opens so the badge clears
    if (val && hasUnread) {
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
          {hasUnread
            ? <BellRing className="h-4 w-4 text-primary animate-[ring_0.6s_ease-in-out]" />
            : <Bell className="h-4 w-4 text-muted-foreground" />}
          {hasUnread && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white leading-none">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-80 p-0 shadow-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-700">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Notifications
          </h3>
          {hasUnread && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 gap-1"
              onClick={() => markAllRead.mutate()}
            >
              <Check className="h-3 w-3" />
              Mark all read
            </Button>
          )}
        </div>

        {/* Empty state */}
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
            <Bell className="h-8 w-8 text-slate-300 dark:text-slate-600 mb-2" />
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">You're all caught up!</p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">No new notifications</p>
          </div>
        ) : (
          <ScrollArea className="max-h-[360px]">
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {notifications.map(n => (
                <div
                  key={n.id}
                  onClick={() => { if (!n.isRead) markOneRead.mutate(n.id); }}
                  className={[
                    "px-4 py-3 transition-colors cursor-pointer",
                    n.isRead
                      ? "hover:bg-slate-50 dark:hover:bg-slate-800/50"
                      : "bg-blue-50/60 dark:bg-blue-950/40 hover:bg-blue-50 dark:hover:bg-blue-950/60",
                  ].join(" ")}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      {!n.isRead && (
                        <span className="shrink-0 w-2 h-2 rounded-full bg-blue-500 dark:bg-blue-400 mt-0.5" />
                      )}
                      <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 leading-tight truncate">
                        {n.title}
                      </p>
                    </div>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 shrink-0 mt-0.5">
                      {timeAgo(n.createdAt)}
                    </span>
                  </div>
                  <p className={[
                    "text-xs mt-1 leading-relaxed",
                    n.isRead
                      ? "text-slate-500 dark:text-slate-400"
                      : "text-slate-700 dark:text-slate-300",
                  ].join(" ")}>
                    {n.message}
                  </p>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </PopoverContent>
    </Popover>
  );
}
