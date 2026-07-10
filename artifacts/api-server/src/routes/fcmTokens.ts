import { Router } from "express";
import { eq, and } from "drizzle-orm";
import { db, fcmTokensTable } from "@workspace/db";
import { requireAuth, AuthRequest } from "../middlewares/auth";

const router = Router();

// POST /api/fcm-tokens — register or refresh a device push token
router.post("/fcm-tokens", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const { token, platform } = req.body;
  if (!token?.trim()) { res.status(400).json({ error: "token is required" }); return; }

  // Upsert: if token already exists (same device re-registering), just update userId + platform
  const existing = await db
    .select({ id: fcmTokensTable.id })
    .from(fcmTokensTable)
    .where(eq(fcmTokensTable.token, token))
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(fcmTokensTable)
      .set({ userId: req.userId!, platform: platform || "android" })
      .where(eq(fcmTokensTable.token, token));
  } else {
    await db.insert(fcmTokensTable).values({
      userId: req.userId!,
      token,
      platform: platform || "android",
    });
  }

  res.json({ success: true });
});

// DELETE /api/fcm-tokens — remove token on logout so this device stops receiving pushes
router.delete("/fcm-tokens", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const { token } = req.body;
  if (!token?.trim()) { res.status(400).json({ error: "token is required" }); return; }

  await db
    .delete(fcmTokensTable)
    .where(and(eq(fcmTokensTable.token, token), eq(fcmTokensTable.userId, req.userId!)));

  res.json({ success: true });
});

export default router;
