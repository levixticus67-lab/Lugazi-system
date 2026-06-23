import { Router } from "express";
import { desc, eq, sql } from "drizzle-orm";
import { db, contributionsTable } from "@workspace/db";
import { requireAuth, requireRole, AuthRequest } from "../middlewares/auth";

const router = Router();

// FIX: restricted to leadership+ — regular members must not see all financial contributions
router.get("/giving", requireAuth, requireRole(["admin", "pastor", "leadership"]), async (req: AuthRequest, res): Promise<void> => {
  const memberId = req.query.memberId ? Number(req.query.memberId) : undefined;
  let query = db.select().from(contributionsTable).orderBy(desc(contributionsTable.createdAt)).limit(500).$dynamic();
  if (memberId) query = query.where(eq(contributionsTable.memberId, memberId));
  const records = await query;
  res.json(records.map(r => ({ ...r, createdAt: r.createdAt.toISOString() })));
});

// FIX: restricted to leadership+ — financial summary is sensitive
router.get("/giving/summary", requireAuth, requireRole(["admin", "pastor", "leadership"]), async (_req, res): Promise<void> => {
  const rows = await db.select({
    type: contributionsTable.type,
    total: sql<number>`SUM(${contributionsTable.amount})`,
    count: sql<number>`COUNT(*)`,
  }).from(contributionsTable).groupBy(contributionsTable.type);
  res.json(rows);
});

// FIX: restricted to leadership+ — only authorised staff may record contributions
router.post("/giving", requireAuth, requireRole(["admin", "pastor", "leadership"]), async (req: AuthRequest, res): Promise<void> => {
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

// FIX: restricted to admin only — deleting financial records is a destructive admin action
router.delete("/giving/:id", requireAuth, requireRole(["admin", "pastor"]), async (req: AuthRequest, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }
  await db.delete(contributionsTable).where(eq(contributionsTable.id, id));
  res.json({ success: true });
});

export default router;
