import fetch from "node-fetch";

const API_KEY = process.env.PAYMENTO_API_KEY || "";
const API_URL = "https://api.paymento.io/v1";

export interface PaymentoPaymentResponse {
  success: boolean;
  message: string;
  body: string;
}

export interface PaymentoVerifyResponse {
  success: boolean;
  message: string;
  body: {
    token: string;
    orderId: string;
    orderStatus: number;
    additionalData?: { key: string; value: string }[];
  };
}

export interface PaymentoWebhookPayload {
  token: string;
  orderId: string;
  orderStatus: number;
  additionalData?: { key: string; value: string }[];
}

const PAYMENTO_STATUS = {
  INITIALIZE: 0,
  PENDING: 1,
  PARTIAL_PAID: 2,
  WAITING_TO_CONFIRM: 3,
  TIMEOUT: 4,
  USER_CANCELED: 5,
  PAID: 7,
  APPROVE: 8,
  REJECT: 9,
} as const;

export async function createPayment(
  amountUsd: number,
  orderId: string,
  returnUrl: string
): Promise<{ token: string; paymentUrl: string }> {
  const res = await fetch(`${API_URL}/payment/request`, {
    method: "POST",
    headers: {
      "Api-Key": API_KEY,
      "Content-Type": "application/json",
      Accept: "text/plain",
    },
    body: JSON.stringify({
      fiatAmount: amountUsd.toFixed(2),
      fiatCurrency: "USD",
      orderId,
      ReturnUrl: returnUrl,
      Speed: 0,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Paymento error (${res.status}): ${err}`);
  }

  const json = (await res.json()) as PaymentoPaymentResponse;

  if (!json.success || !json.body) {
    throw new Error(`Paymento error: ${json.message || "Failed to create payment"}`);
  }

  return {
    token: json.body,
    paymentUrl: `https://app.paymento.io/gateway?token=${json.body}`,
  };
}

export async function verifyPayment(token: string): Promise<PaymentoVerifyResponse["body"]> {
  const res = await fetch(`${API_URL}/payment/verify`, {
    method: "POST",
    headers: {
      "Api-Key": API_KEY,
      "Content-Type": "application/json",
      Accept: "text/plain",
    },
    body: JSON.stringify({ token }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Paymento verify error (${res.status}): ${err}`);
  }

  const json = (await res.json()) as PaymentoVerifyResponse;

  if (!json.success) {
    throw new Error(`Paymento verify failed: ${json.message}`);
  }

  return json.body;
}

export async function setIPNUrl(url: string): Promise<void> {
  const res = await fetch(`${API_URL}/payment/settings`, {
    method: "POST",
    headers: {
      "Api-Key": API_KEY,
      "Content-Type": "application/json",
      Accept: "text/plain",
    },
    body: JSON.stringify({
      IPN_Url: url,
      IPN_Method: 1,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Paymento settings error (${res.status}): ${err}`);
  }
}
