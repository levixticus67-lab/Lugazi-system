import { Router } from "express";
import { eq, desc, sql } from "drizzle-orm";
import { db, transactionsTable, usersTable } from "@workspace/db";
import { requireAuth, requireRole, AuthRequest } from "../middlewares/auth";
import { logActivity } from "../lib/activityLog";

const router = Router();

// FIX: added pagination limit — unbounded query degrades at scale
router.get("/finance", requireAuth, requireRole(["admin", "pastor"]), async (req, res): Promise<void> => {
  const page = Math.max(0, Number((req.query.page as string) ?? 0));
  const limit = 200;
  const transactions = await db.select().from(transactionsTable)
    .orderBy(desc(transactionsTable.date))
    .limit(limit)
    .offset(page * limit);
  res.json(transactions.map(t => ({ ...t, amount: Number(t.amount), createdAt: t.createdAt.toISOString() })));
});

router.post("/finance", requireAuth, requireRole(["admin", "pastor"]), async (req: AuthRequest, res): Promise<void> => {
  const { type, amount, currency, memberId, memberName, description, category, branchId, date } = req.body;
  if (!type || !amount || !description || !category || !date) {
    res.status(400).json({ error: "type, amount, description, category, date required" }); return;
  }
  const [tx] = await db.insert(transactionsTable).values({
    type, amount: String(amount), currency: currency || "UGX",
    memberId, memberName, description, category,
    branchId, recordedBy: req.userId, date,
  }).returning();

  const [finActor] = await db.select({ displayName: usersTable.displayName }).from(usersTable).where(eq(usersTable.id, req.userId!)).limit(1);
  await logActivity({
    userId: req.userId,
    displayName: finActor?.displayName ?? `User #${req.userId}`,
    action: "create_transaction",
    entityType: "transaction",
    entityId: tx.id,
    entityName: description,
    details: `${type} — ${currency || "UGX"} ${amount}`,
    ipAddress: req.ip ?? "unknown",
  });

  res.status(201).json({ ...tx, amount: Number(tx.amount), createdAt: tx.createdAt.toISOString() });
});

// FIX: rewrote with a single SQL aggregate query — no longer loads every row into memory.
// Previous version did db.select().from(transactionsTable) with no limit, which would
// crash the server under high data volume.
router.get("/finance/summary", requireAuth, requireRole(["admin", "pastor", "leadership"]), async (_req, res): Promise<void> => {
  const now = new Date();
  const thisYear  = now.getFullYear();
  const thisMonth = now.getMonth() + 1; // SQL EXTRACT months are 1-indexed
  const lastMonth     = thisMonth === 1 ? 12 : thisMonth - 1;
  const lastMonthYear = thisMonth === 1 ? thisYear - 1 : thisYear;

  const [totals] = await db.select({
    totalIncome:   sql<string>`COALESCE(SUM(CASE WHEN type != 'expense' THEN amount::numeric ELSE 0 END), 0)`,
    totalExpenses: sql<string>`COALESCE(SUM(CASE WHEN type = 'expense'  THEN amount::numeric ELSE 0 END), 0)`,
    tithes:        sql<string>`COALESCE(SUM(CASE WHEN type = 'tithe'    THEN amount::numeric ELSE 0 END), 0)`,
    offerings:     sql<string>`COALESCE(SUM(CASE WHEN type = 'offering' THEN amount::numeric ELSE 0 END), 0)`,
    donations:     sql<string>`COALESCE(SUM(CASE WHEN type = 'donation' THEN amount::numeric ELSE 0 END), 0)`,
    thisMonth: sql<string>`COALESCE(SUM(
      CASE WHEN type != 'expense'
        AND EXTRACT(MONTH FROM date::date) = ${thisMonth}
        AND EXTRACT(YEAR  FROM date::date) = ${thisYear}
      THEN amount::numeric ELSE 0 END
    ), 0)`,
    lastMonth: sql<string>`COALESCE(SUM(
      CASE WHEN type != 'expense'
        AND EXTRACT(MONTH FROM date::date) = ${lastMonth}
        AND EXTRACT(YEAR  FROM date::date) = ${lastMonthYear}
      THEN amount::numeric ELSE 0 END
    ), 0)`,
  }).from(transactionsTable);

  const income   = Number(totals.totalIncome);
  const expenses = Number(totals.totalExpenses);

  res.json({
    totalIncome:   income,
    totalExpenses: expenses,
    netBalance:    income - expenses,
    tithes:        Number(totals.tithes),
    offerings:     Number(totals.offerings),
    donations:     Number(totals.donations),
    thisMonth:     Number(totals.thisMonth),
    lastMonth:     Number(totals.lastMonth),
  });
});

router.delete("/finance/:id", requireAuth, requireRole(["admin", "pastor"]), async (req: AuthRequest, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }

  const [tx] = await db.select().from(transactionsTable).where(eq(transactionsTable.id, id)).limit(1);
  await db.delete(transactionsTable).where(eq(transactionsTable.id, id));

  const [delActor] = await db.select({ displayName: usersTable.displayName }).from(usersTable).where(eq(usersTable.id, req.userId!)).limit(1);
  await logActivity({
    userId: req.userId,
    displayName: delActor?.displayName ?? `User #${req.userId}`,
    action: "delete_transaction",
    entityType: "transaction",
    entityId: id,
    entityName: tx?.description ?? `Transaction #${id}`,
    details: tx ? `${tx.type} — ${tx.currency} ${tx.amount}` : undefined,
    ipAddress: req.ip ?? "unknown",
  });

  res.sendStatus(204);
});

export default router;
