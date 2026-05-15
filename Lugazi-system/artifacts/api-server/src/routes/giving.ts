import { Router } from "express";
import { desc, eq, and, sql } from "drizzle-orm";
import { db, contributionsTable } from "@workspace/db";
import { requireAuth, AuthRequest } from "../middlewares/auth";

const router = Router();

router.get("/giving", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const memberId = req.query.memberId ? Number(req.query.memberId) : undefined;
  let query = db.select().from(contributionsTable).orderBy(desc(contributionsTable.createdAt)).$dynamic();
  if (memberId) query = query.where(eq(contributionsTable.memberId, memberId));
  const records = await query;
  res.json(records.map(r => ({ ...r, createdAt: r.createdAt.toISOString() })));
});

router.get("/giving/summary", requireAuth, async (_req, res): Promise<void> => {
  const rows = await db.select({
    type: contributionsTable.type,
    total: sql<number>`SUM(${contributionsTable.amount})`,
    count: sql<number>`COUNT(*)`,
  }).from(contributionsTable).groupBy(contributionsTable.type);
  res.json(rows);
});

router.post("/giving", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const { memberId, memberName, email, type, amount, currency, reference, notes } = req.body;
  if (!memberName || !amount || !type) { res.status(400).json({ error: "memberName, amount, and type required" }); return; }
  const [record] = await db.insert(contributionsTable).values({
    memberId: memberId ? Number(memberId) : undefined,
    memberName, email, type, amount: Number(amount),
    currency: currency || "UGX",
    reference, notes,
    recordedBy: req.userId,
  }).returning();
  res.status(201).json({ ...record, createdAt: record.createdAt.toISOString() });
});

router.delete("/giving/:id", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  await db.delete(contributionsTable).where(eq(contributionsTable.id, Number(req.params.id)));
  res.json({ success: true });
});

export default router;
