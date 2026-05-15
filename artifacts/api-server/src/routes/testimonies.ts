import { Router } from "express";
import { eq, desc } from "drizzle-orm";
import { db, testimoniesTable } from "@workspace/db";
import { requireAuth, AuthRequest } from "../middlewares/auth";

const router = Router();

router.get("/testimonies", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const memberId = req.query.memberId ? Number(req.query.memberId) : undefined;
  let query = db.select().from(testimoniesTable).orderBy(desc(testimoniesTable.createdAt)).$dynamic();
  if (memberId) query = query.where(eq(testimoniesTable.memberId, memberId));
  const records = await query;
  res.json(records.map(r => ({ ...r, createdAt: r.createdAt.toISOString() })));
});

router.post("/testimonies", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const { memberId, memberName, title, content, category, isPublic } = req.body;
  if (!memberName || !title || !content) { res.status(400).json({ error: "memberName, title, content required" }); return; }
  const [record] = await db.insert(testimoniesTable).values({
    memberId: memberId ? Number(memberId) : undefined,
    memberName, title, content,
    category: category || "other",
    isPublic: isPublic !== false,
  }).returning();
  res.status(201).json({ ...record, createdAt: record.createdAt.toISOString() });
});

router.patch("/testimonies/:id/approve", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const [record] = await db.update(testimoniesTable).set({ isApproved: true }).where(eq(testimoniesTable.id, Number(req.params.id))).returning();
  if (!record) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ ...record, createdAt: record.createdAt.toISOString() });
});

router.delete("/testimonies/:id", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  await db.delete(testimoniesTable).where(eq(testimoniesTable.id, Number(req.params.id)));
  res.json({ success: true });
});

export default router;
