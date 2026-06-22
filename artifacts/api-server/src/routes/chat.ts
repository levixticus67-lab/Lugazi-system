import { Router } from "express";
import { desc, eq, and, ilike, or, sql } from "drizzle-orm";
import { db, chatMessagesTable, chatReactionsTable, privateMessagesTable, userStatusTable } from "@workspace/db";
import { requireAuth, AuthRequest } from "../middlewares/auth";

const router = Router();

const LIVE_LIMIT = 50;
const ARCHIVE_THRESHOLD = 100;
const GLOBAL = "global";
const MAX_MESSAGE_LENGTH = 2000;

// FIX: per-user rate limiter for chat to prevent message flooding
const chatRateLimiter = new Map<number, { count: number; resetAt: number }>();
const CHAT_MAX = 20;
const CHAT_WINDOW_MS = 60 * 1000;

function checkChatRateLimit(userId: number): boolean {
  const now = Date.now();
  const entry = chatRateLimiter.get(userId);
  if (!entry || now > entry.resetAt) {
    chatRateLimiter.set(userId, { count: 1, resetAt: now + CHAT_WINDOW_MS });
    return true;
  }
  if (entry.count >= CHAT_MAX) return false;
  entry.count++;
  return true;
}

setInterval(() => {
  const now = Date.now();
  for (const [id, entry] of chatRateLimiter) {
    if (now > entry.resetAt) chatRateLimiter.delete(id);
  }
}, 5 * 60 * 1000).unref();

router.get("/chat/statuses", requireAuth, async (_req, res): Promise<void> => {
  const statuses = await db.select().from(userStatusTable).orderBy(desc(userStatusTable.updatedAt));
  res.json(statuses.map(s => ({ ...s, updatedAt: s.updatedAt.toISOString() })));
});

router.patch("/chat/status", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const { status, displayName, photoUrl } = req.body;
  const validStatuses = ["online", "offline", "in-service", "dnd"];
  if (!validStatuses.includes(status)) { res.status(400).json({ error: "Invalid status" }); return; }
  const existing = await db.select().from(userStatusTable).where(eq(userStatusTable.userId, req.userId!)).limit(1);
  if (existing.length > 0) {
    const [updated] = await db.update(userStatusTable)
      .set({ status, displayName: displayName || existing[0].displayName, photoUrl, updatedAt: new Date() })
      .where(eq(userStatusTable.userId, req.userId!))
      .returning();
    res.json({ ...updated, updatedAt: updated.updatedAt.toISOString() });
  } else {
    const [created] = await db.insert(userStatusTable)
      .values({ userId: req.userId!, displayName: displayName || "User", photoUrl, status })
      .returning();
    res.json({ ...created, updatedAt: created.updatedAt.toISOString() });
  }
});

router.get("/chat/dm/:otherUserId", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const otherId = Number(req.params.otherUserId);
  const myId = req.userId!;
  const msgs = await db.select().from(privateMessagesTable)
    .where(
      and(
        eq(privateMessagesTable.isDeleted, false),
        or(
          and(eq(privateMessagesTable.fromUserId, myId), eq(privateMessagesTable.toUserId, otherId)),
          and(eq(privateMessagesTable.fromUserId, otherId), eq(privateMessagesTable.toUserId, myId))
        )
      )
    )
    .orderBy(desc(privateMessagesTable.createdAt))
    .limit(100);

  await db.update(privateMessagesTable)
    .set({ isRead: true })
    .where(and(eq(privateMessagesTable.toUserId, myId), eq(privateMessagesTable.fromUserId, otherId), eq(privateMessagesTable.isRead, false)));

  res.json(msgs.reverse().map(m => ({ ...m, createdAt: m.createdAt.toISOString(), autoDeleteAt: m.autoDeleteAt?.toISOString() ?? null })));
});

