import { Router } from "express";
import { eq } from "drizzle-orm";
import { db, branchesTable } from "@workspace/db";
import { requireAuth, requireRole } from "../middlewares/auth";

const router = Router();

router.get("/branches", requireAuth, async (_req, res): Promise<void> => {
  const branches = await db.select().from(branchesTable).orderBy(branchesTable.name);
  res.json(branches.map(b => ({ ...b, createdAt: b.createdAt.toISOString(), updatedAt: b.updatedAt.toISOString() })));
});

router.post("/branches", requireAuth, requireRole(["admin"]), async (req, res): Promise<void> => {
  const { name, location, leaderName } = req.body;
  if (!name || !location) { res.status(400).json({ error: "name and location required" }); return; }
  const [branch] = await db.insert(branchesTable).values({ name, location, leaderName }).returning();
  res.status(201).json({ ...branch, createdAt: branch.createdAt.toISOString(), updatedAt: branch.updatedAt.toISOString() });
});

router.patch("/branches/:id", requireAuth, requireRole(["admin"]), async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }
  const { name, location, leaderName } = req.body;
  const updateData: Record<string, unknown> = {};
  if (name !== undefined) updateData.name = name;
  if (location !== undefined) updateData.location = location;
  if (leaderName !== undefined) updateData.leaderName = leaderName;
  const [updated] = await db.update(branchesTable).set(updateData).where(eq(branchesTable.id, id)).returning();
  if (!updated) { res.status(404).json({ error: "Branch not found" }); return; }
  res.json({ ...updated, createdAt: updated.createdAt.toISOString(), updatedAt: updated.updatedAt.toISOString() });
});

router.delete("/branches/:id", requireAuth, requireRole(["admin"]), async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }
  await db.delete(branchesTable).where(eq(branchesTable.id, id));
  res.sendStatus(204);
});

export default router;
