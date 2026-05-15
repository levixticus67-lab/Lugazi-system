import { Router } from "express";
import { desc, eq, and, ilike, or, sql } from "drizzle-orm";
import { db, chatMessagesTable } from "@workspace/db";
import { requireAuth, AuthRequest } from "../middlewares/auth";

const router = Router();

const LIVE_LIMIT = 50;
const ARCHIVE_THRESHOLD = 100;

router.get("/chat/:scope", requireAuth, async (req, res): Promise<void> => {
  const scope = req.params.scope as string;
  const messages = await db
    .select()
    .from(chatMessagesTable)
    .where(eq(chatMessagesTable.portalScope, scope))
    .orderBy(desc(chatMessagesTable.createdAt))
    .limit(LIVE_LIMIT);

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(chatMessagesTable)
    .where(eq(chatMessagesTable.portalScope, scope));

  res.json({
    messages: messages.reverse().map(m => ({ ...m, createdAt: m.createdAt.toISOString() })),
    total: count,
    hasLogs: count > ARCHIVE_THRESHOLD,
  });
});

router.get("/chat/:scope/logs", requireAuth, async (req, res): Promise<void> => {
  const scope = req.params.scope as string;
  const search = (req.query.search as string) || "";
  const page = Math.max(0, Number(req.query.page ?? 0));
  const limit = 50;

  const condition = search.trim()
    ? and(
        eq(chatMessagesTable.portalScope, scope),
        or(
          ilike(chatMessagesTable.message, `%${search}%`),
          ilike(chatMessagesTable.displayName, `%${search}%`)
        )
      )
    : eq(chatMessagesTable.portalScope, scope);

  const rows = await db
    .select()
    .from(chatMessagesTable)
    .where(condition)
    .orderBy(desc(chatMessagesTable.createdAt))
    .limit(limit)
    .offset(page * limit);

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(chatMessagesTable)
    .where(condition);

  res.json({
    messages: rows.map(m => ({ ...m, createdAt: m.createdAt.toISOString() })),
    total: count,
    page,
    pages: Math.ceil(count / limit),
  });
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
