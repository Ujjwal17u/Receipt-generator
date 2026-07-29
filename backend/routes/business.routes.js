import { Router } from "express";
import BusinessController from "../controllers/BusinessController.js";
import { validate } from "../middleware/validate.js";
import { BusinessCreateSchema, BusinessUpdateSchema } from "../validators/businessValidator.js";
import { requireDatabase } from "../middleware/database.js";

const router = Router();
router.use(requireDatabase);

router
  .route("/")
  .get(BusinessController.get)
  .post(validate(BusinessCreateSchema.safeParse), BusinessController.upsert)
  .put(validate(BusinessUpdateSchema.safeParse), BusinessController.update)
  .delete(BusinessController.remove);

router.get("/list", BusinessController.list);
router.post("/create", validate(BusinessCreateSchema.safeParse), BusinessController.create);

export default router;
