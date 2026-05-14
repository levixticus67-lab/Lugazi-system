import { Router } from "express";
import { eq, desc } from "drizzle-orm";
import { db, pipelineTable, usersTable } from "@workspace/db";
import { requireAuth, requireRole, AuthRequest } from "../middlewares/auth";

const router = Router();

router.get("/pipeline", requireAuth, requireRole(["admin", "leadership"]), async (_req, res): Promise<void> => {
  const contacts = await db.select().from(pipelineTable).orderBy(desc(pipelineTable.createdAt));
  res.json(contacts.map(c => ({ ...c, createdAt: c.createdAt.toISOString(), updatedAt: c.updatedAt.toISOString(), lastContactedAt: c.lastContactedAt?.toISOString() ?? null })));
});

router.post("/pipeline", requireAuth, requireRole(["admin", "leadership"]), async (req: AuthRequest, res): Promise<void> => {
  const { name, phone, email, stage, notes, source, branchId } = req.body;
  if (!name || !phone || !stage || !source || !branchId) {
    res.status(400).json({ error: "name, phone, stage, source, branchId required" }); return;
  }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!)).limit(1);
  const [contact] = await db.insert(pipelineTable).values({ name, phone, email, stage, notes, source, branchId, assignedTo: req.userId!, assignedToName: user?.displayName ?? null }).returning();
  res.status(201).json({ ...contact, createdAt: contact.createdAt.toISOString(), updatedAt: contact.updatedAt.toISOString(), lastContactedAt: contact.lastContactedAt?.toISOString() ?? null });
});

router.patch("/pipeline/:id", requireAuth, requireRole(["admin", "leadership"]), async (req, res): Promise<void> => {
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
  res.json({ ...updated, createdAt: updated.createdAt.toISOString(), updatedAt: updated.updatedAt.toISOString(), lastContactedAt: updated.lastContactedAt?.toISOString() ?? null });
});

router.delete("/pipeline/:id", requireAuth, requireRole(["admin", "leadership"]), async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }
  await db.delete(pipelineTable).where(eq(pipelineTable.id, id));
  res.sendStatus(204);
});

export default router;
