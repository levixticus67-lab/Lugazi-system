import { Router } from "express";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db, usersTable, membersTable } from "@workspace/db";
import { requireAuth, generateToken, AuthRequest } from "../middlewares/auth";
import { logger } from "../lib/logger";
import { v4 as uuidv4 } from "uuid";

const router = Router();

const HARDCODED_ADMIN_EMAIL = "levixticus67@gmail.com";
const HARDCODED_ADMIN_PASSWORD = "*levi#ticus123";

router.post("/auth/login", async (req, res): Promise<void> => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({ error: "Email and password required" });
    return;
  }

  // Special handling for hardcoded admin
  if (email === HARDCODED_ADMIN_EMAIL && password === HARDCODED_ADMIN_PASSWORD) {
    let adminUser = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
    if (adminUser.length === 0) {
      const hash = await bcrypt.hash(password, 12);
      const [created] = await db.insert(usersTable).values({
        email, passwordHash: hash, displayName: "Levi (Admin)",
        role: "admin", isActive: true,
      }).returning();
      adminUser = [created];
      await db.insert(membersTable).values({
        userId: created.id, fullName: "Levi (Admin)", email, role: "admin",
        branchId: 1, qrToken: uuidv4(), isActive: true,
      }).onConflictDoNothing();
      logger.info({ userId: created.id }, "Admin user created on first login");
    } else {
      await db.update(usersTable).set({ role: "admin" }).where(eq(usersTable.id, adminUser[0].id));
      adminUser[0].role = "admin";
    }
    const token = generateToken(adminUser[0].id, "admin");
    res.json({ token, user: { id: adminUser[0].id, email: adminUser[0].email, displayName: adminUser[0].displayName, role: "admin", photoUrl: adminUser[0].photoUrl, branchId: adminUser[0].branchId, phone: adminUser[0].phone, isActive: adminUser[0].isActive, createdAt: adminUser[0].createdAt.toISOString() } });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
  if (!user) {
    // Check if they exist as a pre-registered member (email in members but no user account)
    const [existingMember] = await db.select().from(membersTable).where(eq(membersTable.email, email)).limit(1);
    if (existingMember && !existingMember.userId) {
      res.status(401).json({
        error: "first_time_login",
        message: "Your email is registered. Please set up your account password to continue.",
        requiresRegistration: true,
      });
    } else {
      res.status(401).json({ error: "Invalid email or password" });
    }
    return;
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  if (!user.isActive) {
    res.status(403).json({ error: "Account deactivated. Contact admin." });
    return;
  }

  const token = generateToken(user.id, user.role);
  res.json({
    token,
    user: {
      id: user.id, email: user.email, displayName: user.displayName, role: user.role,
      photoUrl: user.photoUrl, branchId: user.branchId, phone: user.phone,
      isActive: user.isActive, createdAt: user.createdAt.toISOString(),
    },
  });
});

// Register — allows new users to self-register with member role
// If the email is already in membersTable, links the userId for merging
router.post("/auth/register", async (req, res): Promise<void> => {
  const { email, password, displayName } = req.body;
  if (!email || !password || !displayName) {
    res.status(400).json({ error: "Email, password and display name are required" });
    return;
  }

  const [existing] = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
  if (existing) {
    res.status(400).json({ error: "An account with this email already exists. Please sign in instead." });
    return;
  }

  const hash = await bcrypt.hash(password, 12);
  const [user] = await db.insert(usersTable).values({
    email, passwordHash: hash, displayName, role: "member", isActive: true,
  }).returning();

  // Check if email is a pre-registered member — merge if found
  const [preRegistered] = await db.select().from(membersTable).where(eq(membersTable.email, email)).limit(1);
  if (preRegistered) {
    // Merge: link the new userId to the existing member record
    await db.update(membersTable).set({ userId: user.id, fullName: displayName }).where(eq(membersTable.id, preRegistered.id));
    logger.info({ userId: user.id, memberId: preRegistered.id }, "Merged new user with pre-registered member");
  } else {
    // Create a fresh member record
    await db.insert(membersTable).values({
      userId: user.id, fullName: displayName, email, role: "member",
      branchId: 1, qrToken: uuidv4(), isActive: true,
    }).onConflictDoNothing();
  }

  logger.info({ userId: user.id, email }, "New user registered");

  const token = generateToken(user.id, "member");
  res.status(201).json({
    token,
    user: {
      id: user.id, email: user.email, displayName: user.displayName, role: user.role,
      photoUrl: user.photoUrl, branchId: user.branchId, phone: user.phone,
      isActive: user.isActive, createdAt: user.createdAt.toISOString(),
    },
  });
});

router.get("/auth/me", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!)).limit(1);
  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  res.json({
    id: user.id, email: user.email, displayName: user.displayName, role: user.role,
    photoUrl: user.photoUrl, branchId: user.branchId, phone: user.phone,
    birthday: user.birthday ?? null,
    isActive: user.isActive, createdAt: user.createdAt.toISOString(),
  });
});

router.post("/auth/change-password", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    res.status(400).json({ error: "Both passwords are required" });
    return;
  }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!)).limit(1);
  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) { res.status(401).json({ error: "Current password is incorrect" }); return; }
  const hash = await bcrypt.hash(newPassword, 12);
  await db.update(usersTable).set({ passwordHash: hash }).where(eq(usersTable.id, req.userId!));
  res.json({ message: "Password changed successfully" });
});

export default router;
