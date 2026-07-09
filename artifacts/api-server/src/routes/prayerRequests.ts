import { Router } from "express";
import { desc, eq, inArray } from "drizzle-orm";
import { db, prayerRequestsTable, usersTable, inAppNotificationsTable } from "@workspace/db";
import { requireAuth, requireRole, AuthRequest } from "../middlewares/auth";

const router = Router();

router.get("/prayer-requests", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const role = req.userRole;
  let records;
  if (role === "admin" || role === "leadership" || role === "pastor") {
    records = await db.select().from(prayerRequestsTable).orderBy(desc(prayerRequestsTable.createdAt));
  } else {
    records = await db.select().from(prayerRequestsTable)
      .where(eq(prayerRequestsTable.userId, req.userId!))
      .orderBy(desc(prayerRequestsTable.createdAt));
  }
  res.json(records.map(r => ({ ...r, createdAt: r.createdAt.toISOString(), updatedAt: r.updatedAt.toISOString() })));
});

router.post("/prayer-requests", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const { subject, request, displayName, isAnonymous } = req.body;
  if (!subject || !request) { res.status(400).json({ error: "Subject and request are required" }); return; }
  const [record] = await db.insert(prayerRequestsTable).values({
    userId: req.userId!,
    displayName: isAnonymous ? "Anonymous" : (displayName || "Member"),
    subject,
    request,
    isAnonymous: !!isAnonymous,
    status: "pending",
  }).returning();
  // Notify admins, pastors, and leadership
  const reviewers = await db.select({ id: usersTable.id })
    .from(usersTable)
    .where(inArray(usersTable.role, ["admin", "pastor", "leadership"]));
  if (reviewers.length > 0) {
    const submitterLabel = isAnonymous ? "Someone (anonymous)" : (displayName || "A member");
    await db.insert(inAppNotificationsTable).values(
      reviewers.map(r => ({
        userId: r.id,
        title: "New prayer request",
        message: submitterLabel + " submitted a prayer request: \"" + subject + "\".",
        relatedEntityType: "prayer_request",
        relatedEntityId: record.id,
      }))
    );
  }
  res.status(201).json({ ...record, createdAt: record.createdAt.toISOString(), updatedAt: record.updatedAt.toISOString() });
});

router.patch("/prayer-requests/:id", requireAuth, requireRole(["admin", "pastor", "leadership"]), async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }
  const { status, adminNote } = req.body;
  const update: Record<string, unknown> = {};
  if (status !== undefined) update.status = status;
  if (adminNote !== undefined) update.adminNote = adminNote;
  const [updated] = await db.update(prayerRequestsTable).set(update).where(eq(prayerRequestsTable.id, id)).returning();
  if (!updated) { res.status(404).json({ error: "Not found" }); return; }
  // Notify the submitter when their request is prayed for or acknowledged
  if (status && status !== "pending" && !updated.isAnonymous) {
    const statusLabel = status === "prayed" ? "prayed for" : status === "answered" ? "answered" : "updated";
    const notePart = adminNote ? " Note: " + adminNote : "";
    await db.insert(inAppNotificationsTable).values({
      userId: updated.userId,
      title: "Prayer request " + statusLabel,
      message: "Your prayer request \"" + updated.subject + "\" has been " + statusLabel + "." + notePart,
      relatedEntityType: "prayer_request",
      relatedEntityId: id,
    });
  }
  res.json({ ...updated, createdAt: updated.createdAt.toISOString(), updatedAt: updated.updatedAt.toISOString() });
});

router.delete("/prayer-requests/:id", requireAuth, requireRole(["admin", "pastor"]), async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }
  await db.delete(prayerRequestsTable).where(eq(prayerRequestsTable.id, id));
  res.sendStatus(204);
});

export default router;