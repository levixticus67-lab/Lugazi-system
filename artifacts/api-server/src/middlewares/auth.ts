import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { createHash } from "crypto";
import { eq } from "drizzle-orm";
import { db, usersTable, activityLogsTable, sessionsTable } from "@workspace/db";
import { logger } from "../lib/logger";

// Hard-fail on startup if JWT_SECRET is missing — never fall back to a known string
if (!process.env.JWT_SECRET) {
  logger.error(
    "FATAL: JWT_SECRET environment variable is not set. " +
    "Set JWT_SECRET in your Render environment variables and redeploy."
  );
  process.exit(1);
}

const JWT_SECRET = process.env.JWT_SECRET;

export interface AuthRequest extends Request {
  userId?: number;
  userRole?: string;
  rawToken?: string;   // the original token string — available to logout/refresh routes
  sessionId?: number;  // the sessions.id row — available to routes that need it
}

/** SHA-256 hash of a raw JWT — what gets stored in the sessions table. */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

// ── lastSeenAt throttle ───────────────────────────────────────────────────────
// To avoid a DB write on every single request we throttle per-session to once
// every 5 minutes. The Map is keyed by tokenHash and holds the last update ms.
const lastSeenThrottle = new Map<string, number>();
const LAST_SEEN_INTERVAL = 5 * 60 * 1000; // 5 minutes

export async function requireAuth(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  // Bearer token takes priority over cookie.
  // On native Capacitor (Android WebView), the app always sends a Bearer token
  // from localStorage. The WebView may also forward a stale HttpOnly cookie from
  // its cross-origin cookie jar — if the cookie were preferred, a stale cookie
  // would silently override a valid Bearer token and cause spurious 401s.
  // For pure web sessions the Bearer header is absent and the cookie is used.
  let token: string | undefined;

  const header = req.headers.authorization;
  const bearerToken = header?.startsWith("Bearer ") ? header.slice(7) : undefined;
  const cookieToken = (req as any).cookies?.dcl_token as string | undefined;
  token = bearerToken ?? cookieToken;

  if (!token) {
    res.status(401).json({ error: "Unauthorized — missing token" });
    return;
  }

  let decoded: { userId: number; role: string };
  try {
    decoded = jwt.verify(token, JWT_SECRET) as { userId: number; role: string };
  } catch {
    res.status(401).json({ error: "Unauthorized — invalid token" });
    return;
  }

  // Re-check isActive on every request so that deactivated accounts are
  // blocked immediately instead of retaining access until their JWT expires.
  try {
    const [user] = await db
      .select({ isActive: usersTable.isActive, displayName: usersTable.displayName, deletedAt: usersTable.deletedAt })
      .from(usersTable)
      .where(eq(usersTable.id, decoded.userId))
      .limit(1);

    if (!user || !user.isActive) {
      if (user) {
        const reason = user.deletedAt ? "member was deleted" : "account deactivated";
        db.insert(activityLogsTable).values({
          userId: decoded.userId,
          displayName: user.displayName ?? `User #${decoded.userId}`,
          action: "blocked_access",
          details: `Blocked (${reason}): ${req.method} ${req.path}`,
          ipAddress: req.ip ?? "unknown",
        }).catch(() => {});
      }
      res.status(401).json({ error: "Account is deactivated. Contact your administrator." });
      return;
    }
  } catch (err) {
    logger.error({ err, userId: decoded.userId }, "requireAuth: DB isActive check failed — failing closed");
    res.status(503).json({ error: "Service temporarily unavailable. Please try again in a moment." });
    return;
  }

  // ── Session whitelist check ───────────────────────────────────────────────
  // The token must exist in the sessions table. On logout the row is deleted,
  // so recycled tokens are rejected immediately — no waiting for JWT expiry.
  let sessionRow: { id: number; tokenHash: string } | undefined;
  try {
    const tHash = hashToken(token);
    const [session] = await db
      .select({ id: sessionsTable.id, tokenHash: sessionsTable.tokenHash })
      .from(sessionsTable)
      .where(eq(sessionsTable.tokenHash, tHash))
      .limit(1);

    if (!session) {
      res.status(401).json({ error: "Session has ended. Please sign in again." });
      return;
    }
    sessionRow = session;

    // Update lastSeenAt at most once per 5 minutes (non-blocking — never delays requests).
    const now = Date.now();
    const lastUpdate = lastSeenThrottle.get(tHash) ?? 0;
    if (now - lastUpdate > LAST_SEEN_INTERVAL) {
      lastSeenThrottle.set(tHash, now);
      db.update(sessionsTable)
        .set({ lastSeenAt: new Date() })
        .where(eq(sessionsTable.tokenHash, tHash))
        .catch(() => {});
    }
  } catch (err) {
    logger.error({ err, userId: decoded.userId }, "requireAuth: session whitelist check failed — failing closed");
    res.status(503).json({ error: "Service temporarily unavailable. Please try again in a moment." });
    return;
  }

  req.userId    = decoded.userId;
  req.userRole  = decoded.role;
  req.rawToken  = token;
  req.sessionId = sessionRow?.id;
  next();
}

export function requireRole(roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    if (!roles.includes(req.userRole ?? "member")) {
      res.status(403).json({ error: "Forbidden — insufficient role" });
      return;
    }
    next();
  };
}

export function generateToken(userId: number, role: string, expiresIn: string = "2d"): string {
  return jwt.sign({ userId, role }, JWT_SECRET, { expiresIn });
}
