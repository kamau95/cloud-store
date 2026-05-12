import { Router } from "express";
import { authenticate, requireAdmin } from "../middleware/auth";
import { validate } from "../middleware/validate";
import * as admin from "../controllers/admin";

const router = Router();

router.use(authenticate, requireAdmin);

router.get("/products", admin.listAllProducts);
router.get("/users", admin.getUsers);
router.get("/orders", admin.getAllOrders);
router.patch("/orders/:id/deliver", admin.deliverOrder);
router.post("/accounts/upload", validate(admin.uploadAccountsSchema), admin.uploadAccounts);
router.get("/accounts", admin.listAccountPool);

export default router;
