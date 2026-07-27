import { connectDatabase, isConnected } from "../database/connection.js";
import { AppError } from "./errorHandler.js";

export async function requireDatabase(req, _res, next) {
  try {
    await connectDatabase();
    if (!isConnected()) {
      return next(
        new AppError(
          "Database connection unavailable. Please configure MONGODB_URI.",
          503,
          "DB_UNAVAILABLE",
        ),
      );
    }
    next();
  } catch (e) {
    const msg =
      e.code === "MISSING_MONGODB_URI"
        ? "MONGODB_URI is not configured. Copy .env.example to .env.local and set your MongoDB Atlas URI."
        : "Database connection error";
    next(new AppError(msg, 503, e.code || "DB_ERROR"));
  }
}

export async function ensureDatabase() {
  try {
    await connectDatabase();
    return true;
  } catch {
    return false;
  }
}

export default {
  require: requireDatabase,
  ensure: ensureDatabase,
};
