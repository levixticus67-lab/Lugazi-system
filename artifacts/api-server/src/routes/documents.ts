import { Router } from "express";
import { eq, desc } from "drizzle-orm";
import { db, documentsTable, usersTable } from "@workspace/db";
import { requireAuth, requireRole, AuthRequest } from "../middlewares/auth";

const router = Router();

router.get("/documents", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const all = await db.select().from(documentsTable).orderBy(desc(documentsTable.createdAt));
  // Filter by accessRoles
  const role = req.userRole ?? "member";
  const filtered = all.filter(d => d.accessRoles.includes(role) || d.accessRoles.includes("all"));
  res.json(filtered.map(d => ({ ...d, createdAt: d.createdAt.toISOString() })));
});

router.post("/documents", requireAuth, requireRole(["admin"]), async (req: AuthRequest, res): Promise<void> => {
  const { title, description, category, fileUrl, fileType, fileSize, accessRoles } = req.body;
  if (!title || !category || !fileUrl || !fileType) {
    res.status(400).json({ error: "title, category, fileUrl, fileType required" }); return;
  }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!)).limit(1);
  const [doc] = await db.insert(documentsTable).values({
    title, description, category, fileUrl, fileType,
    fileSize: fileSize ?? null,
    uploadedBy: req.userId!, uploadedByName: user?.displayName ?? null,
    accessRoles: accessRoles ?? ["admin", "leadership", "workforce", "member"],
  }).returning();
  res.status(201).json({ ...doc, createdAt: doc.createdAt.toISOString() });
});

router.delete("/documents/:id", requireAuth, requireRole(["admin"]), async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }
  await db.delete(documentsTable).where(eq(documentsTable.id, id));
  res.sendStatus(204);
});

export default router;
