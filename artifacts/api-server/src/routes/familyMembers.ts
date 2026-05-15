import { Router } from "express";
import { eq } from "drizzle-orm";
import { db, familyMembersTable } from "@workspace/db";
import { requireAuth, AuthRequest } from "../middlewares/auth";

const router = Router();

router.get("/family", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const userId = req.userId!;
  const records = await db.select().from(familyMembersTable).where(eq(familyMembersTable.userId, userId));
  res.json(records.map(r => ({ ...r, createdAt: r.createdAt.toISOString() })));
});

router.post("/family", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const { fullName, relationship, birthday, phone, email, notes } = req.body;
  if (!fullName || !relationship) { res.status(400).json({ error: "fullName and relationship required" }); return; }
  const [record] = await db.insert(familyMembersTable).values({ userId: req.userId!, fullName, relationship, birthday, phone, email, notes }).returning();
  res.status(201).json({ ...record, createdAt: record.createdAt.toISOString() });
});

router.patch("/family/:id", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const { fullName, relationship, birthday, phone, email, notes } = req.body;
  const [record] = await db.update(familyMembersTable).set({ fullName, relationship, birthday, phone, email, notes }).where(eq(familyMembersTable.id, Number(req.params.id))).returning();
  if (!record) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ ...record, createdAt: record.createdAt.toISOString() });
});

router.delete("/family/:id", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  await db.delete(familyMembersTable).where(eq(familyMembersTable.id, Number(req.params.id)));
  res.json({ success: true });
});

export default router;
