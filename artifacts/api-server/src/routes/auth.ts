import { Router } from "express";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { promises as dns } from "dns";
import { db, usersTable, membersTable } from "@workspace/db";
import { requireAuth, generateToken, AuthRequest } from "../middlewares/auth";
import { logger } from "../lib/logger";
import { logActivity } from "../lib/activityLog";
import { v4 as uuidv4 } from "uuid";

const router = Router();

// ── In-memory rate limiter for auth endpoints ────────────────────────────────
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

// ── Cookie helpers ────────────────────────────────────────────────────────────
const COOKIE_NAME = "dcl_token";
const COOKIE_MAX_AGE = 2 * 24 * 60 * 60 * 1000;
const REMEMBER_MAX_AGE = 14 * 24 * 60 * 60 * 1000;

function setAuthCookie(res: import("express").Response, token: string, maxAge: number = COOKIE_MAX_AGE): void {
  const isProd = process.env.NODE_ENV === "production";
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "none" : "lax",
    maxAge,
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

// ── MX record check — verifies the email domain has mail servers ──────────────
// On DNS timeout (>5s) or error, we fail open so legitimate users aren't blocked.
async function hasMailServer(email: string): Promise<boolean> {
  const domain = email.split("@")[1];
  if (!domain) return false;
  try {
    const records = await Promise.race([
      dns.resolveMx(domain),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("dns_timeout")), 5000)
      ),
    ]);
    return Array.isArray(records) && records.length > 0;
  } catch (err: any) {
    // timeout → let it through; NXDOMAIN / no MX → block
    if (err?.message === "dns_timeout") {
      logger.warn({ domain }, "MX check timed out — allowing registration");
      return true;
    }
    return false;
  }
}

// ── Validators ────────────────────────────────────────────────────────────────
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateLogin(body: unknown): { email: string; password: string; rememberMe: boolean } | string {
  const b = body as Record<string, unknown>;
  if (!b.email || typeof b.email !== "string" || !EMAIL_RE.test(b.email))
    return "A valid email address is required";
  if (!b.password || typeof b.password !== "string" || b.password.length < 1)
    return "Password is required";
  return { email: b.email.trim().toLowerCase(), password: b.password, rememberMe: b.rememberMe === true };
}

function validateRegister(body: unknown): { email: string; password: string; displayName: string } | string {
  const b = body as Record<string, unknown>;
  if (!b.email || typeof b.email !== "string" || !EMAIL_RE.test(b.email))
    return "A valid email address is required";
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

// ── POST /auth/login ──────────────────────────────────────────────────────────
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
  const { email, password, rememberMe } = validated;

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

  const token = generateToken(user.id, user.role, rememberMe ? "14d" : "2d");
  setAuthCookie(res, token, rememberMe ? REMEMBER_MAX_AGE : COOKIE_MAX_AGE);

  const userData = {
    id: user.id, email: user.email, displayName: user.displayName, role: user.role,
    photoUrl: user.photoUrl, branchId: user.branchId, phone: user.phone,
    isActive: user.isActive, createdAt: user.createdAt.toISOString(),
  };
  res.json({ token, user: userData });
});

// ── POST /auth/register ───────────────────────────────────────────────────────
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

  // MX record check — catches typos and fake domains before writing to the DB
  const mxOk = await hasMailServer(email);
  if (!mxOk) {
    res.status(400).json({
      error: "This email address doesn't look valid — the domain doesn't accept mail. Please double-check and try again.",
    });
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

// ── POST /auth/logout ─────────────────────────────────────────────────────────
router.post("/auth/logout", (_req, res): void => {
  clearAuthCookie(res);
  res.json({ message: "Logged out successfully" });
});

// ── GET /auth/me ──────────────────────────────────────────────────────────────
// Always reads role from DB. If JWT role is stale, re-issues the cookie
// so the client's next requests carry the correct role without requiring a re-login.
router.get("/auth/me", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!)).limit(1);
  if (!user) { res.status(404).json({ error: "User not found" }); return; }

  if (req.userRole !== user.role) {
    logger.info({ userId: user.id, oldRole: req.userRole, newRole: user.role }, "Role mismatch — re-issuing auth cookie");
    const freshToken = generateToken(user.id, user.role);
    setAuthCookie(res, freshToken);
  }

  res.json({
    id: user.id, email: user.email, displayName: user.displayName, role: user.role,
    photoUrl: user.photoUrl, branchId: user.branchId, phone: user.phone,
    birthday: user.birthday ?? null,
    isActive: user.isActive, createdAt: user.createdAt.toISOString(),
  });
});

