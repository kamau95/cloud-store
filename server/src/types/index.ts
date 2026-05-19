import { Request } from "express";

export interface JwtPayload {
  userId: string;
  id: string;
  email: string;
  role: "USER" | "ADMIN" | "SUPER_ADMIN";
  tokenVersion: number;
}

export type AuthRequest = Request & { user?: JwtPayload };

export interface PaymentoWebhookPayload {
  token: string;
  orderId: string;
  orderStatus: number;
  additionalData?: { key: string; value: string }[];
}

declare global {
  namespace Express {
    interface User {
      id: string;
      userId: string;
      email: string;
      role: "USER" | "ADMIN" | "SUPER_ADMIN";
      tokenVersion: number;
    }
  }
}
