import { Router } from "express";
import { eq, desc, inArray } from "drizzle-orm";
import { db, welfareTable, membersTable, usersTable } from "@workspace/db";
import { requireAuth, requireRole, AuthRequest } from "../middlewares/auth";
import { logActivity } from "../lib/activityLog";

const router = Router();

async function attachMemberPhotos<T extends { memberId?: number | null }>(records: T[]): Promise<(T & { memberPhotoUrl: string | null })[]> {
  const ids = [...new Set(records.map(r => r.memberId).filter((id): id is number => !!id))];
  let photoMap: Record<number, string | null> = {};
  if (ids.length > 0) {
    const rows = await db.select({ id: membersTable.id, photoUrl: membersTable.photoUrl }).from(membersTable).where(inArray(membersTable.id, ids));
    photoMap = Object.fromEntries(rows.map(r => [r.id, r.photoUrl]));
  }
  return records.map(r => ({ ...r, memberPhotoUrl: r.memberId ? (photoMap[r.memberId] ?? null) : null }));
}

router.get("/welfare", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const records = await db.select().from(welfareTable).orderBy(desc(welfareTable.createdAt));
  if (req.userRole === "member" || req.userRole === "workforce") {
    const myMember = await db.select().from(membersTable).where(eq(membersTable.userId, req.userId!)).limit(1);
    const memberId = myMember[0]?.id;
    const filtered = records.filter(r => r.memberId === memberId);
    const enriched = await attachMemberPhotos(filtered);
    res.json(enriched.map(r => ({ ...r, amountRequested: r.amountRequested ? Number(r.amountRequested) : null, createdAt: r.createdAt.toISOString(), updatedAt: r.updatedAt.toISOString() })));
    return;
  }
  const enriched = await attachMemberPhotos(records);
  res.json(enriched.map(r => ({ ...r, amountRequested: r.amountRequested ? Number(r.amountRequested) : null, createdAt: r.createdAt.toISOString(), updatedAt: r.updatedAt.toISOString() })));
});

router.post("/welfare", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const { category, description, amountRequested } = req.body;
  if (!category || !description) {
    res.status(400).json({ error: "category and description required" }); return;
  }
  const [member] = await db.select().from(membersTable).where(eq(membersTable.userId, req.userId!)).limit(1);
  if (!member) { res.status(404).json({ error: "Member record not found" }); return; }
  const [record] = await db.insert(welfareTable).values({
    memberId: member.id, memberName: member.fullName,
    category, description,
    amountRequested: amountRequested ? String(amountRequested) : null,
    status: "pending",
  }).returning();
  await logActivity({ userId: req.userId!, displayName: member.fullName, action: "welfare_submitted", entityType: "welfare", entityId: record.id, entityName: category, ipAddress: req.ip ?? "unknown" });
  res.status(201).json({ ...record, memberPhotoUrl: member.photoUrl ?? null, amountRequested: record.amountRequested ? Number(record.amountRequested) : null, createdAt: record.createdAt.toISOString(), updatedAt: record.updatedAt.toISOString() });
});

router.patch("/welfare/:id", requireAuth, requireRole(["admin", "pastor", "leadership"]), async (req: AuthRequest, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }
  const { status, adminNote } = req.body;
  if (!status) { res.status(400).json({ error: "status required" }); return; }
  const [updated] = await db.update(welfareTable).set({ status, adminNote, reviewedBy: req.userId }).where(eq(welfareTable.id, id)).returning();
  if (!updated) { res.status(404).json({ error: "Request not found" }); return; }
  const [actor] = await db.select({ displayName: usersTable.displayName }).from(usersTable).where(eq(usersTable.id, req.userId!)).limit(1);
  await logActivity({ userId: req.userId!, displayName: actor?.displayName ?? "Admin", action: "welfare_updated", entityType: "welfare", entityId: id, entityName: updated.memberName ?? undefined, details: `Status set to ${status}`, ipAddress: req.ip ?? "unknown" });
  const memberPhotoUrl = updated.memberId
    ? ((await db.select({ photoUrl: membersTable.photoUrl }).from(membersTable).where(eq(membersTable.id, updated.memberId)).limit(1))[0]?.photoUrl ?? null)
    : null;
  res.json({ ...updated, memberPhotoUrl, amountRequested: updated.amountRequested ? Number(updated.amountRequested) : null, createdAt: updated.createdAt.toISOString(), updatedAt: updated.updatedAt.toISOString() });
});

router.delete("/welfare/:id", requireAuth, requireRole(["admin", "pastor"]), async (req: AuthRequest, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }
  const [existing] = await db.select().from(welfareTable).where(eq(welfareTable.id, id)).limit(1);
  if (!existing) { res.status(404).json({ error: "Request not found" }); return; }
  const [actor] = await db.select({ displayName: usersTable.displayName }).from(usersTable).where(eq(usersTable.id, req.userId!)).limit(1);
  await db.delete(welfareTable).where(eq(welfareTable.id, id));
  await logActivity({ userId: req.userId!, displayName: actor?.displayName ?? "Admin", action: "welfare_deleted", entityType: "welfare", entityId: id, entityName: existing.memberName ?? undefined, ipAddress: req.ip ?? "unknown" });
  res.sendStatus(204);
});

export default router;
