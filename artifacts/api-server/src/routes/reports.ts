import { Router } from "express";
import { eq, desc } from "drizzle-orm";
import { db, reportsTable, usersTable } from "@workspace/db";
import { requireAuth, requireRole, AuthRequest } from "../middlewares/auth";

const router = Router();

// Admin sees all; pastor/leadership see only their own
router.get("/reports", requireAuth, requireRole(["admin", "pastor", "leadership"]), async (req: AuthRequest, res): Promise<void> => {
  try {
    const isAdmin = req.userRole === "admin";
    const rows = isAdmin
      ? await db.select().from(reportsTable).orderBy(desc(reportsTable.createdAt))
      : await db.select().from(reportsTable)
          .where(eq(reportsTable.submittedBy, req.userId!))
          .orderBy(desc(reportsTable.createdAt));
    res.json(rows.map(r => ({ ...r, createdAt: r.createdAt.toISOString(), updatedAt: r.updatedAt.toISOString() })));
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch reports" });
  }
});

// Only admin, pastor, leadership can submit reports
router.post("/reports", requireAuth, requireRole(["admin", "pastor", "leadership"]), async (req: AuthRequest, res): Promise<void> => {
  try {
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
  } catch (err) {
    res.status(500).json({ error: "Failed to submit report" });
  }
});

// Admin/pastor can update status (review reports); author can edit content
router.patch("/reports/:id", requireAuth, requireRole(["admin", "pastor", "leadership"]), async (req: AuthRequest, res): Promise<void> => {
  try {
    const id = parseInt(String(req.params.id), 10);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }

    const [existing] = await db.select().from(reportsTable).where(eq(reportsTable.id, id)).limit(1);
    if (!existing) { res.status(404).json({ error: "Report not found" }); return; }

    const isAdmin = req.userRole === "admin";
    const isPastor = req.userRole === "pastor";
    const isOwner = existing.submittedBy === req.userId;

    const { content, attendance, soulWinning, status } = req.body;
    const updateData: Record<string, unknown> = {};

    if (content !== undefined && isOwner) updateData.content = content;
    if (attendance !== undefined && isOwner) updateData.attendance = attendance;
    if (soulWinning !== undefined && isOwner) updateData.soulWinning = soulWinning;
    // Only admin or pastor can change status
    if (status !== undefined && (isAdmin || isPastor)) updateData.status = status;

    if (Object.keys(updateData).length === 0) {
      res.status(403).json({ error: "No permitted fields to update" }); return;
    }

    const [updated] = await db.update(reportsTable).set(updateData).where(eq(reportsTable.id, id)).returning();
    res.json({ ...updated, createdAt: updated.createdAt.toISOString(), updatedAt: updated.updatedAt.toISOString() });
  } catch (err) {
    res.status(500).json({ error: "Failed to update report" });
  }
});

export default router;
