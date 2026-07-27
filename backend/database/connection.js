import mongoose from "mongoose";
import config from "../config/index.js";

const state = {
  connected: false,
  promise: null,
  retries: 0,
};

const MAX_RETRIES = 3;

export async function connectDatabase() {
  if (state.connected && mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  if (state.promise) {
    return state.promise;
  }

  const uri = config.mongodb.uri;
  if (!uri || uri.includes("username:password")) {
    const err = new Error(
      "MONGODB_URI is not configured properly. Copy .env.example to .env.local and set your MongoDB Atlas URI.",
    );
    err.code = "MISSING_MONGODB_URI";
    state.promise = null;
    throw err;
  }

  state.promise = (async () => {
    try {
      await mongoose.connect(uri, {
        dbName: config.mongodb.dbName,
        maxPoolSize: config.isProd ? 10 : 5,
        minPoolSize: 0,
        serverSelectionTimeoutMS: config.isProd ? 5000 : 10000,
        socketTimeoutMS: 45000,
      });

      state.connected = true;
      state.retries = 0;

      mongoose.connection.on("disconnected", () => {
        state.connected = false;
      });
      mongoose.connection.on("reconnected", () => {
        state.connected = true;
      });
      mongoose.connection.on("error", (e) => {
        console.error("[DB] Connection error:", e.message);
        state.connected = false;
      });

      return mongoose.connection;
    } catch (err) {
      state.promise = null;
      state.retries += 1;
      if (state.retries < MAX_RETRIES) {
        console.warn(
          `[DB] Retry ${state.retries}/${MAX_RETRIES} after error: ${err.message}`,
        );
        await new Promise((r) => setTimeout(r, 500 * state.retries));
        return connectDatabase();
      }
      state.connected = false;
      throw err;
    }
  })();

  return state.promise;
}

export function isConnected() {
  return state.connected && mongoose.connection.readyState === 1;
}

export async function disconnectDatabase() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    state.connected = false;
    state.promise = null;
  }
}

export default {
  connect: connectDatabase,
  disconnect: disconnectDatabase,
  isConnected,
  connection: () => mongoose.connection,
};
