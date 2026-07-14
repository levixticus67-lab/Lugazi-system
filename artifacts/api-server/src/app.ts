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

// ── General API rate limiter (Fix: rate-limit all routes, not just auth) ──────
// Auth endpoints have their own tighter limit (5 req / 15 min).
// This catches bulk scraping and DoS against all other API routes.
const apiRateMap = new Map<string, { count: number; resetAt: number }>();
const API_MAX = 300;
const API_WINDOW_MS = 15 * 60 * 1000;

setInterval(() => {
  const now = Date.now();
  for (const [ip, e] of apiRateMap) {
    if (now > e.resetAt) apiRateMap.delete(ip);
  }
}, 5 * 60 * 1000).unref();

app.use("/api", (req: Request, res: Response, next: NextFunction) => {
  // Skip rate-limit for health and version endpoints
  if (req.path === "/healthz" || req.path === "/version") return next();
  const ip = req.ip ?? "unknown";
  const now = Date.now();
  const e = apiRateMap.get(ip);
  if (!e || now > e.resetAt) {
    apiRateMap.set(ip, { count: 1, resetAt: now + API_WINDOW_MS });
    return next();
  }
  if (e.count >= API_MAX) {
    logger.warn({ ip }, "API rate limit exceeded");
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
