import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
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
}

export async function requireAuth(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  // Prefer HttpOnly cookie (XSS-safe). Fall back to Authorization header for
  // backward compatibility during rolling deployments.
  let token: string | undefined;

  const cookieToken = (req as any).cookies?.dcl_token as string | undefined;
  if (cookieToken) {
    token = cookieToken;
  } else {
    const header = req.headers.authorization;
    if (header?.startsWith("Bearer ")) {
      token = header.slice(7);
    }
  }

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

  // FIX: re-check isActive on every request so that deactivated accounts are
  // blocked immediately instead of retaining access until their JWT expires (up to 7 days).
  try {
    const [user] = await db
      .select({ isActive: usersTable.isActive })
      .from(usersTable)
      .where(eq(usersTable.id, decoded.userId))
      .limit(1);

    if (!user || !user.isActive) {
      res.status(401).json({ error: "Account is deactivated. Contact your administrator." });
      return;
    }
  } catch (err) {
    // If the DB check fails (e.g. transient connection error), log and fail open
    // rather than blocking all users during an outage. The JWT signature still
    // guarantees the token was issued by this server.
    logger.warn({ err, userId: decoded.userId }, "requireAuth: DB isActive check failed — failing open");
  }

  req.userId = decoded.userId;
  req.userRole = decoded.role;
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
