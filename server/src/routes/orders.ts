import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { validate } from "../middleware/validate";
import * as orders from "../controllers/orders";

const router = Router();

router.post("/checkout", authenticate, validate(orders.checkoutSchema), orders.checkout);
router.get("/checkout/:id", authenticate, orders.getCheckoutDetails);
router.get("/my", authenticate, orders.getMyOrders);
router.get("/:id/status", authenticate, orders.getOrderPaymentStatus);
router.get("/:id/credentials", authenticate, orders.getOrderCredentials);

export default router;
