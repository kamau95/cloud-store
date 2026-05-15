import { Router } from "express";
import * as webhooks from "../controllers/webhooks";
import { verifyPaymentoWebhook, parseRawJson } from "../middleware/webhook";

const router = Router();

router.post("/paymento", verifyPaymentoWebhook, parseRawJson, webhooks.handlePaymentoWebhook);

export default router;
