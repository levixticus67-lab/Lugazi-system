import { Router } from "express";
import { desc, gte, and } from "drizzle-orm";
import { db, activityLogsTable } from "@workspace/db";
import { requireAuth, requireRole } from "../middlewares/auth";

const router = Router();

router.get("/admin/activity-logs", requireAuth, requireRole(["admin"]), async (req, res): Promise<void> => {
  const since = req.query.since ? new Date(req.query.since as string) : null;

  const logs = await db.select().from(activityLogsTable)
    .where(since ? gte(activityLogsTable.createdAt, since) : undefined)
    .orderBy(desc(activityLogsTable.createdAt))
    .limit(500);

  res.json(logs.map(l => ({ ...l, createdAt: l.createdAt.toISOString() })));
});

export default router;
