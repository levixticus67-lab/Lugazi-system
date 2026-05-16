import { Router } from "express";
import { sql, eq, desc } from "drizzle-orm";
import {
  db, usersTable, membersTable, branchesTable, groupsTable,
  attendanceTable, transactionsTable, welfareTable, roleRequestsTable, eventsTable,
} from "@workspace/db";
import { requireAuth, requireRole, AuthRequest } from "../middlewares/auth";

const router = Router();

router.get("/dashboard/stats", requireAuth, requireRole(["admin", "leadership"]), async (_req, res): Promise<void> => {
  const [totalMembersResult] = await db.select({ count: sql<number>`count(*)` }).from(membersTable);
  const [activeMembersResult] = await db.select({ count: sql<number>`count(*)` }).from(membersTable).where(eq(membersTable.isActive, true));
  const [branchesResult] = await db.select({ count: sql<number>`count(*)` }).from(branchesTable);
  const [groupsResult] = await db.select({ count: sql<number>`count(*)` }).from(groupsTable);

  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

  const allAttendance = await db.select().from(attendanceTable);
  const thisWeekAttendance = allAttendance.filter((a) => a.checkedInAt >= weekAgo).length;
  const lastWeekAttendance = allAttendance.filter((a) => a.checkedInAt >= twoWeeksAgo && a.checkedInAt < weekAgo).length;

  const allTransactions = await db.select().from(transactionsTable);
  const thisMonthNum = now.getMonth();
  const monthlyIncome = allTransactions
    .filter((t) => t.type !== "expense" && new Date(t.date).getMonth() === thisMonthNum)
    .reduce((s, t) => s + Number(t.amount), 0);
  const monthlyExpenses = allTransactions
    .filter((t) => t.type === "expense" && new Date(t.date).getMonth() === thisMonthNum)
    .reduce((s, t) => s + Number(t.amount), 0);

  const [pendingWelfareResult] = await db.select({ count: sql<number>`count(*)` }).from(welfareTable).where(eq(welfareTable.status, "pending"));
  const [pendingRoleRequestsResult] = await db.select({ count: sql<number>`count(*)` }).from(roleRequestsTable).where(eq(roleRequestsTable.status, "pending"));

  const upcomingEvents = await db.select().from(eventsTable);
  const upcoming = upcomingEvents.filter((e) => new Date(e.date) >= now).length;

  res.json({
    totalMembers: Number(totalMembersResult.count),
    activeMembers: Number(activeMembersResult.count),
    totalBranches: Number(branchesResult.count),
    totalGroups: Number(groupsResult.count),
    thisWeekAttendance,
    lastWeekAttendance,
    monthlyIncome,
    monthlyExpenses,
    pendingWelfare: Number(pendingWelfareResult.count),
    pendingRoleRequests: Number(pendingRoleRequestsResult.count),
    upcomingEvents: upcoming,
  });
});

router.get("/dashboard/member-stats", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const [member] = await db.select().from(membersTable).where(eq(membersTable.userId, req.userId!)).limit(1);

  let myAttendanceCount = 0;
  let myGivingTotal = 0;
  let pendingWelfareRequests = 0;

  if (member) {
    const myAttendance = await db.select().from(attendanceTable).where(eq(attendanceTable.memberId, member.id));
    myAttendanceCount = myAttendance.length;
    const myGiving = await db.select().from(transactionsTable).where(eq(transactionsTable.memberId, member.id));
    myGivingTotal = myGiving.reduce((s, t) => s + Number(t.amount), 0);
    const myWelfare = await db.select().from(welfareTable).where(eq(welfareTable.memberId, member.id));
    pendingWelfareRequests = myWelfare.filter((w) => w.status === "pending").length;
  }

  const now = new Date();
  const allEvents = await db.select().from(eventsTable);
  const upcomingEvents = allEvents.filter((e) => new Date(e.date) >= now).length;

  res.json({ myAttendanceCount, myGivingTotal, pendingWelfareRequests, upcomingEvents });
});

// Live chart data — weekly attendance (8 weeks) + monthly finance (6 months) + member growth (6 months)
router.get("/dashboard/charts", requireAuth, requireRole(["admin", "leadership"]), async (_req, res): Promise<void> => {
  const now = new Date();

  // ── Weekly attendance (last 8 full weeks) ─────────────────────────────────
  const allAttendance = await db.select({ checkedInAt: attendanceTable.checkedInAt }).from(attendanceTable);
  const weeklyAttendance: { week: string; count: number }[] = [];
  for (let i = 7; i >= 0; i--) {
    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - i * 7 - weekStart.getDay());
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);
    const count = allAttendance.filter((a) => a.checkedInAt >= weekStart && a.checkedInAt < weekEnd).length;
    const label = weekStart.toLocaleDateString("en-UG", { month: "short", day: "numeric" });
    weeklyAttendance.push({ week: label, count });
  }

  // ── Monthly finance (last 6 months) ──────────────────────────────────────
  const allTransactions = await db.select({ type: transactionsTable.type, amount: transactionsTable.amount, date: transactionsTable.date }).from(transactionsTable);
  const monthlyFinance: { month: string; income: number; expenses: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const mNum = d.getMonth();
    const yNum = d.getFullYear();
    const income = allTransactions
      .filter((t) => t.type !== "expense" && new Date(t.date).getMonth() === mNum && new Date(t.date).getFullYear() === yNum)
      .reduce((s, t) => s + Number(t.amount), 0);
    const expenses = allTransactions
      .filter((t) => t.type === "expense" && new Date(t.date).getMonth() === mNum && new Date(t.date).getFullYear() === yNum)
      .reduce((s, t) => s + Number(t.amount), 0);
    const label = d.toLocaleDateString("en-UG", { month: "short" });
    monthlyFinance.push({ month: label, income, expenses });
  }

  // ── Member growth (cumulative, last 6 months) ─────────────────────────────
  const allMembers = await db.select({ createdAt: membersTable.createdAt }).from(membersTable);
  const memberGrowth: { month: string; members: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const cutoff = new Date(now.getFullYear(), now.getMonth() - i + 1, 0); // last day of that month
    const count = allMembers.filter((m) => m.createdAt <= cutoff).length;
    const label = new Date(now.getFullYear(), now.getMonth() - i, 1).toLocaleDateString("en-UG", { month: "short" });
    memberGrowth.push({ month: label, members: count });
  }

  res.json({ weeklyAttendance, monthlyFinance, memberGrowth });
});

