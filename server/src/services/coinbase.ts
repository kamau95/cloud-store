import fetch from "node-fetch";
import { CoinbaseCharge } from "../types";

const API_KEY = process.env.COINBASE_COMMERCE_API_KEY || "";
const API_URL = "https://api.commerce.coinbase.com";

export async function createCharge(
  name: string,
  description: string,
  amountUsd: number,
  metadata: Record<string, string>
): Promise<CoinbaseCharge> {
  const res = await fetch(`${API_URL}/charges`, {
    method: "POST",
    headers: {
      "X-CC-Api-Key": API_KEY,
      "X-CC-Version": "2018-03-22",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name,
      description,
      pricing_type: "fixed_price",
      local_price: { amount: amountUsd.toFixed(2), currency: "USD" },
      metadata,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Coinbase error (${res.status}): ${err}`);
  }

  const json = (await res.json()) as { data: CoinbaseCharge };
  return json.data;
}

export async function retrieveCharge(chargeId: string): Promise<CoinbaseCharge> {
  const res = await fetch(`${API_URL}/charges/${chargeId}`, {
    headers: { "X-CC-Api-Key": API_KEY, "X-CC-Version": "2018-03-22" },
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Coinbase error (${res.status}): ${err}`);
  }

  const json = (await res.json()) as { data: CoinbaseCharge };
  return json.data;
}
