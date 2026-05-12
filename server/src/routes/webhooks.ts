import { Router } from "express";
import * as webhooks from "../controllers/webhooks";

const router = Router();

router.post("/coinbase", webhooks.handleCoinbaseWebhook);
router.post("/btcpay", webhooks.handleBTCPayWebhook);

export default router;
