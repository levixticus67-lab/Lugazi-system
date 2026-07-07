import { useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "@/lib/axios";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

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

/**
 * Polls for unread in-app notifications and surfaces each one as a toast pop-up.
 * Mount this once inside AuthProvider so it has access to the current user.
 * - Query key is scoped by user ID to avoid cross-user cache leaks.
 * - shownIds ref is cleared on user change to prevent duplicate/missing toasts.
 * - Uses mark-all-read in one request instead of per-notification calls.
 */
export default function InAppNotifications() {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const shownIds = useRef<Set<number>>(new Set());
  const prevUserId = useRef<number | null>(null);

  // Clear shown state when the logged-in user changes (logout / account switch)
  useEffect(() => {
    const currentId = user?.id ?? null;
    if (prevUserId.current !== currentId) {
      shownIds.current = new Set();
      prevUserId.current = currentId;
    }
  }, [user?.id]);

  const { data: notifications = [] } = useQuery<InAppNotification[]>({
    // Scope query key by user ID — prevents stale cache from one user leaking into another
    queryKey: ["inbox-notifications", user?.id],
    queryFn: () => axios.get("/api/notifications/inbox").then(r => r.data),
    enabled: !!user,
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
  });

  const markAllRead = useMutation({
    mutationFn: () => axios.patch("/api/notifications/inbox/read-all"),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["inbox-notifications", user?.id] }),
  });

  useEffect(() => {
    const unseen = notifications.filter(n => !shownIds.current.has(n.id));
    if (unseen.length === 0) return;

    unseen.forEach(n => {
      shownIds.current.add(n.id);
      toast({
        title: n.title,
        description: n.message,
        duration: 8000,
      });
    });

    // Mark all shown notifications as read in a single request
    markAllRead.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notifications]);

  return null;
}
