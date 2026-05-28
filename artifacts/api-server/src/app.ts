import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

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

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

export default app;
