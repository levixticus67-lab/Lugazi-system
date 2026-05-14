import { Router } from "express";
import { eq, desc } from "drizzle-orm";
import { db, reportsTable, usersTable } from "@workspace/db";
import { requireAuth, requireRole, AuthRequest } from "../middlewares/auth";

const router = Router();

router.get("/reports", requireAuth, requireRole(["admin", "leadership", "workforce"]), async (_req, res): Promise<void> => {
  const reports = await db.select().from(reportsTable).orderBy(desc(reportsTable.createdAt));
  res.json(reports.map(r => ({ ...r, createdAt: r.createdAt.toISOString(), updatedAt: r.updatedAt.toISOString() })));
});

router.post("/reports", requireAuth, requireRole(["admin", "leadership", "workforce"]), async (req: AuthRequest, res): Promise<void> => {
  const { title, type, content, period, branchId, attendance, soulWinning } = req.body;
  if (!title || !type || !content || !period) {
    res.status(400).json({ error: "title, type, content, period required" }); return;
  }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!)).limit(1);
  const [report] = await db.insert(reportsTable).values({
    title, type, content, period,
    submittedBy: req.userId!, submittedByName: user?.displayName ?? null,
    branchId, attendance, soulWinning, status: "draft",
  }).returning();
  res.status(201).json({ ...report, createdAt: report.createdAt.toISOString(), updatedAt: report.updatedAt.toISOString() });
});

router.patch("/reports/:id", requireAuth, requireRole(["admin", "leadership"]), async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }
  const { content, attendance, soulWinning, status } = req.body;
  const updateData: Record<string, unknown> = {};
  if (content !== undefined) updateData.content = content;
  if (attendance !== undefined) updateData.attendance = attendance;
  if (soulWinning !== undefined) updateData.soulWinning = soulWinning;
  if (status !== undefined) updateData.status = status;
  const [updated] = await db.update(reportsTable).set(updateData).where(eq(reportsTable.id, id)).returning();
  if (!updated) { res.status(404).json({ error: "Report not found" }); return; }
  res.json({ ...updated, createdAt: updated.createdAt.toISOString(), updatedAt: updated.updatedAt.toISOString() });
});

export default router;