router.post("/chat/dm/:otherUserId", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const otherId = Number(req.params.otherUserId);
  const { message, fromName, toName, fromPhotoUrl, replyToId, replyToText, isPrivateMode } = req.body;
  if (!message?.trim()) { res.status(400).json({ error: "Message required" }); return; }

  // FIX: enforce message length cap
  if (message.trim().length > MAX_MESSAGE_LENGTH) {
    res.status(400).json({ error: `Message too long (max ${MAX_MESSAGE_LENGTH} characters)` }); return;
  }

  const autoDeleteAt = isPrivateMode ? new Date(Date.now() + 24 * 60 * 60 * 1000) : null;

  const [record] = await db.insert(privateMessagesTable).values({
    fromUserId: req.userId!,
    toUserId: otherId,
    fromName: fromName || "User",
    toName: toName || "User",
    fromPhotoUrl,
    message: message.trim(),
    replyToId: replyToId ?? null,
    replyToText: replyToText ?? null,
    isPrivateMode: !!isPrivateMode,
    autoDeleteAt,
  }).returning();
  res.status(201).json({ ...record, createdAt: record.createdAt.toISOString(), autoDeleteAt: record.autoDeleteAt?.toISOString() ?? null });
});

router.delete("/chat/dm/:otherUserId/end-private", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const otherId = Number(req.params.otherUserId);
  const myId = req.userId!;
  await db.update(privateMessagesTable)
    .set({ isDeleted: true })
    .where(
      and(
        eq(privateMessagesTable.isPrivateMode, true),
        or(
          and(eq(privateMessagesTable.fromUserId, myId), eq(privateMessagesTable.toUserId, otherId)),
          and(eq(privateMessagesTable.fromUserId, otherId), eq(privateMessagesTable.toUserId, myId))
        )
      )
    );
  res.json({ success: true });
});

router.get("/chat/:scope", requireAuth, async (_req, res): Promise<void> => {
  const messages = await db
    .select()
    .from(chatMessagesTable)
    .where(and(eq(chatMessagesTable.portalScope, GLOBAL), eq(chatMessagesTable.isDeleted, false)))
    .orderBy(desc(chatMessagesTable.createdAt))
    .limit(LIVE_LIMIT);

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(chatMessagesTable)
    .where(and(eq(chatMessagesTable.portalScope, GLOBAL), eq(chatMessagesTable.isDeleted, false)));

  const msgIds = messages.map(m => m.id);
  let reactions: typeof chatReactionsTable.$inferSelect[] = [];
  if (msgIds.length > 0) {
    reactions = await db.select().from(chatReactionsTable)
      .where(sql`${chatReactionsTable.messageId} = ANY(${sql.raw(`ARRAY[${msgIds.join(",")}]::int[]`)})`)
      .catch(() => []);
  }

  res.json({
    messages: messages.reverse().map(m => ({ ...m, createdAt: m.createdAt.toISOString() })),
    reactions: reactions.map(r => ({ ...r, createdAt: r.createdAt.toISOString() })),
    total: count,
    hasLogs: count > ARCHIVE_THRESHOLD,
  });
});

router.get("/chat/:scope/logs", requireAuth, async (req, res): Promise<void> => {
  const search = (req.query.search as string) || "";
  const page = Math.max(0, Number(req.query.page ?? 0));
  const limit = 50;

  const condition = search.trim()
    ? and(
        eq(chatMessagesTable.portalScope, GLOBAL),
        eq(chatMessagesTable.isDeleted, false),
        or(
          ilike(chatMessagesTable.message, `%${search}%`),
          ilike(chatMessagesTable.displayName, `%${search}%`)
        )
      )
    : and(eq(chatMessagesTable.portalScope, GLOBAL), eq(chatMessagesTable.isDeleted, false));

  const rows = await db.select().from(chatMessagesTable).where(condition)
    .orderBy(desc(chatMessagesTable.createdAt)).limit(limit).offset(page * limit);

  const [{ count }] = await db.select({ count: sql<number>`count(*)::int` })
    .from(chatMessagesTable).where(condition);

  res.json({ messages: rows.map(m => ({ ...m, createdAt: m.createdAt.toISOString() })), total: count, page, pages: Math.ceil(count / limit) });
});

