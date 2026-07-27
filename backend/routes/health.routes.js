import { Router } from "express";
import { HealthController } from "../controllers/HealthController.js";
import { requireDatabase } from "../middleware/database.js";

const router = Router();

router.get("/health", HealthController.check);
router.get("/healthz", HealthController.minimal);
router.get("/health/db", requireDatabase, HealthController.check);

export default router;
