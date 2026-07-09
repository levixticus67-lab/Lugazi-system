import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import compression from "compression";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

// Gzip/brotli-eligible compression for all responses — cheap win for JSON
// payloads and any static assets served through this app.
app.use(compression());

// Security headers — covers what helmet provides without adding a dependency
app.use((_req: Request, res: Response, next: NextFunction) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "0"); // Disabled — rely on CSP instead
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

// CORS — allow Render, Firebase Hosting, Capacitor (mobile app), and any custom ALLOWED_ORIGINS
const extraOrigins = (process.env.ALLOWED_ORIGINS ?? "").split(",").map(s => s.trim()).filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (process.env.NODE_ENV !== "production") return callback(null, true);
      if (origin.endsWith(".onrender.com")) return callback(null, true);
      if (origin.endsWith(".web.app")) return callback(null, true);
      if (origin.endsWith(".firebaseapp.com")) return callback(null, true);
      // Capacitor Android/iOS WebView origins — required for the mobile APK to reach the API
      if (origin === "https://localhost") return callback(null, true);      // androidScheme: "https"
      if (origin === "capacitor://localhost") return callback(null, true);  // iOS / default scheme
      if (origin === "http://localhost") return callback(null, true);       // fallback cleartext
      if (extraOrigins.some(o => origin === o)) return callback(null, true);
      logger.warn({ origin }, "CORS: rejected request from unlisted origin");
      callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  }),
);

// Parse cookies before routes — required for HttpOnly auth cookie
app.use(cookieParser());
// FIX: reduced body limit from 10mb to 2mb — large payloads were unnecessary and a DoS vector
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true, limit: "2mb" }));

app.use("/api", router);

// FIX: global error handler — catches any unhandled async errors from Express 5 routes
// and returns a clean JSON response instead of hanging or crashing
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  logger.error({ err: { message: err.message, stack: err.stack } }, "Unhandled route error");
  if (res.headersSent) return;
  res.status(500).json({ error: "Internal server error" });
});

export default app;
