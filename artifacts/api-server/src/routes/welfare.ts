import { Router } from "express";
import { eq, desc, inArray } from "drizzle-orm";
import { db, welfareTable, membersTable, usersTable, inAppNotificationsTable } from "@workspace/db";
import { requireAuth, requireRole, AuthRequest } from "../middlewares/auth";
import { logActivity } from "../lib/activityLog";

const router = Router();

router.get("/welfare", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const records = await db.select().from(welfareTable).orderBy(desc(welfareTable.createdAt));
  if (req.userRole === "member" || req.userRole === "workforce") {
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
  if (!category || !description) { res.status(400).json({ error: "category and description required" }); return; }
  const [member] = await db.select().from(membersTable).where(eq(membersTable.userId, req.userId!)).limit(1);
  if (!member) { res.status(404).json({ error: "Member record not found" }); return; }
  const [record] = await db.insert(welfareTable).values({
    memberId: member.id, memberName: member.fullName,
    category, description,
    amountRequested: amountRequested ? String(amountRequested) : null,
    status: "pending",
  }).returning();
  await logActivity({ userId: req.userId!, displayName: member.fullName, action: "welfare_submitted", entityType: "welfare", entityId: record.id, entityName: category, ipAddress: req.ip ?? "unknown" });
  // Notify admins, pastors, and leadership
  const reviewers = await db.select({ id: usersTable.id })
    .from(usersTable)
    .where(inArray(usersTable.role, ["admin", "pastor", "leadership"]));
  if (reviewers.length > 0) {
    const amtPart = amountRequested ? " (Amount: " + amountRequested + ")" : "";
    await db.insert(inAppNotificationsTable).values(
      reviewers.map(r => ({
        userId: r.id,
        title: "New welfare request submitted",
        message: member.fullName + " submitted a " + category + " welfare request." + amtPart,
        relatedEntityType: "welfare",
        relatedEntityId: record.id,
      }))
    );
  }
  res.status(201).json({ ...record, amountRequested: record.amountRequested ? Number(record.amountRequested) : null, createdAt: record.createdAt.toISOString(), updatedAt: record.updatedAt.toISOString() });
});

router.patch("/welfare/:id", requireAuth, requireRole(["admin", "pastor", "leadership"]), async (req: AuthRequest, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }
  const { status, adminNote } = req.body;
  if (!status) { res.status(400).json({ error: "status required" }); return; }
  // Fetch the original request before update so we can notify the member
  const [original] = await db.select().from(welfareTable).where(eq(welfareTable.id, id)).limit(1);
  if (!original) { res.status(404).json({ error: "Request not found" }); return; }
  const [updated] = await db.update(welfareTable)
    .set({ status, adminNote, reviewedBy: req.userId })
    .where(eq(welfareTable.id, id)).returning();
  if (!updated) { res.status(404).json({ error: "Request not found" }); return; }
  const [actor] = await db.select({ displayName: usersTable.displayName }).from(usersTable).where(eq(usersTable.id, req.userId!)).limit(1);
  await logActivity({ userId: req.userId!, displayName: actor?.displayName ?? "Admin", action: "welfare_updated", entityType: "welfare", entityId: id, entityName: updated.memberName ?? undefined, details: "Status set to " + status, ipAddress: req.ip ?? "unknown" });
  // Notify the submitter (if the status changed to a terminal state)
  if (status === "approved" || status === "rejected" || status === "fulfilled") {
    const [submitterMember] = await db.select({ userId: membersTable.userId })
      .from(membersTable).where(eq(membersTable.id, original.memberId)).limit(1);
    if (submitterMember?.userId) {
      const statusLabel = status === "approved" ? "approved" : status === "fulfilled" ? "fulfilled" : "not approved";
      const notePart = adminNote ? " Note: " + adminNote : "";
      await db.insert(inAppNotificationsTable).values({
        userId: submitterMember.userId,
        title: "Welfare request " + statusLabel,
        message: "Your " + original.category + " welfare request has been " + statusLabel + "." + notePart,
        relatedEntityType: "welfare",
        relatedEntityId: id,
      });
    }
  }
  res.json({ ...updated, amountRequested: updated.amountRequested ? Number(updated.amountRequested) : null, createdAt: updated.createdAt.toISOString(), updatedAt: updated.updatedAt.toISOString() });
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