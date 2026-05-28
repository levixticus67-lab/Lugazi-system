import { Request, Response, NextFunction } from "express";
  import jwt from "jsonwebtoken";
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

  export function requireAuth(req: AuthRequest, res: Response, next: NextFunction): void {
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

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: number; role: string };
      req.userId = decoded.userId;
      req.userRole = decoded.role;
      next();
    } catch {
      res.status(401).json({ error: "Unauthorized — invalid token" });
    }
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

  export function generateToken(userId: number, role: string): string {
    return jwt.sign({ userId, role }, JWT_SECRET, { expiresIn: "7d" });
  }
  