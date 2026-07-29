import { Router } from "express";
import ReceiptController from "../controllers/ReceiptController.js";
import { validate, validateQuery } from "../middleware/validate.js";
import {
  ReceiptCreateSchema,
  ReceiptUpdateSchema,
  ReceiptListSchema,
} from "../validators/receiptValidator.js";
import { requireDatabase } from "../middleware/database.js";

const router = Router();
router.use(requireDatabase);

router.get("/", validateQuery(ReceiptListSchema.safeParse), ReceiptController.list);
router.post("/", validate(ReceiptCreateSchema.safeParse), ReceiptController.create);

router.get("/utils/amount-to-words", ReceiptController.utilsAmountToWords);
router.get("/utils/qr", ReceiptController.utilsQR);
router.get("/utils/next-number", ReceiptController.nextNumber);

router.get("/:id", ReceiptController.get);
router.get("/:id/preview", ReceiptController.preview);
router.put("/:id", validate(ReceiptUpdateSchema.safeParse), ReceiptController.update);
router.delete("/:id", ReceiptController.remove);

export default router;
