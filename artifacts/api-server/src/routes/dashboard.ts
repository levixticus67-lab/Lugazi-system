import { Router } from "express";
import { sql, eq, desc } from "drizzle-orm";
import {
  db, usersTable, membersTable, branchesTable, groupsTable,
  attendanceTable, transactionsTable, welfareTable, roleRequestsTable, eventsTable,
  activityLogsTable,
} from "@workspace/db";
import { requireAuth, requireRole, AuthRequest } from "../middlewares/auth";

const router = Router();

router.get("/dashboard/stats", requireAuth, requireRole(["admin", "leadership", "pastor"]), async (_req, res): Promise<void> => {
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

router.get("/dashboard/charts", requireAuth, requireRole(["admin", "leadership", "pastor"]), async (_req, res): Promise<void> => {
  const now = new Date();

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

  const allMembers = await db.select({ createdAt: membersTable.createdAt }).from(membersTable);
  const memberGrowth: { month: string; members: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const cutoff = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
    const count = allMembers.filter((m) => m.createdAt <= cutoff).length;
    const label = new Date(now.getFullYear(), now.getMonth() - i, 1).toLocaleDateString("en-UG", { month: "short" });
    memberGrowth.push({ month: label, members: count });
  }

  res.json({ weeklyAttendance, monthlyFinance, memberGrowth });
});

router.get("/dashboard/activity", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  if (!["admin", "leadership", "pastor"].includes(req.userRole ?? "")) {
    res.json([]);
    return;
  }

  const logs = await db
    .select()
    .from(activityLogsTable)
    .orderBy(desc(activityLogsTable.createdAt))
    .limit(10);

  function formatLog(l: typeof logs[number]): { description: string; icon: string } {
    const who = l.displayName;
    const entity = l.entityName ?? "";
    switch (l.action) {
      case "login":               return { description: `${who} logged in`,                                         icon: "user" };
      case "register":            return { description: `${who} registered an account`,                             icon: "user" };
      case "change_password":     return { description: `${who} changed their password`,                            icon: "user" };
      case "create_member":       return { description: `${who} added member: ${entity}`,                           icon: "user" };
      case "update_member":       return { description: `${who} updated member: ${entity}`,                         icon: "user" };
      case "delete_member":       return { description: `${who} removed member: ${entity}`,                         icon: "user" };
      case "change_role":         return { description: `${who} changed role — ${l.details ?? entity}`,             icon: "user" };
      case "deactivate_user":     return { description: `${who} deactivated user: ${entity}`,                       icon: "user" };
      case "create_event":        return { description: `${who} created event: ${entity}`,                          icon: "calendar" };
      case "delete_event":        return { description: `${who} deleted event: ${entity}`,                          icon: "calendar" };
      case "welfare_submitted":   return { description: `${who} submitted a welfare request`,                       icon: "heart" };
      case "welfare_updated":     return { description: `${who} ${l.details ?? "updated"} welfare: ${entity}`,      icon: "heart" };
      case "welfare_deleted":     return { description: `${who} removed welfare request: ${entity}`,                icon: "heart" };
      case "create_giving":       return { description: `${who} recorded giving: ${entity}`,                        icon: "calendar" };
      case "delete_giving":       return { description: `${who} deleted giving record: ${entity}`,                  icon: "calendar" };
      case "create_announcement": return { description: `${who} posted announcement: ${entity}`,                    icon: "calendar" };
      case "delete_announcement": return { description: `${who} removed announcement: ${entity}`,                   icon: "calendar" };
      case "create_transaction":  return { description: `${who} recorded transaction${entity ? ": " + entity : ""}`, icon: "calendar" };
      case "delete_transaction":  return { description: `${who} deleted transaction${entity ? ": " + entity : ""}`, icon: "calendar" };
      default:                    return { description: l.details ?? `${who}: ${l.action}`,                         icon: "activity" };
    }
  }

  res.json(
    logs.map((l) => {
      const { description, icon } = formatLog(l);
      return { type: l.action, description, date: l.createdAt.toISOString(), icon };
    })
  );
});


router.get("/dashboard/my-attendance", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const [member] = await db.select({ id: membersTable.id })
    .from(membersTable).where(eq(membersTable.userId, req.userId!)).limit(1);
  if (!member) { res.json([]); return; }
  const records = await db.select({ checkedInAt: attendanceTable.checkedInAt })
    .from(attendanceTable).where(eq(attendanceTable.memberId, member.id));
  const now = new Date();
  const result: { month: string; count: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const mNum = d.getMonth();
    const yNum = d.getFullYear();
    const count = records.filter(a => {
      const date = new Date(a.checkedInAt);
      return date.getMonth() === mNum && date.getFullYear() === yNum;
    }).length;
    result.push({ month: d.toLocaleDateString("en-UG", { month: "short" }), count });
  }
  res.json(result);
});

export default router;
