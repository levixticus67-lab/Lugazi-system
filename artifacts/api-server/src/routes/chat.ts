import { Router } from "express";
import { desc, eq } from "drizzle-orm";
import { db, chatMessagesTable } from "@workspace/db";
import { requireAuth, AuthRequest } from "../middlewares/auth";

const router = Router();

router.get("/chat/:scope", requireAuth, async (req, res): Promise<void> => {
  const scope = req.params.scope as string;
  const messages = await db
    .select()
    .from(chatMessagesTable)
    .where(eq(chatMessagesTable.portalScope, scope))
    .orderBy(desc(chatMessagesTable.createdAt))
    .limit(50);
  res.json(messages.reverse().map(m => ({ ...m, createdAt: m.createdAt.toISOString() })));
});

router.post("/chat/:scope", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const scope = req.params.scope as string;
  const { message, displayName, role } = req.body;
  if (!message || !message.trim()) {
    res.status(400).json({ error: "Message is required" });
    return;
  }
  const [record] = await db.insert(chatMessagesTable).values({
    portalScope: scope,
    userId: req.userId!,
    displayName: displayName || "User",
    role: role || "member",
    message: message.trim(),
  }).returning();
  res.status(201).json({ ...record, createdAt: record.createdAt.toISOString() });
});

export default router;
