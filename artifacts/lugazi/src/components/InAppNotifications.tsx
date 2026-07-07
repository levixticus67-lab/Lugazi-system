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
 */
export default function InAppNotifications() {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const shownIds = useRef<Set<number>>(new Set());

  const { data: notifications = [] } = useQuery<InAppNotification[]>({
    queryKey: ["inbox-notifications"],
    queryFn: () => axios.get("/api/notifications/inbox").then(r => r.data),
    enabled: !!user,
    refetchInterval: 30_000, // poll every 30 seconds
    refetchIntervalInBackground: false,
  });

  const markRead = useMutation({
    mutationFn: (id: number) => axios.patch(`/api/notifications/inbox/${id}/read`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["inbox-notifications"] }),
  });

  useEffect(() => {
    notifications.forEach((n) => {
      if (shownIds.current.has(n.id)) return;
      shownIds.current.add(n.id);

      toast({
        title: n.title,
        description: n.message,
        duration: 8000,
      });

      // Mark as read on the server
      markRead.mutate(n.id);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notifications]);

  return null;
}
