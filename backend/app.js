import express from "express";
import config from "./config/index.js";

import loggerMiddleware from "./middleware/logger.js";
import { securityMiddleware, rateLimitMiddleware, sanitizeBody } from "./middleware/security.js";
import { corsMiddleware, preflightHandler } from "./middleware/cors.js";
import { errorHandlerMiddleware, notFoundHandler } from "./middleware/errorHandler.js";

import healthRoutes from "./routes/health.routes.js";
import businessRoutes from "./routes/business.routes.js";
import receiptRoutes from "./routes/receipt.routes.js";

export function createApp() {
  const app = express();
  app.set("trust proxy", 1);
  app.disable("x-powered-by");

  app.use(preflightHandler);
  app.use(corsMiddleware());
  app.use(securityMiddleware());
  app.use(loggerMiddleware());
  app.use(
    express.json({
      limit: "5mb",
      strict: true,
    }),
  );
  app.use(express.urlencoded({ extended: true, limit: "2mb" }));
  app.use(sanitizeBody());
  app.use(rateLimitMiddleware());

  app.get("/", (_req, res) => {
    res.json({
      success: true,
      message: `${config.app.name} API`,
      docs: "/api/health",
      version: "1.0.0",
    });
  });

  app.use("/api", healthRoutes);
  app.use("/api/business", businessRoutes);
  app.use("/api/receipts", receiptRoutes);

  app.use((req, _res, next) => {
    if (req.path.startsWith("/api/")) return next();
    res.status(404).json({
      success: false,
      message: `Use /api/* prefix. Available: /api/health, /api/business, /api/receipts`,
      code: "NO_PREFIX",
    });
  });

  app.use(notFoundHandler);
  app.use(errorHandlerMiddleware);
  return app;
}

export default createApp;
