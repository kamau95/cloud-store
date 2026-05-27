export interface User {
  id: string;
  email: string;
  role: "LOW" | "MID" | "TOP";
  createdAt?: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface Product {
  id: string;
  name: string;
  provider: "AWS" | "GCP" | "AZURE" | "OTHER";
  description: string;
  priceUsd: number;
  region?: string;
  stock: number;
  active: boolean;
  createdAt: string;
}

export interface Order {
  id: string;
  userId: string;
  user?: { email: string };
  productId: string;
  product: Product;
  status: "PENDING" | "PAID" | "DELIVERED" | "CANCELLED";
  paymentProvider: "GATEWAYCRYPTO" | "PAYMENTO" | "NOWPAYMENTS" | null;
  paymentChargeId: string | null;
  amountUsd: number;
  displayedNetworkFee?: number | null;
  payoutTxid?: string | null;
  paidAt: string | null;
  deliveredAt: string | null;
  createdAt: string;
}

export interface FeeBreakdown {
  gatewayFee: number;
  adminFee: number;
  sellerAmount: number;
}

export interface CheckoutResponse {
  orderId: string;
  paymentId: string;
  walletAddress: string;
  amount: number;
  basePrice?: number;
  currency: string;
  network: string;
  expiresAt: string;
  provider: string;
  feeBreakdown?: FeeBreakdown;
}

export interface OrderPaymentStatus {
  orderId: string;
  status: string;
  delivered: boolean;
  credentialId: string | null;
}
