import { Router, type IRouter } from "express";
import { sql } from "drizzle-orm";
import { db } from "@workspace/db";
import { HealthCheckResponse } from "@workspace/api-zod";

const router: IRouter = Router();

// L1 fix: ping the DB so the health check reflects real service availability.
// Render, Firebase, and uptime monitors can page on a 503 before users notice.
router.get("/healthz", async (_req, res) => {
  try {
    await db.execute(sql`SELECT 1`);
    const data = HealthCheckResponse.parse({ status: "ok" });
    res.json(data);
  } catch {
    res.status(503).json({ status: "error", error: "Database unreachable" });
  }
});

export default router;
