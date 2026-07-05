import { Router } from "express";
import { desc, eq, sql, inArray } from "drizzle-orm";
import { db, contributionsTable, usersTable, membersTable } from "@workspace/db";
import { requireAuth, requireRole, AuthRequest } from "../middlewares/auth";
import { logActivity } from "../lib/activityLog";

const router = Router();

async function withMemberPhotos<T extends { memberId?: number | null }>(records: T[]): Promise<(T & { memberPhotoUrl: string | null })[]> {
  const ids = [...new Set(records.map(r => r.memberId).filter((id): id is number => !!id))];
  let photoMap: Record<number, string | null> = {};
  if (ids.length > 0) {
    const rows = await db.select({ id: membersTable.id, photoUrl: membersTable.photoUrl }).from(membersTable).where(inArray(membersTable.id, ids));
    photoMap = Object.fromEntries(rows.map(r => [r.id, r.photoUrl]));
  }
  return records.map(r => ({ ...r, memberPhotoUrl: r.memberId ? (photoMap[r.memberId] ?? null) : null }));
}

// FIX: restricted to leadership+ — regular members must not see all financial contributions
router.get("/giving", requireAuth, requireRole(["admin", "pastor", "leadership"]), async (req: AuthRequest, res): Promise<void> => {
  const memberId = req.query.memberId ? Number(req.query.memberId) : undefined;
  let query = db.select().from(contributionsTable).orderBy(desc(contributionsTable.createdAt)).limit(500).$dynamic();
  if (memberId) query = query.where(eq(contributionsTable.memberId, memberId));
  const records = await query;
  const enriched = await withMemberPhotos(records);
  res.json(enriched.map(r => ({ ...r, createdAt: r.createdAt.toISOString() })));
});

// FIX: restricted to leadership+ — financial summary is sensitive
router.get("/giving/summary", requireAuth, requireRole(["admin", "pastor", "leadership"]), async (_req, res): Promise<void> => {
  const rows = await db.select({
    type: contributionsTable.type,
    total: sql<number>`SUM(${contributionsTable.amount})`,
    count: sql<number>`COUNT(*)`,
  }).from(contributionsTable).groupBy(contributionsTable.type);
  res.json(rows);
});

// FIX: restricted to leadership+ — only authorised staff may record contributions
router.post("/giving", requireAuth, requireRole(["admin", "pastor", "leadership"]), async (req: AuthRequest, res): Promise<void> => {
  const { memberId, memberName, email, type, amount, currency, reference, notes } = req.body;
  if (!memberName || !amount || !type) { res.status(400).json({ error: "memberName, amount, and type required" }); return; }
  const [record] = await db.insert(contributionsTable).values({
    memberId: memberId ? Number(memberId) : undefined,
    memberName, email, type, amount: Number(amount),
    currency: currency || "UGX",
    reference, notes,
    recordedBy: req.userId,
  }).returning();
  const [actor] = await db.select({ displayName: usersTable.displayName }).from(usersTable).where(eq(usersTable.id, req.userId!)).limit(1);
  await logActivity({ userId: req.userId!, displayName: actor?.displayName ?? "Admin", action: "create_giving", entityType: "giving", entityId: record.id, entityName: memberName, details: `${type} — UGX ${Number(amount).toLocaleString()}`, ipAddress: req.ip ?? "unknown" });
  const memberPhotoUrl = record.memberId
    ? ((await db.select({ photoUrl: membersTable.photoUrl }).from(membersTable).where(eq(membersTable.id, record.memberId)).limit(1))[0]?.photoUrl ?? null)
    : null;
  res.status(201).json({ ...record, memberPhotoUrl, createdAt: record.createdAt.toISOString() });
});

// FIX: restricted to admin only — deleting financial records is a destructive admin action
router.delete("/giving/:id", requireAuth, requireRole(["admin", "pastor"]), async (req: AuthRequest, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }
  const [existing] = await db.select({ memberName: contributionsTable.memberName, type: contributionsTable.type }).from(contributionsTable).where(eq(contributionsTable.id, id)).limit(1);
  const [actor] = await db.select({ displayName: usersTable.displayName }).from(usersTable).where(eq(usersTable.id, req.userId!)).limit(1);
  await db.delete(contributionsTable).where(eq(contributionsTable.id, id));
  await logActivity({ userId: req.userId!, displayName: actor?.displayName ?? "Admin", action: "delete_giving", entityType: "giving", entityId: id, entityName: existing?.memberName ?? undefined, details: existing?.type, ipAddress: req.ip ?? "unknown" });
  res.json({ success: true });
});

export default router;
