import crypto from "crypto";
import fetch from "node-fetch";

const BASE_URL = "https://api.gatewaycrypto.io";
const PAYMENT_PATH = "/api/payment/v1/payments";

const PUBLIC_KEY = process.env.GATEWAYCRYPTO_PUBLIC_KEY || "";
const PRIVATE_KEY = process.env.GATEWAYCRYPTO_PRIVATE_KEY || "";
const CALLBACK_URL =
  process.env.GATEWAYCRYPTO_CALLBACK_URL ||
  `${process.env.APP_URL || "http://localhost:3001"}/api/orders/webhook/gatewaycrypto`;

export const ASSUMED_FEE = parseFloat(
  process.env.GATEWAYCRYPTO_ASSUMED_FEE || "0.01"
);
export const ADMIN_FEE_PERCENT = parseFloat(
  process.env.GATEWAYCRYPTO_ADMIN_FEE_PERCENT || "0.05"
);

const PRIVATE_KEY_PEM = `-----BEGIN PRIVATE KEY-----\n${PRIVATE_KEY}\n-----END PRIVATE KEY-----`;

function signRequest(
  method: string,
  path: string,
  bodyRaw: Record<string, unknown>,
  windowSec = 3600
): { signature: string; publicKey: string; timestamp: number } {
  const bodyJSON = JSON.stringify(bodyRaw);
  const body =
    bodyJSON !== "{}"
      ? Buffer.from(bodyJSON).toString("base64")
      : "";

  const timestamp = Math.floor(Date.now() / 1000) + windowSec;
  const payload = [method, path, body, String(timestamp)].join(":");

  const signer = crypto.createSign("RSA-SHA256");
  signer.update(payload);
  signer.end();
  const rawSignature = signer.sign(PRIVATE_KEY_PEM, "base64");

  const signature = Buffer.from(
    [rawSignature, String(timestamp)].join(":")
  ).toString("base64");

  return { signature, publicKey: PUBLIC_KEY, timestamp };
}

async function apiRequest<T>(
  method: string,
  path: string,
  bodyRaw: Record<string, unknown>
): Promise<T> {
  const { signature, publicKey, timestamp } = signRequest(
    method,
    path,
    bodyRaw
  );

  const bodyJSON =
    Object.keys(bodyRaw).length > 0 ? JSON.stringify(bodyRaw) : "{}";

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      "X-Api-Key": publicKey,
      "X-Signature": signature,
      "Content-Type": "application/json",
    },
    body: method === "POST" ? bodyJSON : undefined,
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`GatewayCrypto error (${res.status}): ${err}`);
  }

  return (await res.json()) as T;
}

export interface GatewayCryptoCreatePaymentRequest {
  nominal_currency: string;
  nominal_amount: string;
  order_id?: string;
  callback_url?: string;
}

export interface GatewayCryptoPaymentResponse {
  payment_id: string;
  wallet_address: string;
  amount: string;
  currency: string;
  status: string;
  expires_at: string;
}

export interface GatewayCryptoCallbackPayload {
  payment_id: string;
  status: string;
  nominal_currency?: string;
  nominal_amount?: string;
  actually_paid?: string;
  txid?: string;
  confirmations?: number;
  order_id?: string;
}

export function calculateFees(productPriceUsd: number): {
  paymentAmount: number;
  adminFee: number;
  gatewayFee: number;
  sellerAmount: number;
} {
  const adminFee = productPriceUsd * ADMIN_FEE_PERCENT;
  const gatewayFee = productPriceUsd * ASSUMED_FEE;
  const sellerAmount = productPriceUsd - adminFee - gatewayFee;
  return {
    paymentAmount: productPriceUsd,
    adminFee: Math.round(adminFee * 100) / 100,
    gatewayFee: Math.round(gatewayFee * 100) / 100,
    sellerAmount: Math.round(sellerAmount * 100) / 100,
  };
}

export async function createPayment(
  currency: string,
  amount: number,
  orderId: string
): Promise<GatewayCryptoPaymentResponse> {
  const body: GatewayCryptoCreatePaymentRequest = {
    nominal_currency: currency,
    nominal_amount: amount.toFixed(2),
    order_id: orderId,
    callback_url: CALLBACK_URL,
  };

  return apiRequest<GatewayCryptoPaymentResponse>("POST", PAYMENT_PATH, body as unknown as Record<string, unknown>);
}

export async function getPaymentStatus(
  paymentId: string
): Promise<GatewayCryptoPaymentResponse> {
  return apiRequest<GatewayCryptoPaymentResponse>(
    "GET",
    `${PAYMENT_PATH}/${paymentId}`,
    {} as Record<string, unknown>
  );
}

export { PUBLIC_KEY, PRIVATE_KEY_PEM };
