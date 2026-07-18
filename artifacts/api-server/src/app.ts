import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import compression from "compression";
import pinoHttp from "pino-http";
import router from "./routes";
import { startFcmWorker } from "./lib/fcm";
import { logger } from "./lib/logger";

const app: Express = express();

app.use(compression());

// Security headers
app.use((_req: Request, res: Response, next: NextFunction) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "0");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "geolocation=(), camera=(), microphone=()");
  if (process.env.NODE_ENV === "production") {
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }
  next();
});

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return { id: req.id, method: req.method, url: req.url?.split("?")[0] };
      },
      res(res) {
        return { statusCode: res.statusCode };
      },
    },
  }),
);

// CORS
const extraOrigins = (process.env.ALLOWED_ORIGINS ?? "").split(",").map(s => s.trim()).filter(Boolean);
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (process.env.NODE_ENV !== "production") return callback(null, true);
      if (origin.endsWith(".onrender.com")) return callback(null, true);
      if (origin.endsWith(".web.app")) return callback(null, true);
      if (origin.endsWith(".firebaseapp.com")) return callback(null, true);
      if (origin === "https://localhost") return callback(null, true);
      if (origin === "capacitor://localhost") return callback(null, true);
      if (origin === "http://localhost") return callback(null, true);
      if (extraOrigins.some(o => origin === o)) return callback(null, true);
      logger.warn({ origin }, "CORS: rejected request from unlisted origin");
      callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  }),
);

app.use(cookieParser());
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true, limit: "2mb" }));

// ── General API rate limiter ──────────────────────────────────────────────────
// Auth endpoints have their own tighter in-memory limit (5 req / 15 min).
// This catches scraping and DoS on all other API routes.
//
// Key strategy: use the authenticated userId so that many users sharing the
// same church WiFi (and therefore the same public IP) each get their own
// independent bucket. Unauthenticated requests fall back to IP.
const apiRateMap = new Map<string, { count: number; resetAt: number }>();
const API_MAX = 1000;          // per user (or IP) per window
const API_WINDOW_MS = 15 * 60 * 1000;

setInterval(() => {
  const now = Date.now();
  for (const [key, e] of apiRateMap) {
    if (now > e.resetAt) apiRateMap.delete(key);
  }
}, 5 * 60 * 1000).unref();

/** Extract a rate-limit key: prefer userId from JWT, fall back to IP. */
function extractRateLimitKey(req: Request): string {
  // Try Authorization: Bearer <jwt>
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    try {
      const raw = authHeader.slice(7).split(".")[1];
      const payload = JSON.parse(Buffer.from(raw, "base64").toString("utf8")) as Record<string, unknown>;
      if (payload.userId) return `user:${payload.userId}`;
    } catch { /* fall through */ }
  }
  // Try httpOnly cookie dcl_token
  const cookies = (req as Request & { cookies?: Record<string, string> }).cookies;
  const cookie = cookies?.dcl_token;
  if (cookie) {
    try {
      const raw = cookie.split(".")[1];
      const payload = JSON.parse(Buffer.from(raw, "base64").toString("utf8")) as Record<string, unknown>;
      if (payload.userId) return `user:${payload.userId}`;
    } catch { /* fall through */ }
  }
  return `ip:${req.ip ?? "unknown"}`;
}

app.use("/api", (req: Request, res: Response, next: NextFunction) => {
  if (req.path === "/healthz" || req.path === "/version") return next();
  const key = extractRateLimitKey(req);
  const now = Date.now();
  const e = apiRateMap.get(key);
  if (!e || now > e.resetAt) {
    apiRateMap.set(key, { count: 1, resetAt: now + API_WINDOW_MS });
    return next();
  }
  if (e.count >= API_MAX) {
    logger.warn({ key }, "API rate limit exceeded");
    res.status(429).json({ error: "Too many requests. Please slow down and try again shortly." });
    return;
  }
  e.count++;
  next();
});

app.use("/api", router);

startFcmWorker();

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  logger.error({ err: { message: err.message, stack: err.stack } }, "Unhandled route error");
  if (res.headersSent) return;
  res.status(500).json({ error: "Internal server error" });
});

export default app;
