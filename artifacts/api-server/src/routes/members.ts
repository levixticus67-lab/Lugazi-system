import { Router } from "express";
  import { eq } from "drizzle-orm";
  import { db, membersTable, usersTable } from "@workspace/db";
  import { requireAuth, requireRole, AuthRequest } from "../middlewares/auth";
  import { v4 as uuidv4 } from "uuid";

  const router = Router();

  /** Merge photoUrl: prefer the linked user's photo, fall back to member's own photo */
  function mergePhoto(memberPhoto: string | null | undefined, userPhoto: string | null | undefined): string | null {
    return userPhoto ?? memberPhoto ?? null;
  }

  router.get("/members", requireAuth, async (_req, res): Promise<void> => {
    const members = await db.select().from(membersTable).orderBy(membersTable.fullName);
    // Batch-fetch user photos for members that have a userId
    const userIds = members.map(m => m.userId).filter((id): id is number => id != null);
    let userPhotoMap: Record<number, string | null> = {};
    if (userIds.length > 0) {
      const users = await db.select({ id: usersTable.id, photoUrl: usersTable.photoUrl })
        .from(usersTable)
        .where(eq(usersTable.id, userIds[0])); // we'll use a different approach below
      // Actually fetch all in one query using inArray if available, else map individually
      const allUsers = await db.select({ id: usersTable.id, photoUrl: usersTable.photoUrl }).from(usersTable);
      const idSet = new Set(userIds);
      allUsers.filter(u => idSet.has(u.id)).forEach(u => { userPhotoMap[u.id] = u.photoUrl ?? null; });
    }
    res.json(members.map(m => ({
      ...m,
      photoUrl: mergePhoto(m.photoUrl, m.userId ? userPhotoMap[m.userId] : undefined),
      createdAt: m.createdAt.toISOString(),
      updatedAt: m.updatedAt.toISOString(),
    })));
  });

  router.post("/members", requireAuth, requireRole(["admin", "leadership"]), async (req: AuthRequest, res): Promise<void> => {
    const { fullName, email, phone, branchId, department, profession, photoUrl, bio, birthday, address } = req.body;
    if (!fullName || !email || !branchId) {
      res.status(400).json({ error: "fullName, email, and branchId are required" });
      return;
    }
    const [member] = await db.insert(membersTable).values({
      fullName, email, phone, branchId, department, profession, photoUrl, bio, birthday, address,
      role: "member",
      qrToken: uuidv4(),
      isActive: true,
    }).returning();
    res.status(201).json({ ...member, createdAt: member.createdAt.toISOString(), updatedAt: member.updatedAt.toISOString() });
  });

  router.get("/members/:id", requireAuth, async (req, res): Promise<void> => {
    const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const id = parseInt(raw, 10);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }
    const [member] = await db.select().from(membersTable).where(eq(membersTable.id, id)).limit(1);
    if (!member) { res.status(404).json({ error: "Member not found" }); return; }
    // Get user photo if linked
    let userPhoto: string | null = null;
    if (member.userId) {
      const [u] = await db.select({ photoUrl: usersTable.photoUrl }).from(usersTable).where(eq(usersTable.id, member.userId)).limit(1);
      userPhoto = u?.photoUrl ?? null;
    }
    res.json({
      ...member,
      photoUrl: mergePhoto(member.photoUrl, userPhoto),
      createdAt: member.createdAt.toISOString(),
      updatedAt: member.updatedAt.toISOString(),
    });
  });

  router.patch("/members/:id", requireAuth, async (req: AuthRequest, res): Promise<void> => {
    const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const id = parseInt(raw, 10);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }
    const { fullName, phone, branchId, department, profession, photoUrl, bio, birthday, address, isActive } = req.body;
    const updateData: Record<string, unknown> = {};
    if (fullName !== undefined) updateData.fullName = fullName;
    if (phone !== undefined) updateData.phone = phone;
    if (branchId !== undefined) updateData.branchId = branchId;
    if (department !== undefined) updateData.department = department;
    if (profession !== undefined) updateData.profession = profession;
    if (photoUrl !== undefined) updateData.photoUrl = photoUrl;
    if (bio !== undefined) updateData.bio = bio;
    if (birthday !== undefined) updateData.birthday = birthday;
    if (address !== undefined) updateData.address = address;
    if (isActive !== undefined && req.userRole === "admin") updateData.isActive = isActive;
    const [updated] = await db.update(membersTable).set(updateData).where(eq(membersTable.id, id)).returning();
    if (!updated) { res.status(404).json({ error: "Member not found" }); return; }
    // Sync photoUrl to the linked user account so both are always the same
    if (photoUrl !== undefined && updated.userId) {
      await db.update(usersTable).set({ photoUrl }).where(eq(usersTable.id, updated.userId)).catch(() => {});
    }
    // Sync birthday to members table if set
    if (birthday !== undefined) {
      await db.update(membersTable).set({ birthday }).where(eq(membersTable.id, id)).catch(() => {});
    }
    res.json({ ...updated, createdAt: updated.createdAt.toISOString(), updatedAt: updated.updatedAt.toISOString() });
  });

  router.delete("/members/:id", requireAuth, requireRole(["admin"]), async (req, res): Promise<void> => {
    const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const id = parseInt(raw, 10);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }
    await db.delete(membersTable).where(eq(membersTable.id, id));
    res.sendStatus(204);
  });

  // QR code value for printing
  router.get("/members/:id/qr", requireAuth, async (req, res): Promise<void> => {
    const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const id = parseInt(raw, 10);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }
    const [member] = await db.select().from(membersTable).where(eq(membersTable.id, id)).limit(1);
    if (!member) { res.status(404).json({ error: "Member not found" }); return; }
    res.json({ qrToken: member.qrToken, memberId: member.id, memberName: member.fullName });
  });

  export default router;
  