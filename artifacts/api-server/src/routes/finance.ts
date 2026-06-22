import { Router } from "express";
import { eq, desc } from "drizzle-orm";
import { db, transactionsTable } from "@workspace/db";
import { requireAuth, requireRole, AuthRequest } from "../middlewares/auth";
import { logActivity } from "../lib/activityLog";

const router = Router();

// FIX: added pagination limit — unbounded query degrades at scale
router.get("/finance", requireAuth, requireRole(["admin"]), async (req, res): Promise<void> => {
  const page = Math.max(0, Number((req.query.page as string) ?? 0));
  const limit = 200;
  const transactions = await db.select().from(transactionsTable)
    .orderBy(desc(transactionsTable.date))
    .limit(limit)
    .offset(page * limit);
  res.json(transactions.map(t => ({ ...t, amount: Number(t.amount), createdAt: t.createdAt.toISOString() })));
});

router.post("/finance", requireAuth, requireRole(["admin"]), async (req: AuthRequest, res): Promise<void> => {
  const { type, amount, currency, memberId, memberName, description, category, branchId, date } = req.body;
  if (!type || !amount || !description || !category || !date) {
    res.status(400).json({ error: "type, amount, description, category, date required" }); return;
  }
  const [tx] = await db.insert(transactionsTable).values({
    type, amount: String(amount), currency: currency || "UGX",
    memberId, memberName, description, category,
    branchId, recordedBy: req.userId, date,
  }).returning();

  await logActivity({
    userId: req.userId,
    displayName: `User #${req.userId}`,
    action: "create_transaction",
    entityType: "transaction",
    entityId: tx.id,
    entityName: description,
    details: `${type} — ${currency || "UGX"} ${amount}`,
    ipAddress: req.ip ?? "unknown",
  });

  res.status(201).json({ ...tx, amount: Number(tx.amount), createdAt: tx.createdAt.toISOString() });
});

router.get("/finance/summary", requireAuth, requireRole(["admin", "leadership"]), async (_req, res): Promise<void> => {
  const all = await db.select().from(transactionsTable);
  const now = new Date();
  const thisMonth = now.getMonth();
  const lastMonth = thisMonth === 0 ? 11 : thisMonth - 1;

  const income = all.filter(t => !["expense"].includes(t.type));
  const expenses = all.filter(t => t.type === "expense");
  const tithes = all.filter(t => t.type === "tithe");
  const offerings = all.filter(t => t.type === "offering");
  const donations = all.filter(t => t.type === "donation");

  const sumAmount = (arr: typeof all) => arr.reduce((s, t) => s + Number(t.amount), 0);
  const byMonth = (arr: typeof all, m: number) => arr.filter(t => new Date(t.date).getMonth() === m);

  res.json({
    totalIncome: sumAmount(income),
    totalExpenses: sumAmount(expenses),
    netBalance: sumAmount(income) - sumAmount(expenses),
    tithes: sumAmount(tithes),
    offerings: sumAmount(offerings),
    donations: sumAmount(donations),
    thisMonth: sumAmount(byMonth(income, thisMonth)),
    lastMonth: sumAmount(byMonth(income, lastMonth)),
  });
});

router.delete("/finance/:id", requireAuth, requireRole(["admin"]), async (req: AuthRequest, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }

  const [tx] = await db.select().from(transactionsTable).where(eq(transactionsTable.id, id)).limit(1);
  await db.delete(transactionsTable).where(eq(transactionsTable.id, id));

  await logActivity({
    userId: req.userId,
    displayName: `User #${req.userId}`,
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
