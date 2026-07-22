import http from "http";
import app from "./app";
import { logger } from "./lib/logger";
import { pool } from "@workspace/db";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

// Warn at startup when optional-but-important env vars are missing.
if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
  logger.warn("GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET not set — Google OAuth will not work");
}
if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
  logger.warn("FIREBASE_SERVICE_ACCOUNT not set — FCM push notifications will not work");
}
if (!process.env.RENDER_EXTERNAL_URL) {
  logger.warn("RENDER_EXTERNAL_URL not set — keep-alive self-ping is disabled");
}

const server = http.createServer(app);

server.listen(port, (err?: Error) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");

  // Keep-alive: ping own public URL every 10 minutes so Render free tier never sleeps.
  // RENDER_EXTERNAL_URL is set automatically by Render — no manual config needed.
  // We ping through the public URL (not localhost) so Render counts it as real inbound traffic.
  const selfUrl = process.env.RENDER_EXTERNAL_URL;
  if (selfUrl && process.env.NODE_ENV === "production") {
    setInterval(async () => {
      try {
        const res = await fetch(`${selfUrl}/api/healthz`);
        logger.info({ status: res.status }, "Keep-alive ping OK");
      } catch (err) {
        logger.warn({ err }, "Keep-alive ping failed");
      }
    }, 10 * 60 * 1000).unref(); // .unref() so it never blocks a clean shutdown
  }
});

// ── Graceful shutdown ─────────────────────────────────────────────────────────
// Render sends SIGTERM before restarting/stopping the instance. Without this,
// in-flight requests are dropped and the DB pool is abandoned.
async function shutdown(signal: string): Promise<void> {
  logger.info({ signal }, "Shutdown signal received — closing server");

  // Force-exit after 10 s if something hangs.
  const forceExit = setTimeout(() => {
    logger.error("Graceful shutdown timed out — forcing exit");
    process.exit(1);
  }, 10_000).unref();

  try {
    await new Promise<void>((resolve, reject) =>
      server.close((err) => (err ? reject(err) : resolve())),
    );
    logger.info("HTTP server closed");

    await pool.end();
    logger.info("DB pool closed");

    clearTimeout(forceExit);
    process.exit(0);
  } catch (err) {
    logger.error({ err }, "Error during graceful shutdown");
    process.exit(1);
  }
}

process.on("SIGTERM", () => { void shutdown("SIGTERM"); });
process.on("SIGINT",  () => { void shutdown("SIGINT"); });
