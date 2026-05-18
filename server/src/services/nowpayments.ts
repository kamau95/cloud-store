import crypto from "crypto";
import fetch from "node-fetch";

const API_KEY = process.env.NOWPAYMENTS_API_KEY || "";
const API_URL = "https://api.nowpayments.io/v1";
const IPN_SECRET = process.env.NOWPAYMENTS_IPN_SECRET || "";
const CALLBACK_URL =
  process.env.NOWPAYMENTS_CALLBACK_URL ||
  `${process.env.APP_URL || "http://localhost:3001"}/api/orders/webhook/nowpayments`;

export const ASSUMED_FEE = 0.005;
export const ADMIN_FEE_PERCENT = parseFloat(
  process.env.NOWPAYMENTS_ADMIN_FEE_PERCENT || "0.05"
);

export interface NowPaymentsCreatePaymentRequest {
  price_amount: number;
  price_currency: string;
  pay_currency: string;
  order_id?: string;
  order_description?: string;
  ipn_callback_url?: string;
  is_fixed_rate?: boolean;
  is_fee_paid_by_user?: boolean;
}

export interface NowPaymentsPaymentResponse {
  payment_id: string;
  payment_status: string;
  pay_address: string;
  pay_amount: number;
  pay_currency: string;
  price_amount: number;
  price_currency: string;
  order_id?: string;
  order_description?: string;
  purchase_id?: string;
  actually_paid?: number;
  created_at?: string;
  updated_at?: string;
  expiration_estimate_date?: string;
}

export interface NowPaymentsMinAmountResponse {
  currency_from: string;
  currency_to: string;
  min_amount: number;
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

async function apiRequest<T>(
  method: string,
  path: string,
  body?: Record<string, unknown>
): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      "x-api-key": API_KEY,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`NOWPayments error (${res.status}): ${err}`);
  }

  return (await res.json()) as T;
}

export async function getMinAmount(): Promise<number> {
  const result = await apiRequest<NowPaymentsMinAmountResponse>(
    "GET",
    `/min-amount?currency_from=usd&currency_to=usdttrc20&is_fixed_rate=true`
  );
  return result.min_amount;
}

export async function createPayment(
  amountUsd: number,
  orderId: string,
  orderDescription?: string
): Promise<NowPaymentsPaymentResponse> {
  const minAmount = await getMinAmount();
  if (amountUsd < minAmount) {
    throw new Error(
      `Amount $${amountUsd} is below the minimum of $${minAmount.toFixed(2)} for USDT TRC-20`
    );
  }

  const body: NowPaymentsCreatePaymentRequest = {
    price_amount: amountUsd,
    price_currency: "usd",
    pay_currency: "usdttrc20",
    order_id: orderId,
    order_description: orderDescription,
    ipn_callback_url: CALLBACK_URL,
    is_fixed_rate: true,
    is_fee_paid_by_user: true,
  };

  return apiRequest<NowPaymentsPaymentResponse>("POST", "/payment", body as unknown as Record<string, unknown>);
}

export async function getPaymentStatus(
  paymentId: string
): Promise<NowPaymentsPaymentResponse> {
  return apiRequest<NowPaymentsPaymentResponse>(
    "GET",
    `/payment/${paymentId}`
  );
}

export function verifyIPN(
  body: Record<string, unknown>,
  signature: string
): boolean {
  if (!IPN_SECRET) {
    console.warn("NOWPAYMENTS_IPN_SECRET not set, skipping signature verification");
    return true;
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
    if (sigBuffer.length !== expectedBuffer.length) return false;
    return crypto.timingSafeEqual(sigBuffer, expectedBuffer);
  } catch {
    return false;
  }
}
