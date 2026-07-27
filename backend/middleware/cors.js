import cors from "cors";
import config from "../config/index.js";

export function corsMiddleware() {
  return cors({
    origin: config.cors.origin,
    credentials: config.cors.credentials,
    methods: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "X-CSRF-Token",
      "X-Requested-With",
      "Accept",
      "Accept-Version",
      "Content-Length",
      "Content-MD5",
      "Content-Type",
      "Date",
      "X-Api-Version",
      "Authorization",
      "x-vercel-ip-country",
    ],
    maxAge: 60 * 60,
    preflightContinue: false,
    optionsSuccessStatus: 204,
  });
}

export function preflightHandler(req, res, next) {
  if (req.method === "OPTIONS") {
    res.set({
      "Access-Control-Max-Age": "3600",
      "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type,Authorization",
    });
    return res.status(204).end();
  }
  next();
}

export default {
  cors: corsMiddleware,
  preflight: preflightHandler,
};
