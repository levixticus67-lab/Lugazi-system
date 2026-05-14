import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import app from "./app";
import { logger } from "./lib/logger";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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

const LUGAZI_PORT = 5001;

const lugaziDist = path.resolve(
  __dirname,
  "../../../Lugazi-system/artifacts/api-server/dist/index.mjs",
);

function startLugaziServer() {
  const child = spawn("node", ["--enable-source-maps", lugaziDist], {
    env: {
      ...process.env,
      PORT: String(LUGAZI_PORT),
      NODE_ENV: process.env["NODE_ENV"] ?? "development",
    },
    stdio: "inherit",
  });

  child.on("exit", (code, signal) => {
    logger.warn({ code, signal }, "Lugazi API child exited, restarting in 3s");
    setTimeout(startLugaziServer, 3000);
  });

  child.on("error", (err) => {
    logger.error({ err }, "Failed to spawn Lugazi API child");
    setTimeout(startLugaziServer, 3000);
  });

  logger.info({ port: LUGAZI_PORT }, "Lugazi API child process started");
}

startLugaziServer();

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Proxy server listening, forwarding to Lugazi API");
});
