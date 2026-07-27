import { config as dotenvConfig } from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envPath =
  process.env.VERCEL || process.env.NODE_ENV === "production"
    ? null
    : path.resolve(__dirname, "..", ".env.local");

if (envPath) {
  dotenvConfig({ path: envPath });
}

export const config = Object.freeze({
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT) || 3001,
  isProd: process.env.NODE_ENV === "production",
  isDev: process.env.NODE_ENV !== "production",

  mongodb: {
    uri: process.env.MONGODB_URI || "",
    dbName: process.env.DATABASE_NAME || "receipt_ai",
  },

  app: {
    name: process.env.PUBLIC_APP_NAME || "ReceiptAI",
    url: process.env.PUBLIC_APP_URL || "http://localhost:8080",
    apiBaseUrl: process.env.API_BASE_URL || "http://localhost:3001/api",
    defaultBusinessId: process.env.DEFAULT_BUSINESS_ID || "default",
  },

  security: {
    jwtSecret: process.env.JWT_SECRET || "dev_secret_replace_in_production_32chars_min",
  },

  rateLimit: {
    windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
    max: Number(process.env.RATE_LIMIT_MAX) || 200,
  },

  cors: {
    origin: process.env.CORS_ORIGIN
      ? process.env.CORS_ORIGIN.split(",").map((s) => s.trim())
      : true,
    credentials: true,
  },
});

export function requireEnv(key, fallback) {
  const v = process.env[key];
  if (v !== undefined && v !== "") return v;
  if (fallback !== undefined) return fallback;
  throw new Error(`Missing required env variable: ${key}`);
}

export default config;
