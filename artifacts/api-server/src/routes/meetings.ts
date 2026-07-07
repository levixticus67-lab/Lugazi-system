import { Router } from "express";
import { desc, eq, inArray } from "drizzle-orm";
import { db, meetingsTable, usersTable, inAppNotificationsTable, ministryTeamMembersTable } from "@workspace/db";
import { requireAuth, AuthRequest } from "../middlewares/auth";

const router = Router();

router.get("/meetings", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const target = req.query.target as string | undefined;
  let query = db.select().from(meetingsTable).orderBy(desc(meetingsTable.scheduledAt)).$dynamic();
  if (target) query = query.where(eq(meetingsTable.portalTarget, target));
  const meetings = await query;
  res.json(meetings.map(m => ({ ...m, scheduledAt: m.scheduledAt.toISOString(), createdAt: m.createdAt.toISOString(), updatedAt: m.updatedAt.toISOString() })));
});

router.post("/meetings", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const { title, description, agenda, scheduledAt, location, portalTarget, notes, notifyAudience } = req.body;
  if (!title || !scheduledAt) { res.status(400).json({ error: "title and scheduledAt required" }); return; }

  const [record] = await db.insert(meetingsTable).values({
    title, description, agenda,
    scheduledAt: new Date(scheduledAt),
    location: location || "Church Hall",
    portalTarget: portalTarget || "leadership",
    createdBy: req.userId,
    notes,
    notifyAudience: notifyAudience || null,
  }).returning();

  // Send in-app notifications to the chosen audience
  if (notifyAudience && notifyAudience !== "none") {
    let userIds: number[] = [];

    if (notifyAudience === "all") {
      const rows = await db.select({ id: usersTable.id }).from(usersTable);
      userIds = rows.map(r => r.id);
    } else if (notifyAudience.startsWith("role:")) {
      const role = notifyAudience.slice(5);
      const rows = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.role, role));
      userIds = rows.map(r => r.id);
    } else if (notifyAudience.startsWith("team:")) {
      const teamId = Number(notifyAudience.slice(5));
      const rows = await db.select({ userId: ministryTeamMembersTable.userId }).from(ministryTeamMembersTable).where(eq(ministryTeamMembersTable.teamId, teamId));
      userIds = rows.map(r => r.userId);
    }

    // Don't notify the person who scheduled it
    userIds = userIds.filter(id => id !== req.userId);

    if (userIds.length > 0) {
      const dateLabel = new Date(record.scheduledAt).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
      await db.insert(inAppNotificationsTable).values(
        userIds.map(uid => ({
          userId: uid,
          title: "New meeting scheduled",
          message: `${record.title} — ${dateLabel} at ${record.location}`,
          relatedEntityType: "meeting",
          relatedEntityId: record.id,
        }))
      );
    }
  }

  res.status(201).json({ ...record, scheduledAt: record.scheduledAt.toISOString(), createdAt: record.createdAt.toISOString(), updatedAt: record.updatedAt.toISOString() });
});

router.patch("/meetings/:id", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const id = Number(req.params.id);
  const { status, notes, attendees } = req.body;
  const [record] = await db.update(meetingsTable).set({ status, notes, attendees }).where(eq(meetingsTable.id, id)).returning();
  if (!record) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ ...record, scheduledAt: record.scheduledAt.toISOString(), createdAt: record.createdAt.toISOString(), updatedAt: record.updatedAt.toISOString() });
});

router.delete("/meetings/:id", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const id = Number(req.params.id);
  await db.delete(meetingsTable).where(eq(meetingsTable.id, id));
  res.json({ success: true });
});

export default router;
