import { Request, Response, NextFunction } from "express";
import crypto from "crypto";

const PAYMENTO_WEBHOOK_SECRET = process.env.PAYMENTO_WEBHOOK_SECRET || "";

export function verifyPaymentoWebhook(req: Request, res: Response, next: NextFunction): void {
  if (!PAYMENTO_WEBHOOK_SECRET) {
    console.warn("PAYMENTO_WEBHOOK_SECRET not set, skipping signature verification");
    next();
    return;
  }

  const signature = req.headers["x-hmac-sha256-signature"] as string;
  if (!signature) {
    res.status(401).json({ error: "Missing webhook signature" });
    return;
  }

  const rawBody = (req.body as Buffer).toString();
  const expected = crypto
    .createHmac("sha256", PAYMENTO_WEBHOOK_SECRET)
    .update(rawBody)
    .digest("hex");

  try {
    const sigBuffer = Buffer.from(signature, "hex");
    const expectedBuffer = Buffer.from(expected, "hex");
    if (sigBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(sigBuffer, expectedBuffer)) {
      res.status(401).json({ error: "Invalid webhook signature" });
      return;
    }
  } catch {
    res.status(401).json({ error: "Invalid webhook signature" });
    return;
  }

  next();
}

export function parseRawJson(req: Request, _res: Response, next: NextFunction): void {
  if (Buffer.isBuffer(req.body)) {
    try {
      req.body = JSON.parse(req.body.toString());
    } catch {
      req.body = {};
    }
  }
  next();
}
