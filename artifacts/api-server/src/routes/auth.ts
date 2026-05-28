import { Router } from "express";
  import bcrypt from "bcryptjs";
  import { z } from "zod/v4";
  import { eq } from "drizzle-orm";
  import { db, usersTable, membersTable } from "@workspace/db";
  import { requireAuth, generateToken, AuthRequest } from "../middlewares/auth";
  import { logger } from "../lib/logger";
  import { logActivity } from "../lib/activityLog";
  import { v4 as uuidv4 } from "uuid";

  const router = Router();

  // ---------------------------------------------------------------------------
  // Rate limiter — in-memory with periodic cleanup to prevent memory leaks
  // NOTE: resets on server restart; acceptable for Render free tier with the
  // keep-alive ping in place. A DB-backed store is the next step if needed.
  // ---------------------------------------------------------------------------
  const loginAttempts = new Map<string, { count: number; resetAt: number }>();
  const MAX_ATTEMPTS = 5;          // reduced from 10
  const WINDOW_MS = 15 * 60 * 1000;

  // Clean up expired entries every 10 minutes
  setInterval(() => {
    const now = Date.now();
    for (const [ip, entry] of loginAttempts) {
      if (now > entry.resetAt) loginAttempts.delete(ip);
    }
  }, 10 * 60 * 1000).unref();

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

  // ---------------------------------------------------------------------------
  // Cookie helper — sets an HttpOnly session cookie
  // ---------------------------------------------------------------------------
  const COOKIE_NAME = "dcl_token";
  const COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days in ms

  function setAuthCookie(res: import("express").Response, token: string): void {
    const isProd = process.env.NODE_ENV === "production";
    res.cookie(COOKIE_NAME, token, {
      httpOnly: true,            // JS cannot read this cookie
      secure: isProd,            // HTTPS only in production
      sameSite: isProd ? "none" : "lax", // "none" required for cross-site (Firebase → Render)
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
  // Zod validation schemas
  // ---------------------------------------------------------------------------
  const LoginSchema = z.object({
    email: z.email("Invalid email address"),
    password: z.string().min(1, "Password is required"),
  });

  const RegisterSchema = z.object({
    email: z.email("Invalid email address"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    displayName: z.string().min(1, "Display name is required").max(100, "Name too long"),
  });

  const ChangePasswordSchema = z.object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z.string().min(6, "New password must be at least 6 characters"),
  });

  // ---------------------------------------------------------------------------
  // Routes
  // ---------------------------------------------------------------------------

  router.post("/auth/login", async (req, res): Promise<void> => {
    const ip = req.ip ?? "unknown";

    if (!checkRateLimit(ip)) {
      res.status(429).json({ error: "Too many login attempts. Please wait 15 minutes and try again." });
      return;
    }

    // Zod validation
    const parsed = LoginSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid request" });
      return;
    }
    const { email, password } = parsed.data;

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
    // Set HttpOnly cookie — JS cannot read or steal this
    setAuthCookie(res, token);

    const userData = {
      id: user.id, email: user.email, displayName: user.displayName, role: user.role,
      photoUrl: user.photoUrl, branchId: user.branchId, phone: user.phone,
      isActive: user.isActive, createdAt: user.createdAt.toISOString(),
    };

    // Return token in body too for backward compat with any API clients
    res.json({ token, user: userData });
  });

  router.post("/auth/register", async (req, res): Promise<void> => {
    // Zod validation
    const parsed = RegisterSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid request" });
      return;
    }
    const { email, password, displayName } = parsed.data;

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
    setAuthCookie(res, token);

    const userData = {
      id: user.id, email: user.email, displayName: user.displayName, role: user.role,
      photoUrl: user.photoUrl, branchId: user.branchId, phone: user.phone,
      isActive: user.isActive, createdAt: user.createdAt.toISOString(),
    };

    res.status(201).json({ token, user: userData });
  });

  // Logout — clears the HttpOnly auth cookie server-side
  router.post("/auth/logout", (req, res): void => {
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
    const parsed = ChangePasswordSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid request" });
      return;
    }
    const { currentPassword, newPassword } = parsed.data;

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
  