import { Router } from "express";
import { gte, lte, and, eq, isNotNull, ne, or } from "drizzle-orm";
import { db, meetingsTable, eventsTable, membersTable, tasksTable } from "@workspace/db";
import { requireAuth, AuthRequest } from "../middlewares/auth";

const router = Router();

// GET /notifications/schedule
// Returns upcoming items the Capacitor native app uses to schedule local
// notifications.  Scoped to the authenticated user's role and assignments.
router.get("/notifications/schedule", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const now = new Date();
  const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const todayStr = now.toISOString().slice(0, 10);
  const in7DaysStr = in7Days.toISOString().slice(0, 10);

  // Meetings: next 7 days, scoped to the user's portal.
  // Admins and pastors see all meetings.
  const role = req.userRole ?? "member";
  const meetingWhere = and(
    gte(meetingsTable.scheduledAt, now),
    lte(meetingsTable.scheduledAt, in7Days),
    ne(meetingsTable.status, "cancelled"),
    role === "admin" || role === "pastor"
      ? undefined
      : eq(meetingsTable.portalTarget, role),
  );

  const [meetings, allEvents, birthdayMembers, myTasks] = await Promise.all([
    db.select({
      id: meetingsTable.id,
      title: meetingsTable.title,
      scheduledAt: meetingsTable.scheduledAt,
      location: meetingsTable.location,
    })
      .from(meetingsTable)
      .where(meetingWhere),

    // Events: fetch all then filter by date string (stored as text "YYYY-MM-DD")
    db.select({
      id: eventsTable.id,
      title: eventsTable.title,
      date: eventsTable.date,
      time: eventsTable.time,
      location: eventsTable.location,
      category: eventsTable.category,
    }).from(eventsTable),

    // Members with birthdays so we can check who has one in the next 7 days
    db.select({
      id: membersTable.id,
      fullName: membersTable.fullName,
      birthday: membersTable.birthday,
    })
      .from(membersTable)
      .where(isNotNull(membersTable.birthday)),

    // Tasks assigned to this user that are pending or in-progress with a due date
    db.select({
      id: tasksTable.id,
      title: tasksTable.title,
      dueDate: tasksTable.dueDate,
      priority: tasksTable.priority,
    })
      .from(tasksTable)
      .where(
        and(
          eq(tasksTable.assignedToUserId, req.userId!),
          isNotNull(tasksTable.dueDate),
          or(
            eq(tasksTable.status, "pending"),
            eq(tasksTable.status, "in_progress"),
          ),
        ),
      ),
  ]);

  // Filter events to the next 7-day window via string comparison
  const events = allEvents.filter(e => e.date >= todayStr && e.date <= in7DaysStr);

  // Filter tasks to the next 7-day window
  const tasks = myTasks.filter(t => t.dueDate && t.dueDate >= todayStr && t.dueDate <= in7DaysStr);

  // Filter birthdays to the next 7 days (birthday stored as "YYYY-MM-DD";
  // we only compare the MM-DD portion against the next 7 calendar days)
  const upcomingBirthdays = birthdayMembers.filter(m => {
    if (!m.birthday) return false;
    try {
      const bday = new Date(m.birthday);
      if (isNaN(bday.getTime())) return false;
      const thisYear = now.getFullYear();
      let candidate = new Date(thisYear, bday.getMonth(), bday.getDate());
      if (candidate < now) candidate = new Date(thisYear + 1, bday.getMonth(), bday.getDate());
      return candidate.getTime() - now.getTime() <= 7 * 24 * 60 * 60 * 1000;
    } catch {
      return false;
    }
  });

  res.json({
    meetings: meetings.map(m => ({ ...m, scheduledAt: m.scheduledAt.toISOString() })),
    events,
    birthdays: upcomingBirthdays,
    tasks,
  });
});

export default router;
