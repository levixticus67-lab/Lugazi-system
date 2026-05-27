import { Router } from "express";
  import { eq, desc } from "drizzle-orm";
  import { db, dutyRosterTable } from "@workspace/db";
  import { requireAuth, requireRole, AuthRequest } from "../middlewares/auth";

  const router = Router();

  router.get("/duty-roster", requireAuth, async (req: AuthRequest, res): Promise<void> => {
    let records;
    if (req.userRole === "admin" || req.userRole === "leadership") {
      records = await db.select().from(dutyRosterTable).orderBy(desc(dutyRosterTable.serviceDate));
    } else {
      records = await db.select().from(dutyRosterTable)
        .where(eq(dutyRosterTable.assignedToUserId, req.userId!))
        .orderBy(desc(dutyRosterTable.serviceDate));
    }
    res.json(records.map(r => ({ ...r, createdAt: r.createdAt.toISOString() })));
  });

  router.post("/duty-roster", requireAuth, requireRole(["admin", "leadership"]), async (req: AuthRequest, res): Promise<void> => {
    const { assignedToUserId, assignedToName, serviceDate, serviceType, dutyRole, location, notes } = req.body;
    if (!assignedToName || !serviceDate || !serviceType || !dutyRole) {
      res.status(400).json({ error: "assignedToName, serviceDate, serviceType and dutyRole are required" }); return;
    }
    const [record] = await db.insert(dutyRosterTable).values({
      assignedToUserId: assignedToUserId ? Number(assignedToUserId) : null,
      assignedToName,
      serviceDate,
      serviceType,
      dutyRole,
      location: location || null,
      notes: notes || null,
      createdByUserId: req.userId!,
    }).returning();
    res.status(201).json({ ...record, createdAt: record.createdAt.toISOString() });
  });

  router.delete("/duty-roster/:id", requireAuth, requireRole(["admin", "leadership"]), async (req, res): Promise<void> => {
    const id = Number(req.params.id as string);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }
    await db.delete(dutyRosterTable).where(eq(dutyRosterTable.id, id));
    res.sendStatus(204);
  });

  export default router;
  