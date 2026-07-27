import createApp from "../backend/app.js";
import config from "../backend/config/index.js";
import { connectDatabase } from "../backend/database/connection.js";

const app = createApp();

export default async function handler(req, res) {
  try {
    await connectDatabase();
  } catch (e) {
    console.warn("[Vercel] DB unavailable:", e.message);
  }
  return app(req, res);
}

if (process.argv[1] && process.argv[1].includes("api")) {
  const port = config.port;
  (async () => {
    try {
      await connectDatabase();
      console.log(`[DB] Connected to ${config.mongodb.dbName}`);
    } catch (e) {
      console.warn(`[DB] Not connected: ${e.message}`);
    }
    app.listen(port, () => {
      console.log(`🚀 ReceiptAI API on http://localhost:${port}`);
      console.log(`   Health: http://localhost:${port}/api/health`);
      console.log(`   Env: ${config.nodeEnv}`);
    });
  })();
}
