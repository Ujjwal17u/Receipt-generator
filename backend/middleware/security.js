import helmet from "helmet";
import rateLimit from "express-rate-limit";
import config from "../config/index.js";

export function securityMiddleware() {
  return helmet({
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        "default-src": ["'self'"],
        "img-src": ["'self'", "data:", "https:"],
        "script-src": ["'self'"],
        "style-src": ["'self'", "'unsafe-inline'"],
      },
    },
    crossOriginEmbedderPolicy: false,
    hsts: config.isProd ? { maxAge: 31536000, includeSubDomains: true } : false,
  });
}

export function rateLimitMiddleware() {
  return rateLimit({
    windowMs: config.rateLimit.windowMs,
    max: config.rateLimit.max,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      message: "Too many requests. Please try again later.",
      code: "RATE_LIMITED",
    },
    skip: (_req) => config.isDev,
  });
}

export function sanitizeBody() {
  return (req, _res, next) => {
    if (req.body && typeof req.body === "object") {
      for (const key of Object.keys(req.body)) {
        const v = req.body[key];
        if (typeof v === "string") {
          if (v.length > 2_000_000) {
            req.body[key] = v.slice(0, 2_000_000);
          }
          if (key === "$where" || key.startsWith("$") && !key.startsWith("data:")) {
            delete req.body[key];
          }
        }
      }
    }
    next();
  };
}

export default {
  security: securityMiddleware,
  rateLimit: rateLimitMiddleware,
  sanitize: sanitizeBody,
};
