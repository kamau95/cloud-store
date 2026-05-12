export interface User {
  id: string;
  email: string;
  role: "USER" | "ADMIN";
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
  specs?: Record<string, unknown>;
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
  paymentProvider: "COINBASE" | "BTCPAY" | null;
  paymentChargeId: string | null;
  vaultCredPath: string | null;
  amountUsd: number;
  paidAt: string | null;
  deliveredAt: string | null;
  createdAt: string;
}

export interface CheckoutResponse {
  orderId: string;
  paymentUrl: string;
  chargeId: string;
  expiresAt?: string;
  provider?: string;
}
