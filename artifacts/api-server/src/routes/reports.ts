import { Router } from "express";
import { eq, desc, inArray } from "drizzle-orm";
import { db, groupsTable, reportsTable, usersTable } from "@workspace/db";
import { requireAuth, requireRole, AuthRequest } from "../middlewares/auth";

const router = Router();

// Admin and pastor can review all reports; leadership sees only their own.
router.get("/reports", requireAuth, requireRole(["admin", "pastor", "leadership"]), async (req: AuthRequest, res): Promise<void> => {
  try {
    const canReviewAll = req.userRole === "admin" || req.userRole === "pastor";
    const rows = canReviewAll
      ? await db.select().from(reportsTable).orderBy(desc(reportsTable.createdAt))
      : await db.select().from(reportsTable)
          .where(eq(reportsTable.submittedBy, req.userId!))
          .orderBy(desc(reportsTable.createdAt));

    const groupIds = rows
      .map(row => row.cellGroupId)
      .filter((id): id is number => id !== null);
    const groups = groupIds.length
      ? await db.select({ id: groupsTable.id, name: groupsTable.name })
        .from(groupsTable)
        .where(inArray(groupsTable.id, groupIds))
      : [];
    const groupNames = new Map(groups.map(group => [group.id, group.name]));

    res.json(rows.map(r => ({
      ...r,
      cellGroupName: r.cellGroupId ? groupNames.get(r.cellGroupId) ?? null : null,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    })));
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch reports" });
  }
});

// Only admin, pastor, leadership can submit reports
router.post("/reports", requireAuth, requireRole(["admin", "pastor", "leadership"]), async (req: AuthRequest, res): Promise<void> => {
  try {
    const { title, type, content, period, branchId, attendance, soulWinning, fileUrl, fileType, fileSize } = req.body;
    if (!title || !type || !period) {
      res.status(400).json({ error: "title, type, period required" }); return;
    }
    if (!content && !fileUrl) {
      res.status(400).json({ error: "Either content or an attached file is required" }); return;
    }
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!)).limit(1);
    const [report] = await db.insert(reportsTable).values({
      title, type, content: content || null, period,
      submittedBy: req.userId!, submittedByName: user?.displayName ?? null,
      branchId, attendance, soulWinning, status: "draft",
      fileUrl: fileUrl || null, fileType: fileType || null, fileSize: fileSize || null,
    }).returning();
    res.status(201).json({ ...report, createdAt: report.createdAt.toISOString(), updatedAt: report.updatedAt.toISOString() });
  } catch (err) {
    res.status(500).json({ error: "Failed to submit report" });
  }
});

// Admin/pastor can update status (review reports); author can edit content/attachment
router.patch("/reports/:id", requireAuth, requireRole(["admin", "pastor", "leadership"]), async (req: AuthRequest, res): Promise<void> => {
  try {
    const id = parseInt(String(req.params.id), 10);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }

    const [existing] = await db.select().from(reportsTable).where(eq(reportsTable.id, id)).limit(1);
    if (!existing) { res.status(404).json({ error: "Report not found" }); return; }

    const isAdmin = req.userRole === "admin";
    const isPastor = req.userRole === "pastor";
    const isOwner = existing.submittedBy === req.userId;

    const { title, period, content, attendance, soulWinning, status, fileUrl, fileType, fileSize } = req.body;
    const updateData: Record<string, unknown> = {};

    if (title !== undefined && isOwner) updateData.title = title;
    if (period !== undefined && isOwner) updateData.period = period;
    if (content !== undefined && isOwner) updateData.content = content;
    // Cell-report attendance is derived from the linked attendance session.
    if (attendance !== undefined && isOwner && !existing.cellAttendanceSessionId) updateData.attendance = attendance;
    if (soulWinning !== undefined && isOwner) updateData.soulWinning = soulWinning;
    if (fileUrl !== undefined && isOwner) updateData.fileUrl = fileUrl;
    if (fileType !== undefined && isOwner) updateData.fileType = fileType;
    if (fileSize !== undefined && isOwner) updateData.fileSize = fileSize;
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


// Owner can delete their own report; admin can delete any
router.delete("/reports/:id", requireAuth, requireRole(["admin", "pastor", "leadership"]), async (req: AuthRequest, res): Promise<void> => {
  try {
    const id = parseInt(String(req.params.id), 10);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }

    const [existing] = await db.select().from(reportsTable).where(eq(reportsTable.id, id)).limit(1);
    if (!existing) { res.status(404).json({ error: "Report not found" }); return; }

    const isAdmin = req.userRole === "admin";
    const isOwner = existing.submittedBy === req.userId;
    if (!isAdmin && !isOwner) { res.status(403).json({ error: "Not authorised" }); return; }

    await db.delete(reportsTable).where(eq(reportsTable.id, id));
    res.sendStatus(204);
  } catch (err) {
    res.status(500).json({ error: "Failed to delete report" });
  }
});

export default router;
