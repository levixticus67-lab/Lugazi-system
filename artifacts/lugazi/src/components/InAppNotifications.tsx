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

/** Plays a short soft chime using the Web Audio API. No file dependencies. */
function playChime() {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(660, ctx.currentTime + 0.18);
    gain.gain.setValueAtTime(0.28, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.55);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.55);
    osc.onended = () => ctx.close();
  } catch {
    // Audio blocked or unsupported — silent fail
  }
}

/**
 * Polls for unread in-app notifications, shows each one as a toast, and plays
 * a soft chime. Mount once inside AuthProvider.
 */
export default function InAppNotifications() {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const shownIds = useRef<Set<number>>(new Set());
  const prevUserId = useRef<number | null>(null);
  const isFirstLoad = useRef(true);

  useEffect(() => {
    const currentId = user?.id ?? null;
    if (prevUserId.current !== currentId) {
      shownIds.current = new Set();
      prevUserId.current = currentId;
      isFirstLoad.current = true;
    }
  }, [user?.id]);

  const { data: notifications = [] } = useQuery<InAppNotification[]>({
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

    // On the very first load after login, silently mark existing ones read
    // (they were already shown in previous sessions) without toasting or chiming.
    if (isFirstLoad.current) {
      unseen.forEach(n => shownIds.current.add(n.id));
      isFirstLoad.current = false;
      markAllRead.mutate();
      return;
    }

    // New notifications arrived after the first load — toast + chime
    playChime();
    unseen.forEach(n => {
      shownIds.current.add(n.id);
      toast({
        title: n.title,
        description: n.message,
        duration: 8000,
      });
    });

    markAllRead.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notifications]);

  return null;
}
