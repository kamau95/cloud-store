import { Router } from "express";
import { authenticate, requireAdmin } from "../middleware/auth";
import { validate } from "../middleware/validate";
import * as products from "../controllers/products";

const router = Router();

router.get("/", products.listProducts);
router.get("/:id", products.getProduct);
router.post("/", authenticate, requireAdmin, validate(products.createProductSchema), products.createProduct);
router.put("/:id", authenticate, requireAdmin, validate(products.updateProductSchema), products.updateProduct);
router.delete("/:id", authenticate, requireAdmin, products.deleteProduct);

export default router;
