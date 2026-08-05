import { Router } from "express";
import { eq, desc } from "drizzle-orm";
import { db, testimoniesTable } from "@workspace/db";
import { requireAuth, AuthRequest } from "../middlewares/auth";
import { logActivity } from "../lib/activityLog";

const router = Router();

router.get("/testimonies", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const memberId = req.query.memberId ? Number(req.query.memberId) : undefined;
  let query = db.select().from(testimoniesTable).orderBy(desc(testimoniesTable.createdAt)).$dynamic();
  if (memberId) query = query.where(eq(testimoniesTable.memberId, memberId));
  const records = await query;
  res.json(records.map(r => ({ ...r, createdAt: r.createdAt.toISOString() })));
});

// auth — any member can share a testimony
router.post("/testimonies", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const { memberId, memberName, title, content, category, isPublic } = req.body;
  if (!memberName || !title || !content) { res.status(400).json({ error: "memberName, title, content required" }); return; }
  const [record] = await db.insert(testimoniesTable).values({
    memberId: memberId ? Number(memberId) : undefined,
    memberName, title, content,
    category: category || "other",
    isPublic: isPublic !== false,
  }).returning();
  await logActivity({
    userId: req.userId,
    action: "submit_testimony",
    entityType: "testimony",
    entityId: record.id,
    entityName: title,
    details: `By: ${memberName}`,
    ipAddress: req.ip ?? "unknown",
  });
  res.status(201).json({ ...record, createdAt: record.createdAt.toISOString() });
});

// auth (typically admin/pastor/leadership who reviews)
router.patch("/testimonies/:id/approve", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const id = Number(req.params.id);
  const [record] = await db.update(testimoniesTable).set({ isApproved: true }).where(eq(testimoniesTable.id, id)).returning();
  if (!record) { res.status(404).json({ error: "Not found" }); return; }
  // admin + pastor + leadership
  await logActivity({
    userId: req.userId,
    action: "approve_testimony",
    entityType: "testimony",
    entityId: id,
    entityName: record.title,
    details: `By: ${record.memberName}`,
    ipAddress: req.ip ?? "unknown",
  });
  res.json({ ...record, createdAt: record.createdAt.toISOString() });
});

// auth
router.delete("/testimonies/:id", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const id = Number(req.params.id);
  const [existing] = await db.select({ title: testimoniesTable.title, memberName: testimoniesTable.memberName })
    .from(testimoniesTable).where(eq(testimoniesTable.id, id)).limit(1);
  await db.delete(testimoniesTable).where(eq(testimoniesTable.id, id));
  await logActivity({
    userId: req.userId,
    action: "delete_testimony",
    entityType: "testimony",
    entityId: id,
    entityName: existing?.title,
    details: existing?.memberName ? `By: ${existing.memberName}` : undefined,
    ipAddress: req.ip ?? "unknown",
  });
  res.json({ success: true });
});

export default router;
