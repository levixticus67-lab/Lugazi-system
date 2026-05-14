import http from "http";
import express, { type Express, type Request, type Response, type NextFunction } from "express";
import { logger } from "./lib/logger";

const LUGAZI_API_PORT = 5001;

const app: Express = express();

app.use((req: Request, res: Response, _next: NextFunction) => {
  const options: http.RequestOptions = {
    hostname: "localhost",
    port: LUGAZI_API_PORT,
    path: req.url,
    method: req.method,
    headers: { ...req.headers, host: `localhost:${LUGAZI_API_PORT}` },
  };

  const proxyReq = http.request(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode ?? 502, proxyRes.headers);
    proxyRes.pipe(res, { end: true });
  });

  proxyReq.on("error", (err) => {
    logger.warn({ err }, "Lugazi API not reachable yet");
    if (!res.headersSent) {
      res.status(502).json({ error: "API server starting up, please retry" });
    }
  });

  req.pipe(proxyReq, { end: true });
});

export default app;
