import { Router } from "express";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db, usersTable, membersTable } from "@workspace/db";
import { requireAuth, generateToken, AuthRequest } from "../middlewares/auth";
import { logger } from "../lib/logger";
import { logActivity } from "../lib/activityLog";
import { v4 as uuidv4 } from "uuid";

const router = Router();

const loginAttempts = new Map<string, { count: number; resetAt: number }>();
const MAX_ATTEMPTS = 10;
const WINDOW_MS = 15 * 60 * 1000;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = loginAttempts.get(ip);
  if (!entry || now > entry.resetAt) {
    loginAttempts.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }
  if (entry.count >= MAX_ATTEMPTS) return false;
  entry.count++;
  return true;
}

function clearRateLimit(ip: string) {
  loginAttempts.delete(ip);
}

router.post("/auth/login", async (req, res): Promise<void> => {
  const ip = req.ip ?? "unknown";
  if (!checkRateLimit(ip)) {
    res.status(429).json({ error: "Too many login attempts. Please wait 15 minutes and try again." });
    return;
  }

  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({ error: "Email and password required" });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
  if (!user) {
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

  clearRateLimit(ip);
  await logActivity({ userId: user.id, displayName: user.displayName, action: "login", ipAddress: ip });

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

  const [preRegistered] = await db.select().from(membersTable).where(eq(membersTable.email, email)).limit(1);
  if (preRegistered) {
    await db.update(membersTable).set({ userId: user.id, fullName: displayName }).where(eq(membersTable.id, preRegistered.id));
    logger.info({ userId: user.id, memberId: preRegistered.id }, "Merged new user with pre-registered member");
  } else {
    await db.insert(membersTable).values({
      userId: user.id, fullName: displayName, email, role: "member",
      branchId: 1, qrToken: uuidv4(), isActive: true,
    }).onConflictDoNothing();
  }

  logger.info({ userId: user.id, email }, "New user registered");
  await logActivity({ userId: user.id, displayName, action: "register", details: `Registered with email ${email}`, ipAddress: req.ip ?? "unknown" });

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
  await logActivity({ userId: user.id, displayName: user.displayName, action: "change_password", ipAddress: req.ip ?? "unknown" });
  res.json({ message: "Password changed successfully" });
});

export default router;
