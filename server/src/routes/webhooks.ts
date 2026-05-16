import { Router } from "express";
import * as webhooks from "../controllers/webhooks";
import {
  verifyGatewayCryptoWebhook,
  parseRawJson,
} from "../middleware/gatewaycrypto-webhook";

const router = Router();

router.post(
  "/gatewaycrypto",
  verifyGatewayCryptoWebhook,
  parseRawJson,
  webhooks.handleGatewayCryptoWebhook
);

export default router;
