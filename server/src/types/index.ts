import { Request } from "express";

export interface JwtPayload {
  userId: string;
  email: string;
  role: "USER" | "ADMIN";
}

export interface AuthRequest extends Request {
  user?: JwtPayload;
}

export interface PaymentoWebhookPayload {
  token: string;
  orderId: string;
  orderStatus: number;
  additionalData?: { key: string; value: string }[];
}
