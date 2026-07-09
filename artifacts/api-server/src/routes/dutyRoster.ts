import { Router } from "express";
import { eq, desc } from "drizzle-orm";
import { db, dutyRosterTable, usersTable, inAppNotificationsTable } from "@workspace/db";
import { requireAuth, requireRole, AuthRequest } from "../middlewares/auth";

const router = Router();

router.get("/duty-roster", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  let records;
  if (req.userRole === "admin" || req.userRole === "leadership" || req.userRole === "pastor") {
    records = await db.select().from(dutyRosterTable).orderBy(desc(dutyRosterTable.serviceDate));
  } else {
    records = await db.select().from(dutyRosterTable)
      .where(eq(dutyRosterTable.assignedToUserId, req.userId!))
      .orderBy(desc(dutyRosterTable.serviceDate));
  }
  res.json(records.map(r => ({ ...r, createdAt: r.createdAt.toISOString() })));
});

router.post("/duty-roster", requireAuth, requireRole(["admin", "pastor", "leadership"]), async (req: AuthRequest, res): Promise<void> => {
  const { assignedToUserId, assignedToName, serviceDate, serviceType, dutyRole, location, notes } = req.body;
  if (!assignedToName || !serviceDate || !serviceType || !dutyRole) {
    res.status(400).json({ error: "assignedToName, serviceDate, serviceType and dutyRole are required" }); return;
  }
  const assignedToId = assignedToUserId ? Number(assignedToUserId) : null;
  const [record] = await db.insert(dutyRosterTable).values({
    assignedToUserId: assignedToId,
    assignedToName,
    serviceDate,
    serviceType,
    dutyRole,
    location: location || null,
    notes: notes || null,
    createdByUserId: req.userId!,
  }).returning();
  // Notify the assigned person (skip if assigning to self)
  if (assignedToId && assignedToId !== req.userId) {
    const [assigner] = await db.select({ displayName: usersTable.displayName }).from(usersTable).where(eq(usersTable.id, req.userId!)).limit(1);
    const assignerName = assigner?.displayName ?? "Leadership";
    const locationPart = location ? " at " + location : "";
    await db.insert(inAppNotificationsTable).values({
      userId: assignedToId,
      title: "You have a duty assignment",
      message: assignerName + " assigned you as " + dutyRole + " for " + serviceType + " on " + serviceDate + locationPart + ".",
      relatedEntityType: "duty_roster",
      relatedEntityId: record.id,
    });
  }
  res.status(201).json({ ...record, createdAt: record.createdAt.toISOString() });
});

router.delete("/duty-roster/:id", requireAuth, requireRole(["admin", "pastor", "leadership"]), async (req, res): Promise<void> => {
  const id = Number(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }
  await db.delete(dutyRosterTable).where(eq(dutyRosterTable.id, id));
  res.sendStatus(204);
});

export default router;