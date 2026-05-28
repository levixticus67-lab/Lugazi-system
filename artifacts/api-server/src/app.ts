import express, { type Express, type Request, type Response, type NextFunction } from "express";
  import cors from "cors";
  import cookieParser from "cookie-parser";
  import pinoHttp from "pino-http";
  import router from "./routes";
  import { logger } from "./lib/logger";

  const app: Express = express();

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

  // CORS — allow Render, Firebase Hosting, and any custom ALLOWED_ORIGINS
  const extraOrigins = (process.env.ALLOWED_ORIGINS ?? "").split(",").map(s => s.trim()).filter(Boolean);

  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        if (process.env.NODE_ENV !== "production") return callback(null, true);
        if (origin.endsWith(".onrender.com")) return callback(null, true);
        if (origin.endsWith(".web.app")) return callback(null, true);
        if (origin.endsWith(".firebaseapp.com")) return callback(null, true);
        if (extraOrigins.some(o => origin === o)) return callback(null, true);
        logger.warn({ origin }, "CORS: rejected request from unlisted origin");
        callback(new Error("Not allowed by CORS"));
      },
      credentials: true,
    }),
  );

  // Parse cookies before routes — required for HttpOnly auth cookie
  app.use(cookieParser());
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true }));

  app.use("/api", router);

  export default app;
  