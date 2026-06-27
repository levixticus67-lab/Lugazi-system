import app from "./app";
import { logger } from "./lib/logger";

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

app.listen(port, (err) => {
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
