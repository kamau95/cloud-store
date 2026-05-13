import { Router } from "express";
import * as webhooks from "../controllers/webhooks";
import { verifyCoinbaseWebhook, verifyBTCPayWebhook, parseRawJson } from "../middleware/webhook";

const router = Router();

router.post("/coinbase", verifyCoinbaseWebhook, parseRawJson, webhooks.handleCoinbaseWebhook);
router.post("/btcpay", verifyBTCPayWebhook, parseRawJson, webhooks.handleBTCPayWebhook);

export default router;
