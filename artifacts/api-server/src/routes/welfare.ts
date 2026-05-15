import { Router } from "express";
import { eq, desc } from "drizzle-orm";
import { db, welfareTable, membersTable } from "@workspace/db";
import { requireAuth, requireRole, AuthRequest } from "../middlewares/auth";

const router = Router();

router.get("/welfare", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const records = await db.select().from(welfareTable).orderBy(desc(welfareTable.createdAt));
  // Members only see their own requests
  if (req.userRole === "member") {
    const myMember = await db.select().from(membersTable).where(eq(membersTable.userId, req.userId!)).limit(1);
    const memberId = myMember[0]?.id;
    const filtered = records.filter(r => r.memberId === memberId);
    res.json(filtered.map(r => ({ ...r, amountRequested: r.amountRequested ? Number(r.amountRequested) : null, createdAt: r.createdAt.toISOString(), updatedAt: r.updatedAt.toISOString() })));
    return;
  }
  res.json(records.map(r => ({ ...r, amountRequested: r.amountRequested ? Number(r.amountRequested) : null, createdAt: r.createdAt.toISOString(), updatedAt: r.updatedAt.toISOString() })));
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
  res.status(201).json({ ...record, amountRequested: record.amountRequested ? Number(record.amountRequested) : null, createdAt: record.createdAt.toISOString(), updatedAt: record.updatedAt.toISOString() });
});

router.patch("/welfare/:id", requireAuth, requireRole(["admin", "leadership"]), async (req: AuthRequest, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }
  const { status, adminNote } = req.body;
  if (!status) { res.status(400).json({ error: "status required" }); return; }
  const [updated] = await db.update(welfareTable).set({ status, adminNote, reviewedBy: req.userId }).where(eq(welfareTable.id, id)).returning();
  if (!updated) { res.status(404).json({ error: "Request not found" }); return; }
  res.json({ ...updated, amountRequested: updated.amountRequested ? Number(updated.amountRequested) : null, createdAt: updated.createdAt.toISOString(), updatedAt: updated.updatedAt.toISOString() });
});

export default router;