// ── POST /auth/change-password ────────────────────────────────────────────────
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

// ── Google OAuth ──────────────────────────────────────────────────────────────
// RENDER_EXTERNAL_URL is set automatically by Render — no manual config needed.
// FRONTEND_URL must be set on Render to your Firebase hosting URL.
// GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET come from Google Cloud Console.

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const BACKEND_URL = process.env.RENDER_EXTERNAL_URL ?? process.env.VITE_API_BASE_URL ?? "http://localhost:5001";
const FRONTEND_URL = process.env.FRONTEND_URL ?? "http://localhost:5173";

// GET /auth/google — redirect user to Google's consent screen
router.get("/auth/google", (_req, res): void => {
  if (!GOOGLE_CLIENT_ID) {
    res.status(503).json({ error: "Google login is not configured on this server." });
    return;
  }
  const redirectUri = `${BACKEND_URL}/api/auth/google/callback`;
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", GOOGLE_CLIENT_ID);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid email profile");
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "select_account");
  res.redirect(url.toString());
});

// GET /auth/google/callback — Google posts the auth code here
router.get("/auth/google/callback", async (req, res): Promise<void> => {
  const { code, error: oauthError } = req.query as { code?: string; error?: string };

  if (oauthError || !code) {
    res.redirect(`${FRONTEND_URL}?error=google_denied`);
    return;
  }

  try {
    // Exchange auth code for access token
    const redirectUri = `${BACKEND_URL}/api/auth/google/callback`;
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID!,
        client_secret: GOOGLE_CLIENT_SECRET!,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenRes.ok) {
      logger.error({ status: tokenRes.status }, "Google token exchange failed");
      res.redirect(`${FRONTEND_URL}?error=google_token_failed`);
      return;
    }

    const tokens = await tokenRes.json() as { access_token: string };

    // Fetch user profile from Google
    const profileRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });

    if (!profileRes.ok) {
      logger.error({ status: profileRes.status }, "Google userinfo fetch failed");
      res.redirect(`${FRONTEND_URL}?error=google_profile_failed`);
      return;
    }

    const gUser = await profileRes.json() as {
      id: string; email: string; name: string; picture?: string;
    };

    if (!gUser.email) {
      res.redirect(`${FRONTEND_URL}?error=google_no_email`);
      return;
    }

    const email = gUser.email.toLowerCase();

    // Find or create the local user account
    let [user] = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);

    if (!user) {
      // New user — create account. Store an unusable password hash so the
      // NOT NULL constraint is satisfied; they can only ever log in via Google.
      const unusableHash = await bcrypt.hash(uuidv4(), 12);
      const [created] = await db.insert(usersTable).values({
        email,
        passwordHash: unusableHash,
        displayName: gUser.name,
        role: "member",
        isActive: true,
        photoUrl: gUser.picture ?? null,
      }).returning();
      user = created;

      // Link to pre-registered member record if one exists
      const [preReg] = await db.select().from(membersTable).where(eq(membersTable.email, email)).limit(1);
      if (preReg) {
        await db.update(membersTable)
          .set({ userId: user.id, fullName: gUser.name, photoUrl: gUser.picture ?? null })
          .where(eq(membersTable.id, preReg.id));
        logger.info({ userId: user.id, memberId: preReg.id }, "Google user merged with pre-registered member");
      } else {
        await db.insert(membersTable).values({
          userId: user.id, fullName: gUser.name, email,
          role: "member", branchId: 1, qrToken: uuidv4(),
          isActive: true, photoUrl: gUser.picture ?? null,
        }).onConflictDoNothing();
      }

      await logActivity({
        userId: user.id, displayName: gUser.name,
        action: "register", details: "Registered via Google", ipAddress: req.ip ?? "unknown",
      });
    } else {
      // Existing user — update photo if they didn't have one
      if (gUser.picture && !user.photoUrl) {
        await db.update(usersTable).set({ photoUrl: gUser.picture }).where(eq(usersTable.id, user.id));
      }
    }

    if (!user.isActive) {
      res.redirect(`${FRONTEND_URL}?error=account_deactivated`);
      return;
    }

    await logActivity({
      userId: user.id, displayName: user.displayName,
      action: "login", details: "Google OAuth", ipAddress: req.ip ?? "unknown",
    });

    const token = generateToken(user.id, user.role);
    setAuthCookie(res, token);
    res.redirect(FRONTEND_URL);
  } catch (err) {
    logger.error({ err }, "Google OAuth callback error");
    res.redirect(`${FRONTEND_URL}?error=google_server_error`);
  }
});

export default router;
