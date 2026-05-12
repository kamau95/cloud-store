import fetch from "node-fetch";
import { BTCPayInvoice } from "../types";

const BTCPAY_URL = process.env.BTCPAY_URL || "http://localhost:49392";
const API_KEY = process.env.BTCPAY_API_KEY || "";
const STORE_ID = process.env.BTCPAY_STORE_ID || "";

export async function createInvoice(
  amountUsd: number,
  orderId: string,
  buyerEmail?: string
): Promise<BTCPayInvoice> {
  const res = await fetch(`${BTCPAY_URL}/api/v1/stores/${STORE_ID}/invoices`, {
    method: "POST",
    headers: {
      Authorization: `token ${API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount: amountUsd.toFixed(2),
      currency: "USD",
      metadata: { orderId },
      checkout: {
        speedPolicy: "MediumSpeed",
        paymentMethods: ["BTC", "USDT", "USDC", "ETH"],
        requiresRefundEmail: false,
      },
      additionalSearchTerms: [buyerEmail || ""],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`BTCPay error (${res.status}): ${err}`);
  }

  const data = (await res.json()) as BTCPayInvoice;
  return data;
}

export async function getInvoice(invoiceId: string): Promise<BTCPayInvoice> {
  const res = await fetch(
    `${BTCPAY_URL}/api/v1/stores/${STORE_ID}/invoices/${invoiceId}`,
    {
      headers: { Authorization: `token ${API_KEY}` },
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`BTCPay error (${res.status}): ${err}`);
  }

  return res.json() as Promise<BTCPayInvoice>;
}
