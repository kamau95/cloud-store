import { Router, Request, Response, NextFunction } from "express";
import crypto from "crypto";
import * as webhooks from "../controllers/webhooks";

const IPN_SECRET = process.env.NOWPAYMENTS_IPN_SECRET || "";

function verifyNowPaymentsIPN(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (!IPN_SECRET) {
    console.warn("NOWPAYMENTS_IPN_SECRET not set, skipping IPN verification");
    next();
    return;
  }

  const signature = req.headers["x-nowpayments-sig"] as string;
  if (!signature) {
    res.status(401).json({ error: "Missing IPN signature" });
    return;
  }

  const rawBody = (req.body as Buffer).toString("utf8");
  let body: Record<string, unknown>;
  try {
    body = JSON.parse(rawBody);
  } catch {
    res.status(400).json({ error: "Invalid JSON body" });
    return;
  }

  const sortedKeys = Object.keys(body).sort();
  const sortedBody: Record<string, unknown> = {};
  for (const key of sortedKeys) {
    sortedBody[key] = body[key];
  }
  const payload = JSON.stringify(sortedBody);

  const hmac = crypto.createHmac("sha512", IPN_SECRET);
  hmac.update(payload);
  const expected = hmac.digest("hex");

  try {
    const sigBuffer = Buffer.from(signature, "hex");
    const expectedBuffer = Buffer.from(expected, "hex");
    if (
      sigBuffer.length !== expectedBuffer.length ||
      !crypto.timingSafeEqual(sigBuffer, expectedBuffer)
    ) {
      res.status(401).json({ error: "Invalid IPN signature" });
      return;
    }
  } catch {
    res.status(401).json({ error: "Invalid IPN signature" });
    return;
  }

  req.body = body;
  next();
}

const router = Router();

router.post("/nowpayments", verifyNowPaymentsIPN, webhooks.handleNowPaymentsWebhook);

export default router;
