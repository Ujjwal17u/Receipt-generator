import { ensureDatabase } from "../middleware/database.js";
import config from "../config/index.js";
import mongoose from "mongoose";

export const DatabaseService = {
  async status() {
    const connected = await ensureDatabase();
    return {
      connected,
      readyState: mongoose.connection.readyState,
      dbName: config.mongodb.dbName,
      uriConfigured:
        Boolean(config.mongodb.uri) && !config.mongodb.uri.includes("username:password"),
      environment: config.nodeEnv,
    };
  },

  async ping() {
    if (mongoose.connection.readyState === 1) {
      const db = mongoose.connection.db;
      if (db) {
        try {
          await db.command({ ping: 1 });
          return true;
        } catch {
          return false;
        }
      }
    }
    return false;
  },
};

export default DatabaseService;
