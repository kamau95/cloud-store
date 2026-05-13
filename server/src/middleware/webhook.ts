import { Request, Response, NextFunction } from "express";
import crypto from "crypto";

const COINBASE_WEBHOOK_SECRET = process.env.COINBASE_WEBHOOK_SECRET || "";
const BTCPAY_WEBHOOK_SECRET = process.env.BTCPAY_WEBHOOK_SECRET || "";

export function verifyCoinbaseWebhook(req: Request, res: Response, next: NextFunction): void {
  if (!COINBASE_WEBHOOK_SECRET) {
    console.warn("COINBASE_WEBHOOK_SECRET not set, skipping signature verification");
    next();
    return;
  }

  const signature = req.headers["x-cc-webhook-signature"] as string;
  if (!signature) {
    res.status(401).json({ error: "Missing webhook signature" });
    return;
  }

  const rawBody = (req.body as Buffer).toString();
  const expected = crypto
    .createHmac("sha256", COINBASE_WEBHOOK_SECRET)
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

export function verifyBTCPayWebhook(req: Request, res: Response, next: NextFunction): void {
  if (!BTCPAY_WEBHOOK_SECRET) {
    console.warn("BTCPAY_WEBHOOK_SECRET not set, skipping signature verification");
    next();
    return;
  }

  const sigHeader = req.headers["btcpay-sig"] as string;
  if (!sigHeader) {
    res.status(401).json({ error: "Missing BTCPay webhook signature" });
    return;
  }

  const match = sigHeader.match(/^sha256=([a-f0-9]+)$/);
  if (!match) {
    res.status(401).json({ error: "Invalid BTCPay signature format" });
    return;
  }

  const rawBody = (req.body as Buffer).toString();
  const expected = crypto
    .createHmac("sha256", BTCPAY_WEBHOOK_SECRET)
    .update(rawBody)
    .digest("hex");

  try {
    const sigBuffer = Buffer.from(match[1], "hex");
    const expectedBuffer = Buffer.from(expected, "hex");
    if (sigBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(sigBuffer, expectedBuffer)) {
      res.status(401).json({ error: "Invalid BTCPay webhook signature" });
      return;
    }
  } catch {
    res.status(401).json({ error: "Invalid BTCPay webhook signature" });
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
