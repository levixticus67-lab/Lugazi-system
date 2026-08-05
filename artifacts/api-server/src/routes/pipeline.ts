import { Router } from "express";
import { eq, desc } from "drizzle-orm";
import { db, pipelineTable, usersTable } from "@workspace/db";
import { requireAuth, requireRole, AuthRequest } from "../middlewares/auth";
import { logActivity } from "../lib/activityLog";

const router = Router();

// admin + pastor + leadership
router.get("/pipeline", requireAuth, requireRole(["admin", "pastor", "leadership"]), async (_req, res): Promise<void> => {
  const contacts = await db.select().from(pipelineTable).orderBy(desc(pipelineTable.createdAt));
  res.json(contacts.map(c => ({ ...c, createdAt: c.createdAt.toISOString(), updatedAt: c.updatedAt.toISOString(), lastContactedAt: c.lastContactedAt?.toISOString() ?? null })));
});

// admin + pastor + leadership
router.post("/pipeline", requireAuth, requireRole(["admin", "pastor", "leadership"]), async (req: AuthRequest, res): Promise<void> => {
  const { name, phone, email, stage, notes, source, branchId } = req.body;
  if (!name || !phone || !stage || !source || !branchId) {
    res.status(400).json({ error: "name, phone, stage, source, branchId required" }); return;
  }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!)).limit(1);
  const [contact] = await db.insert(pipelineTable).values({ name, phone, email, stage, notes, source, branchId, assignedTo: req.userId!, assignedToName: user?.displayName ?? null }).returning();
  await logActivity({
    userId: req.userId,
    action: "pipeline_contact_added",
    entityType: "pipeline",
    entityId: contact.id,
    entityName: name,
    details: `Stage: ${stage} | Source: ${source}`,
    ipAddress: req.ip ?? "unknown",
  });
  res.status(201).json({ ...contact, createdAt: contact.createdAt.toISOString(), updatedAt: contact.updatedAt.toISOString(), lastContactedAt: contact.lastContactedAt?.toISOString() ?? null });
});

// admin + pastor + leadership
router.patch("/pipeline/:id", requireAuth, requireRole(["admin", "pastor", "leadership"]), async (req: AuthRequest, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }
  const { stage, notes, lastContactedAt } = req.body;
  const updateData: Record<string, unknown> = {};
  if (stage !== undefined) updateData.stage = stage;
  if (notes !== undefined) updateData.notes = notes;
  if (lastContactedAt !== undefined) updateData.lastContactedAt = new Date(lastContactedAt);
  const [updated] = await db.update(pipelineTable).set(updateData).where(eq(pipelineTable.id, id)).returning();
  if (!updated) { res.status(404).json({ error: "Contact not found" }); return; }
  const details = stage !== undefined ? `Stage updated to: ${stage}` : "Contact details updated";
  await logActivity({
    userId: req.userId,
    action: "pipeline_contact_updated",
    entityType: "pipeline",
    entityId: id,
    entityName: updated.name,
    details,
    ipAddress: req.ip ?? "unknown",
  });
  res.json({ ...updated, createdAt: updated.createdAt.toISOString(), updatedAt: updated.updatedAt.toISOString(), lastContactedAt: updated.lastContactedAt?.toISOString() ?? null });
});

// admin + pastor + leadership
router.delete("/pipeline/:id", requireAuth, requireRole(["admin", "pastor", "leadership"]), async (req: AuthRequest, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }
  const [existing] = await db.select({ name: pipelineTable.name }).from(pipelineTable).where(eq(pipelineTable.id, id)).limit(1);
  await db.delete(pipelineTable).where(eq(pipelineTable.id, id));
  await logActivity({
    userId: req.userId,
    action: "pipeline_contact_deleted",
    entityType: "pipeline",
    entityId: id,
    entityName: existing?.name,
    ipAddress: req.ip ?? "unknown",
  });
  res.sendStatus(204);
});

export default router;