router.post("/chat/:scope", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  // FIX: rate limit chat posts per user — prevents message flooding
  if (!checkChatRateLimit(req.userId!)) {
    res.status(429).json({ error: "Too many messages — please slow down." }); return;
  }

  const { message, displayName, photoUrl, replyToId, replyToText, replyToName } = req.body;
  if (!message || !message.trim()) { res.status(400).json({ error: "Message is required" }); return; }

  // FIX: enforce message length cap
  if (message.trim().length > MAX_MESSAGE_LENGTH) {
    res.status(400).json({ error: `Message too long (max ${MAX_MESSAGE_LENGTH} characters)` }); return;
  }

  // FIX: role comes from the verified JWT — never trust the client-supplied role field
  const verifiedRole = req.userRole ?? "member";

  const [record] = await db.insert(chatMessagesTable).values({
    portalScope: GLOBAL,
    userId: req.userId!,
    displayName: displayName || "User",
    role: verifiedRole,
    photoUrl: photoUrl ?? null,
    message: message.trim(),
    replyToId: replyToId ?? null,
    replyToText: replyToText ?? null,
    replyToName: replyToName ?? null,
  }).returning();
  res.status(201).json({ ...record, createdAt: record.createdAt.toISOString() });
});

router.patch("/chat/:scope/:id", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const id = Number(req.params.id);
  const { message } = req.body;
  if (!message?.trim()) { res.status(400).json({ error: "Message is required" }); return; }

  // FIX: enforce message length cap on edits too
  if (message.trim().length > MAX_MESSAGE_LENGTH) {
    res.status(400).json({ error: `Message too long (max ${MAX_MESSAGE_LENGTH} characters)` }); return;
  }

  const [msg] = await db.select().from(chatMessagesTable).where(eq(chatMessagesTable.id, id)).limit(1);
  if (!msg) { res.status(404).json({ error: "Not found" }); return; }
  if (msg.userId !== req.userId) { res.status(403).json({ error: "You can only edit your own messages" }); return; }
  if (msg.isDeleted) { res.status(400).json({ error: "Cannot edit a deleted message" }); return; }
  const [updated] = await db.update(chatMessagesTable)
    .set({ message: message.trim(), isEdited: true })
    .where(eq(chatMessagesTable.id, id))
    .returning();
  res.json({ ...updated, createdAt: updated.createdAt.toISOString() });
});

router.delete("/chat/:scope/:id", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const id = Number(req.params.id);
  const [msg] = await db.select().from(chatMessagesTable).where(eq(chatMessagesTable.id, id)).limit(1);
  if (!msg) { res.status(404).json({ error: "Not found" }); return; }
  if (msg.userId !== req.userId && req.userRole !== "admin" && req.userRole !== "leadership") { res.status(403).json({ error: "Forbidden" }); return; }
  await db.update(chatMessagesTable).set({ isDeleted: true }).where(eq(chatMessagesTable.id, id));
  res.json({ success: true });
});

router.post("/chat/:scope/:id/react", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const messageId = Number(req.params.id);
  const { emoji, displayName } = req.body;
  if (!emoji) { res.status(400).json({ error: "Emoji required" }); return; }

  const existing = await db.select().from(chatReactionsTable)
    .where(and(eq(chatReactionsTable.messageId, messageId), eq(chatReactionsTable.userId, req.userId!), eq(chatReactionsTable.emoji, emoji)))
    .limit(1);

  if (existing.length > 0) {
    await db.delete(chatReactionsTable).where(eq(chatReactionsTable.id, existing[0].id));
    res.json({ removed: true, emoji });
  } else {
    const [reaction] = await db.insert(chatReactionsTable).values({
      messageId,
      userId: req.userId!,
      displayName: displayName || "User",
      emoji,
    }).returning();
    res.json({ ...reaction, createdAt: reaction.createdAt.toISOString() });
  }
});

router.get("/chat/:scope/:id/reactions", requireAuth, async (req, res): Promise<void> => {
  const messageId = Number(req.params.id);
  const reactions = await db.select().from(chatReactionsTable).where(eq(chatReactionsTable.messageId, messageId));
  res.json(reactions.map(r => ({ ...r, createdAt: r.createdAt.toISOString() })));
});

export default router;
