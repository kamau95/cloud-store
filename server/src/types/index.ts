import { Request } from "express";

export interface JwtPayload {
  userId: string;
  email: string;
  role: "USER" | "ADMIN";
}

export interface AuthRequest extends Request {
  user?: JwtPayload;
}

export interface CoinbaseCharge {
  id: string;
  resource: "charge";
  code: string;
  name: string;
  description: string;
  pricing_type: "fixed_price" | "no_price";
  pricing: {
    local: { amount: string; currency: string };
    bitcoin?: { amount: string; currency: string };
    ethereum?: { amount: string; currency: string };
    usdc?: { amount: string; currency: string };
    usdt?: { amount: string; currency: string };
  };
  hosted_url: string;
  expires_at: string;
  timeline: { status: string; time: string }[];
  metadata?: Record<string, string>;
}

export interface CoinbaseWebhookEvent {
  id: string;
  type: string;
  data: {
    id: string;
    code: string;
    name: string;
    timeline: { status: string; time: string }[];
    pricing: Record<string, unknown>;
    metadata?: Record<string, string>;
  };
}

export interface BTCPayWebhookEvent {
  type: string;
  invoiceId: string;
  metadata?: {
    orderId: string;
  };
  status: string;
}

export interface BTCPayInvoice {
  id: string;
  checkoutLink: string;
  status: string;
  amount: string;
  currency: string;
  createdTime: number;
}
