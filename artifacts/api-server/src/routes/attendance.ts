import { Router } from "express";
import { eq, desc, sql } from "drizzle-orm";
import { db, attendanceTable, membersTable } from "@workspace/db";
import { requireAuth, requireRole, AuthRequest } from "../middlewares/auth";

const router = Router();

// FIX: restricted to staff roles — regular members must not browse all attendance records
router.get("/attendance", requireAuth, requireRole(["admin", "leadership", "workforce"]), async (_req, res): Promise<void> => {
  const records = await db.select().from(attendanceTable).orderBy(desc(attendanceTable.checkedInAt)).limit(500);
  res.json(records.map(r => ({ ...r, checkedInAt: r.checkedInAt.toISOString() })));
});

router.post("/attendance", requireAuth, requireRole(["admin", "leadership", "workforce"]), async (req: AuthRequest, res): Promise<void> => {
  const { memberId, eventId, eventName, method } = req.body;
  if (!memberId || !eventName || !method) {
    res.status(400).json({ error: "memberId, eventName and method are required" });
    return;
  }
  const [member] = await db.select().from(membersTable).where(eq(membersTable.id, memberId)).limit(1);
  if (!member) { res.status(404).json({ error: "Member not found" }); return; }

  const [record] = await db.insert(attendanceTable).values({
    memberId: member.id,
    memberName: member.fullName,
    eventId: eventId ?? null,
    eventName,
    branchId: member.branchId ?? null,
    checkedInBy: req.userId!,
    method,
  }).returning();

  // FIX: use parameterised sql tag — prevents SQL injection via eventId
  if (eventId) {
    const safeId = Number(eventId);
    if (!isNaN(safeId) && safeId > 0) {
      await db.execute(sql`UPDATE events SET attendee_count = attendee_count + 1 WHERE id = ${safeId}`);
    }
  }

  res.status(201).json({ ...record, checkedInAt: record.checkedInAt.toISOString() });
});

// QR scan — resolves member by token and records attendance
router.post("/attendance/qr-scan", requireAuth, requireRole(["admin", "leadership", "workforce"]), async (req: AuthRequest, res): Promise<void> => {
  const { qrToken, eventName, eventId } = req.body;
  if (!qrToken || !eventName) {
    res.status(400).json({ error: "qrToken and eventName are required" });
    return;
  }

  const [member] = await db.select().from(membersTable).where(eq(membersTable.qrToken, qrToken)).limit(1);
  if (!member) {
    res.status(404).json({ error: "No member found for this QR code" });
    return;
  }

  const [record] = await db.insert(attendanceTable).values({
    memberId: member.id,
    memberName: member.fullName,
    eventId: eventId ?? null,
    eventName,
    branchId: member.branchId ?? null,
    checkedInBy: req.userId!,
    method: "qr",
  }).returning();

  // FIX: use parameterised sql tag — prevents SQL injection via eventId
  if (eventId) {
    const safeId = Number(eventId);
    if (!isNaN(safeId) && safeId > 0) {
      await db.execute(sql`UPDATE events SET attendee_count = attendee_count + 1 WHERE id = ${safeId}`);
    }
  }

  res.status(201).json({ ...record, checkedInAt: record.checkedInAt.toISOString() });
});

export default router;
