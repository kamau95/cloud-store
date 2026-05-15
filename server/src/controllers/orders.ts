import { Response } from "express";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";
import { AuthRequest } from "../types";
import * as paymento from "../services/paymento";
import * as vault from "../services/vault";

const prisma = new PrismaClient();

export const checkoutSchema = z.object({
  productId: z.string().min(1),
});

export async function checkout(req: AuthRequest, res: Response): Promise<void> {
  const { productId } = req.body;
  const userId = req.user!.userId;

  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product || !product.active) {
    res.status(404).json({ error: "Product not found or unavailable" });
    return;
  }

  if (product.stock < 1) {
    res.status(400).json({ error: "Out of stock" });
    return;
  }

  const order = await prisma.order.create({
    data: {
      userId,
      productId: product.id,
      status: "PENDING",
      amountUsd: product.priceUsd,
    },
  });

  try {
    const returnUrl = `${process.env.FRONTEND_URL || "http://localhost:5173"}/orders/${order.id}`;
    const result = await paymento.createPayment(product.priceUsd, order.id, returnUrl);

    await prisma.order.update({
      where: { id: order.id },
      data: { paymentProvider: "PAYMENTO", paymentChargeId: result.token },
    });

    res.json({
      orderId: order.id,
      paymentUrl: result.paymentUrl,
      chargeId: result.token,
      provider: "paymento",
    });
  } catch (err) {
    await prisma.order.update({
      where: { id: order.id },
      data: { status: "CANCELLED" },
    });

    res.status(502).json({
      error: "Payment provider failed",
      details: (err as Error).message,
    });
  }
}

export async function getMyOrders(req: AuthRequest, res: Response): Promise<void> {
  const orders = await prisma.order.findMany({
    where: { userId: req.user!.userId },
    include: { product: true },
    orderBy: { createdAt: "desc" },
  });

  res.json(orders);
}

export async function getOrderCredentials(req: AuthRequest, res: Response): Promise<void> {
  const order = await prisma.order.findUnique({
    where: { id: req.params.id },
  });

  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return;
  }

  if (order.userId !== req.user!.userId && req.user!.role !== "ADMIN") {
    res.status(403).json({ error: "Not your order" });
    return;
  }

  if (order.status !== "DELIVERED") {
    res.status(400).json({ error: "Order not yet delivered" });
    return;
  }

  if (!order.credentialId) {
    res.status(404).json({ error: "No credentials found for this order" });
    return;
  }

  const creds = await vault.getCredential(order.credentialId);
  if (!creds) {
    res.status(404).json({ error: "Credentials not found in vault" });
    return;
  }

  res.json({
    ...creds,
    warning: "These credentials are shown once. Save them securely.",
  });
}
