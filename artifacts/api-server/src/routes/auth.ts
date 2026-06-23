import { Router } from "express";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db, usersTable, membersTable } from "@workspace/db";
import { requireAuth, generateToken, AuthRequest } from "../middlewares/auth";
import { logger } from "../lib/logger";
import { logActivity } from "../lib/activityLog";
import { v4 as uuidv4 } from "uuid";

const router = Router();

// ---------------------------------------------------------------------------
// Rate limiter — shared for login and register, in-memory with periodic cleanup
// ---------------------------------------------------------------------------
const authAttempts = new Map<string, { count: number; resetAt: number }>();
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;

setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of authAttempts) {
    if (now > entry.resetAt) authAttempts.delete(ip);
  }
}, 10 * 60 * 1000).unref();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = authAttempts.get(ip);
  if (!entry || now > entry.resetAt) {
    authAttempts.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }
  if (entry.count >= MAX_ATTEMPTS) return false;
  entry.count++;
  return true;
}

function clearRateLimit(ip: string) {
  authAttempts.delete(ip);
}

// ---------------------------------------------------------------------------
// Cookie helper — sets an HttpOnly session cookie
// ---------------------------------------------------------------------------
const COOKIE_NAME = "dcl_token";
const COOKIE_MAX_AGE = 2 * 24 * 60 * 60 * 1000;

function setAuthCookie(res: import("express").Response, token: string): void {
  const isProd = process.env.NODE_ENV === "production";
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "none" : "lax",
    maxAge: COOKIE_MAX_AGE,
    path: "/",
  });
}

function clearAuthCookie(res: import("express").Response): void {
  const isProd = process.env.NODE_ENV === "production";
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "none" : "lax",
    path: "/",
  });
}

// ---------------------------------------------------------------------------
// Lightweight validation helpers
// ---------------------------------------------------------------------------
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateLogin(body: unknown): { email: string; password: string } | string {
  const b = body as Record<string, unknown>;
  if (!b.email || typeof b.email !== "string" || !EMAIL_RE.test(b.email))
    return "A valid email address is required";
  if (!b.password || typeof b.password !== "string" || b.password.length < 1)
    return "Password is required";
  return { email: b.email.trim().toLowerCase(), password: b.password };
}

function validateRegister(body: unknown): { email: string; password: string; displayName: string } | string {
  const b = body as Record<string, unknown>;
  if (!b.email || typeof b.email !== "string" || !EMAIL_RE.test(b.email))
    return "A valid email address is required";
  // FIX: minimum 8 chars and at least one number for stronger passwords
  if (!b.password || typeof b.password !== "string" || b.password.length < 8)
    return "Password must be at least 8 characters";
  if (!/\d/.test(b.password as string))
    return "Password must contain at least one number";
  if (!b.displayName || typeof b.displayName !== "string" || b.displayName.trim().length < 1)
    return "Display name is required";
  if (b.displayName.toString().length > 100)
    return "Display name must be 100 characters or fewer";
  return {
    email: b.email.trim().toLowerCase(),
    password: b.password,
    displayName: (b.displayName as string).trim(),
  };
}

function validateChangePassword(body: unknown): { currentPassword: string; newPassword: string } | string {
  const b = body as Record<string, unknown>;
  if (!b.currentPassword || typeof b.currentPassword !== "string" || b.currentPassword.length < 1)
    return "Current password is required";
  if (!b.newPassword || typeof b.newPassword !== "string" || b.newPassword.length < 8)
    return "New password must be at least 8 characters";
  if (!/\d/.test(b.newPassword as string))
    return "New password must contain at least one number";
  return { currentPassword: b.currentPassword, newPassword: b.newPassword };
}

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

router.post("/auth/login", async (req, res): Promise<void> => {
  const ip = req.ip ?? "unknown";

  if (!checkRateLimit(ip)) {
    res.status(429).json({ error: "Too many login attempts. Please wait 15 minutes and try again." });
    return;
  }

  const validated = validateLogin(req.body);
  if (typeof validated === "string") {
    res.status(400).json({ error: validated });
    return;
  }
  const { email, password } = validated;

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
  setAuthCookie(res, token);

  const userData = {
    id: user.id, email: user.email, displayName: user.displayName, role: user.role,
    photoUrl: user.photoUrl, branchId: user.branchId, phone: user.phone,
    isActive: user.isActive, createdAt: user.createdAt.toISOString(),
  };
  res.json({ token, user: userData });
});

// FIX: apply the same rate limiter to register — prevents account-creation flooding
router.post("/auth/register", async (req, res): Promise<void> => {
  const ip = req.ip ?? "unknown";

  if (!checkRateLimit(ip)) {
    res.status(429).json({ error: "Too many requests. Please wait 15 minutes and try again." });
    return;
  }

  const validated = validateRegister(req.body);
  if (typeof validated === "string") {
    res.status(400).json({ error: validated });
    return;
  }
  const { email, password, displayName } = validated;

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
  await logActivity({ userId: user.id, displayName, action: "register", details: `Registered with email ${email}`, ipAddress: ip });

  const token = generateToken(user.id, "member");
  setAuthCookie(res, token);

  const userData = {
    id: user.id, email: user.email, displayName: user.displayName, role: user.role,
    photoUrl: user.photoUrl, branchId: user.branchId, phone: user.phone,
    isActive: user.isActive, createdAt: user.createdAt.toISOString(),
  };
  res.status(201).json({ token, user: userData });
});

router.post("/auth/logout", (_req, res): void => {
  clearAuthCookie(res);
  res.json({ message: "Logged out successfully" });
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
  const validated = validateChangePassword(req.body);
  if (typeof validated === "string") {
    res.status(400).json({ error: validated });
    return;
  }
  const { currentPassword, newPassword } = validated;

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
