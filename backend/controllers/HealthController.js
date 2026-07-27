import DatabaseService from "../services/DatabaseService.js";
import BusinessService from "../services/BusinessService.js";
import ReceiptService from "../services/ReceiptService.js";
import config from "../config/index.js";

export const HealthController = {
  async check(req, res, next) {
    try {
      const db = await DatabaseService.status();
      const ping = await DatabaseService.ping();

      let businessCount = 0;
      let receiptCount = 0;
      try {
        const [Business, Receipt] = await Promise.allSettled([
          import("../models/Business.js"),
          import("../models/Receipt.js"),
        ]).then(async (r) => {
          if (db.connected) {
            const [b, rc] = await Promise.all([
              r[0].status === "fulfilled" ? r[0].value.default.estimatedDocumentCount() : 0,
              r[1].status === "fulfilled" ? r[1].value.default.estimatedDocumentCount() : 0,
            ]).catch(() => [0, 0]);
            businessCount = b;
            receiptCount = rc;
          }
          return [r[0], r[1]];
        });
      } catch {
        /* ignore */
      }

      res.status(200).json({
        success: true,
        status: "healthy",
        message: "ReceiptAI API is running",
        data: {
          app: config.app.name,
          version: "1.0.0",
          environment: config.nodeEnv,
          timestamp: new Date().toISOString(),
          database: {
            ...db,
            ping,
          },
          collections: {
            business: businessCount,
            receipts: receiptCount,
          },
          endpoints: {
            business: "/api/business",
            receipts: "/api/receipts",
            health: "/api/health",
          },
        },
      });
    } catch (e) {
      next(e);
    }
  },

  async minimal(_req, res) {
    res.status(200).json({
      status: "healthy",
      timestamp: new Date().toISOString(),
    });
  },
};

export default HealthController;
