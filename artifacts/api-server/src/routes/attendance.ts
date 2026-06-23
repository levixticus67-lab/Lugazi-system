import { Router } from "express";
import { eq, desc, asc, sql } from "drizzle-orm";
import { db, attendanceTable, membersTable } from "@workspace/db";
import { requireAuth, requireRole, AuthRequest } from "../middlewares/auth";

const router = Router();

// ── GET /attendance — admin only: full list grouped by event ────────────────
router.get("/attendance", requireAuth, requireRole(["admin"]), async (_req, res): Promise<void> => {
  const records = await db
    .select()
    .from(attendanceTable)
    .orderBy(asc(attendanceTable.eventName), desc(attendanceTable.checkedInAt))
    .limit(2000);
  res.json(records.map(r => ({ ...r, checkedInAt: r.checkedInAt.toISOString() })));
});

// ── GET /attendance/mine — any authenticated user: own records only ─────────
router.get("/attendance/mine", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const [member] = await db
    .select({ id: membersTable.id })
    .from(membersTable)
    .where(eq(membersTable.userId, req.userId!))
    .limit(1);

  if (!member) { res.json([]); return; }

  const records = await db
    .select()
    .from(attendanceTable)
    .where(eq(attendanceTable.memberId, member.id))
    .orderBy(desc(attendanceTable.checkedInAt));

  res.json(records.map(r => ({ ...r, checkedInAt: r.checkedInAt.toISOString() })));
});

// ── GET /attendance/summary — admin/pastor: counts per event ───────────────
router.get("/attendance/summary", requireAuth, requireRole(["admin", "pastor"]), async (_req, res): Promise<void> => {
  const rows = await db
    .select({
      eventId: attendanceTable.eventId,
      eventName: attendanceTable.eventName,
      count: sql<number>`cast(count(*) as int)`,
      lastCheckedIn: sql<string>`max(${attendanceTable.checkedInAt})::text`,
    })
    .from(attendanceTable)
    .groupBy(attendanceTable.eventId, attendanceTable.eventName)
    .orderBy(desc(sql`max(${attendanceTable.checkedInAt})`));

  res.json(rows);
});

// ── POST /attendance — record attendance (leadership/workforce/admin) ────────
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

  if (eventId) {
    const safeId = Number(eventId);
    if (!isNaN(safeId) && safeId > 0) {
      await db.execute(sql`UPDATE events SET attendee_count = attendee_count + 1 WHERE id = ${safeId}`);
    }
  }

  res.status(201).json({ ...record, checkedInAt: record.checkedInAt.toISOString() });
});

// ── POST /attendance/qr-scan ────────────────────────────────────────────────
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

  if (eventId) {
    const safeId = Number(eventId);
    if (!isNaN(safeId) && safeId > 0) {
      await db.execute(sql`UPDATE events SET attendee_count = attendee_count + 1 WHERE id = ${safeId}`);
    }
  }

  res.status(201).json({ ...record, checkedInAt: record.checkedInAt.toISOString() });
});

// ── PATCH /attendance/:id — admin only: edit a record ─────────────────────
router.patch("/attendance/:id", requireAuth, requireRole(["admin"]), async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }

  const { method, eventName, checkedInAt } = req.body;
  const updates: Record<string, unknown> = {};
  if (method !== undefined) updates.method = method;
  if (eventName !== undefined) updates.eventName = eventName;
  if (checkedInAt !== undefined) updates.checkedInAt = new Date(checkedInAt);

  if (Object.keys(updates).length === 0) {
    res.status(400).json({ error: "No fields to update" }); return;
  }

  const [updated] = await db
    .update(attendanceTable)
    .set(updates)
    .where(eq(attendanceTable.id, id))
    .returning();

  if (!updated) { res.status(404).json({ error: "Record not found" }); return; }
  res.json({ ...updated, checkedInAt: updated.checkedInAt.toISOString() });
});

// ── DELETE /attendance/:id — admin only ────────────────────────────────────
router.delete("/attendance/:id", requireAuth, requireRole(["admin"]), async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }
  await db.delete(attendanceTable).where(eq(attendanceTable.id, id));
  res.sendStatus(204);
});

export default router;