// Live recent activity feed — open to any authenticated admin/leadership user
// Pulls from members, users, transactions, welfare, events, attendance
router.get("/dashboard/activity", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const userRole = (req as any).userRole as string | undefined;
  // Only admin and leadership should see full activity
  if (userRole && !["admin", "leadership"].includes(userRole)) {
    res.json([]);
    return;
  }

  const [
    recentMembers,
    recentUsers,
    recentTransactions,
    recentWelfare,
    recentEvents,
    recentAttendance,
    recentRoleRequests,
  ] = await Promise.all([
    db.select({ id: membersTable.id, fullName: membersTable.fullName, createdAt: membersTable.createdAt })
      .from(membersTable).orderBy(desc(membersTable.createdAt)).limit(4),
    db.select({ id: usersTable.id, displayName: usersTable.displayName, createdAt: usersTable.createdAt })
      .from(usersTable).orderBy(desc(usersTable.createdAt)).limit(4),
    db.select({ id: transactionsTable.id, type: transactionsTable.type, amount: transactionsTable.amount, description: transactionsTable.description, category: transactionsTable.category, createdAt: transactionsTable.createdAt })
      .from(transactionsTable).orderBy(desc(transactionsTable.createdAt)).limit(4),
    db.select({ id: welfareTable.id, reason: welfareTable.reason, status: welfareTable.status, createdAt: welfareTable.createdAt })
      .from(welfareTable).orderBy(desc(welfareTable.createdAt)).limit(3),
    db.select({ id: eventsTable.id, title: eventsTable.title, createdAt: eventsTable.createdAt })
      .from(eventsTable).orderBy(desc(eventsTable.createdAt)).limit(3),
    db.select({ id: attendanceTable.id, memberId: attendanceTable.memberId, checkedInAt: attendanceTable.checkedInAt })
      .from(attendanceTable).orderBy(desc(attendanceTable.checkedInAt)).limit(3),
    db.select({ id: roleRequestsTable.id, requestedRole: roleRequestsTable.requestedRole, status: roleRequestsTable.status, createdAt: roleRequestsTable.createdAt })
      .from(roleRequestsTable).orderBy(desc(roleRequestsTable.createdAt)).limit(3),
  ]);

  type ActivityItem = { type: string; description: string; date: string; icon: string };

  const activities: ActivityItem[] = [
    ...recentMembers.map((m) => ({
      type: "member",
      description: `${m.fullName} joined as a church member`,
      date: m.createdAt.toISOString(),
      icon: "user",
    })),
    ...recentUsers
      .filter((u) => !recentMembers.some((m) => Math.abs(m.createdAt.getTime() - u.createdAt.getTime()) < 5000))
      .map((u) => ({
        type: "user",
        description: `${u.displayName ?? "New user"} registered an account`,
        date: u.createdAt.toISOString(),
        icon: "user",
      })),
    ...recentTransactions.map((t) => ({
      type: "transaction",
      description: `${t.type === "expense" ? "Expense" : "Income"}: UGX ${Number(t.amount).toLocaleString()} — ${t.description ?? t.category ?? "Finance record"}`,
      date: t.createdAt.toISOString(),
      icon: "wallet",
    })),
    ...recentWelfare.map((w) => ({
      type: "welfare",
      description: `Welfare request (${w.status}): ${w.reason ?? "Support needed"}`,
      date: w.createdAt.toISOString(),
      icon: "heart",
    })),
    ...recentEvents.map((e) => ({
      type: "event",
      description: `Event created: ${e.title}`,
      date: e.createdAt.toISOString(),
      icon: "calendar",
    })),
    ...recentAttendance.map((a) => ({
      type: "attendance",
      description: `Attendance check-in recorded`,
      date: a.checkedInAt.toISOString(),
      icon: "calendar",
    })),
    ...recentRoleRequests.map((r) => ({
      type: "role",
      description: `Role upgrade request: ${r.requestedRole} (${r.status})`,
      date: r.createdAt.toISOString(),
      icon: "user",
    })),
  ]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 10);

  res.json(activities);
});

export default router;
