import { Request, Response, NextFunction } from "express";
import crypto from "crypto";

const CALLBACK_PUBLIC_KEY = process.env.GATEWAYCRYPTO_CALLBACK_PUBLIC_KEY || "";
const CALLBACK_PUBLIC_KEY_PEM = CALLBACK_PUBLIC_KEY
  ? `-----BEGIN PUBLIC KEY-----\n${CALLBACK_PUBLIC_KEY}\n-----END PUBLIC KEY-----`
  : "";

export function verifyGatewayCryptoWebhook(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (!CALLBACK_PUBLIC_KEY) {
    console.warn(
      "GATEWAYCRYPTO_CALLBACK_PUBLIC_KEY not set, skipping signature verification"
    );
    next();
    return;
  }

  const signatureHeader = req.headers["x-signature"] as string;
  if (!signatureHeader) {
    res.status(401).json({ error: "Missing webhook signature" });
    return;
  }

  try {
    const decoded = Buffer.from(signatureHeader, "base64").toString("utf8");
    const colonIdx = decoded.lastIndexOf(":");
    if (colonIdx === -1) {
      res.status(401).json({ error: "Invalid signature format" });
      return;
    }

    const signature = decoded.slice(0, colonIdx);
    const timestamp = decoded.slice(colonIdx + 1);

    const rawBody = (req.body as Buffer).toString("utf8");
    const payload = rawBody + ":" + timestamp;

    const verifier = crypto.createVerify("RSA-SHA256");
    verifier.update(payload, "utf8");
    verifier.end();

    const isValid = verifier.verify(CALLBACK_PUBLIC_KEY_PEM, signature, "base64");

    if (!isValid) {
      res.status(401).json({ error: "Invalid webhook signature" });
      return;
    }
  } catch (err) {
    console.error("Webhook signature verification error:", err);
    res.status(401).json({ error: "Invalid webhook signature" });
    return;
  }

  next();
}

export function parseRawJson(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  if (Buffer.isBuffer(req.body)) {
    try {
      req.body = JSON.parse(req.body.toString());
    } catch {
      req.body = {};
    }
  }
  next();
}
