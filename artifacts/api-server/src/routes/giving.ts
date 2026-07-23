import { Router } from "express";
import { desc, eq, sql } from "drizzle-orm";
import { z } from "zod/v4";
import { db, contributionsTable, usersTable } from "@workspace/db";
import { requireAuth, requireRole, AuthRequest } from "../middlewares/auth";
import { logActivity } from "../lib/activityLog";

const router = Router();

// ── Request-body schema (H6: Zod validation, H5: amount coerced to string) ───
const givingBodySchema = z.object({
  memberId:   z.number().int().optional(),
  memberName: z.string().min(1, "memberName is required"),
  email:      z.string().email().optional().or(z.literal("")),
  type:       z.string().min(1, "type is required"),
  amount:     z.union([z.string(), z.number()])
                .transform(v => String(Number(v)))
                .refine(v => Number(v) > 0, "amount must be positive"),
  currency:   z.string().default("UGX"),
  reference:  z.string().optional(),
  notes:      z.string().optional(),
});

router.get("/giving", requireAuth, requireRole(["admin", "pastor", "leadership"]), async (req: AuthRequest, res): Promise<void> => {
  const memberId = req.query.memberId ? Number(req.query.memberId) : undefined;
  let query = db.select().from(contributionsTable).orderBy(desc(contributionsTable.createdAt)).limit(500).$dynamic();
  if (memberId) query = query.where(eq(contributionsTable.memberId, memberId));
  const records = await query;
  res.json(records.map(r => ({ ...r, amount: Number(r.amount), createdAt: r.createdAt.toISOString() })));
});

router.get("/giving/summary", requireAuth, requireRole(["admin", "pastor", "leadership"]), async (_req, res): Promise<void> => {
  const rows = await db.select({
    type:  contributionsTable.type,
    total: sql<number>`SUM(${contributionsTable.amount}::numeric)`,
    count: sql<number>`COUNT(*)`,
  }).from(contributionsTable).groupBy(contributionsTable.type);
  res.json(rows);
});

router.post("/giving", requireAuth, requireRole(["admin", "pastor", "leadership"]), async (req: AuthRequest, res): Promise<void> => {
  const parsed = givingBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid request body" });
    return;
  }
  const { memberId, memberName, email, type, amount, currency, reference, notes } = parsed.data;

  const [record] = await db.insert(contributionsTable).values({
    memberId, memberName, email: email || undefined,
    type, amount, currency, reference, notes, recordedBy: req.userId,
  }).returning();

  const [actor] = await db.select({ displayName: usersTable.displayName }).from(usersTable).where(eq(usersTable.id, req.userId!)).limit(1);
  await logActivity({
    userId: req.userId!, displayName: actor?.displayName ?? "Admin",
    action: "create_giving", entityType: "giving", entityId: record.id,
    entityName: memberName, details: `${type} — UGX ${Number(amount).toLocaleString()}`,
    ipAddress: req.ip ?? "unknown",
  });

  res.status(201).json({ ...record, amount: Number(record.amount), createdAt: record.createdAt.toISOString() });
});

router.delete("/giving/:id", requireAuth, requireRole(["admin", "pastor"]), async (req: AuthRequest, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }
  const [existing] = await db.select({ memberName: contributionsTable.memberName, type: contributionsTable.type })
    .from(contributionsTable).where(eq(contributionsTable.id, id)).limit(1);
  const [actor] = await db.select({ displayName: usersTable.displayName })
    .from(usersTable).where(eq(usersTable.id, req.userId!)).limit(1);
  await db.delete(contributionsTable).where(eq(contributionsTable.id, id));
  await logActivity({
    userId: req.userId!, displayName: actor?.displayName ?? "Admin",
    action: "delete_giving", entityType: "giving", entityId: id,
    entityName: existing?.memberName ?? undefined, details: existing?.type,
    ipAddress: req.ip ?? "unknown",
  });
  res.json({ success: true });
});

export default router;
