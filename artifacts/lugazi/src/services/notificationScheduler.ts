import { LocalNotifications } from "@capacitor/local-notifications";
import { Capacitor } from "@capacitor/core";

const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, "") ?? "";

interface ScheduleItem {
  id: number;
  title: string;
  body: string;
  at: Date;
}

function addItem(items: ScheduleItem[], counter: { val: number }, title: string, body: string, at: Date) {
  if (at > new Date()) {
    items.push({ id: counter.val++, title, body, at });
  }
}

function getNextSundays(count: number): Date[] {
  const sundays: Date[] = [];
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  const daysToSunday = d.getDay() === 0 ? 7 : 7 - d.getDay();
  d.setDate(d.getDate() + daysToSunday);
  for (let i = 0; i < count; i++) {
    sundays.push(new Date(d));
    d.setDate(d.getDate() + 7);
  }
  return sundays;
}

/**
 * Request notification permission, fetch the schedule from the server, cancel
 * stale notifications, and reschedule everything fresh.
 *
 * Safe to call on every app start and every Capacitor resume event — it always
 * cancels existing notifications before rescheduling so there are no duplicates.
 */
export async function scheduleAllNotifications(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;

  const { display } = await LocalNotifications.requestPermissions();
  if (display !== "granted") return;

  // Cancel all previously scheduled notifications
  const { notifications: pending } = await LocalNotifications.getPending();
  if (pending.length > 0) {
    await LocalNotifications.cancel({ notifications: pending });
  }

  // Fetch schedule from server
  const token = localStorage.getItem("dcl_token_jwt");
  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;

  let data: {
    meetings: Array<{ id: number; title: string; scheduledAt: string; location?: string | null }>;
    events: Array<{ id: number; title: string; date: string; time: string; location?: string | null; category?: string | null }>;
    birthdays: Array<{ id: number; fullName: string; birthday: string }>;
    tasks: Array<{ id: number; title: string; dueDate: string; priority?: string | null }>;
  };

  try {
    const res = await fetch(`${API_BASE}/api/notifications/schedule`, {
      credentials: "include",
      headers,
    });
    if (!res.ok) return;
    data = await res.json();
  } catch {
    return;
  }

  const now = new Date();
  const items: ScheduleItem[] = [];
  const counter = { val: 2000 };

  // ── Meetings ──────────────────────────────────────────────────────────────
  for (const m of data.meetings ?? []) {
    const at = new Date(m.scheduledAt);
    if (isNaN(at.getTime())) continue;
    const venue = m.location ? ` — ${m.location}` : "";
    addItem(items, counter, "📅 Meeting Tomorrow", `${m.title}${venue}`,
      new Date(at.getTime() - 24 * 60 * 60 * 1000));
    addItem(items, counter, "⏰ Meeting in 1 Hour", `${m.title}${venue}`,
      new Date(at.getTime() - 60 * 60 * 1000));
  }

  // ── Events ────────────────────────────────────────────────────────────────
  for (const e of data.events ?? []) {
    const at = new Date(`${e.date}T${e.time}`);
    if (isNaN(at.getTime())) continue;
    const venue = e.location ? ` — ${e.location}` : "";
    const isService = (e.category ?? "").toLowerCase() === "service";
    const icon = isService ? "⛪" : "🎉";
    addItem(items, counter, "📅 Event Tomorrow", `${e.title}${venue}`,
      new Date(at.getTime() - 24 * 60 * 60 * 1000));
    addItem(items, counter, `${icon} Starting in 1 Hour`, `${e.title}${venue}`,
      new Date(at.getTime() - 60 * 60 * 1000));
  }

  // ── Birthdays — 7am on the day ────────────────────────────────────────────
  for (const b of data.birthdays ?? []) {
    const raw = new Date(b.birthday);
    if (isNaN(raw.getTime())) continue;
    const yr = now.getFullYear();
    let at = new Date(yr, raw.getMonth(), raw.getDate(), 7, 0, 0);
    if (at <= now) at = new Date(yr + 1, raw.getMonth(), raw.getDate(), 7, 0, 0);
    addItem(items, counter, "🎂 Birthday Today!",
      `Today is ${b.fullName}'s birthday — take a moment to celebrate them!`, at);
  }

  // ── Tasks — 8am on the due date ───────────────────────────────────────────
  for (const t of data.tasks ?? []) {
    if (!t.dueDate) continue;
    const at = new Date(`${t.dueDate}T08:00:00`);
    const urgent = t.priority === "high" || t.priority === "urgent";
    addItem(items, counter,
      urgent ? "🔴 Urgent Task Due Today" : "📋 Task Due Today",
      t.title, at);
  }

  // ── Sunday service reminders (1 h before a 10am service) ─────────────────
  // Only added when no explicit service event is already scheduled, so we
  // don't double-notify on weeks where an event was created in the system.
  const hasServiceEvent = (data.events ?? []).some(
    e => (e.category ?? "").toLowerCase() === "service",
  );
  if (!hasServiceEvent) {
    for (const sunday of getNextSundays(4)) {
      const nineAm = new Date(sunday);
      nineAm.setHours(9, 0, 0, 0);
      addItem(items, counter, "⛪ Sunday Service",
        "Sunday service starts in 1 hour. See you at church!", nineAm);
    }
  }

  if (items.length === 0) return;

  await LocalNotifications.schedule({
    notifications: items.map(n => ({
      id: n.id,
      title: n.title,
      body: n.body,
      schedule: { at: n.at },
      sound: "default",
      smallIcon: "ic_stat_notification",
      channelId: "dcl-reminders",
    })),
  });
}
