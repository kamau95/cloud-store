import { Response } from "express";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";
import { AuthRequest } from "../types";
import * as coinbase from "../services/coinbase";
import * as btcpay from "../services/btcpay";
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
    const charge = await coinbase.createCharge(
      product.name,
      `Order #${order.id}`,
      product.priceUsd,
      { orderId: order.id, userId }
    );

    await prisma.order.update({
      where: { id: order.id },
      data: { paymentProvider: "COINBASE", paymentChargeId: charge.id },
    });

    res.json({
      orderId: order.id,
      paymentUrl: charge.hosted_url,
      chargeId: charge.id,
      expiresAt: charge.expires_at,
    });
  } catch (err) {
    console.warn("Coinbase failed, falling back to BTCPay:", (err as Error).message);

    try {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      const invoice = await btcpay.createInvoice(
        product.priceUsd,
        order.id,
        user?.email
      );

      await prisma.order.update({
        where: { id: order.id },
        data: { paymentProvider: "BTCPAY", paymentChargeId: invoice.id },
      });

      res.json({
        orderId: order.id,
        paymentUrl: invoice.checkoutLink,
        chargeId: invoice.id,
        provider: "btcpay",
      });
    } catch (btcpayErr) {
      await prisma.order.update({
        where: { id: order.id },
        data: { status: "CANCELLED" },
      });

      res.status(502).json({
        error: "Both payment providers failed",
        coinbaseError: (err as Error).message,
        btcpayError: (btcpayErr as Error).message,
      });
    }
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

  if (!order.vaultCredPath) {
    res.status(404).json({ error: "No credentials found for this order" });
    return;
  }

  const creds = await vault.getCredential(order.vaultCredPath);
  if (!creds) {
    res.status(404).json({ error: "Credentials not found in vault" });
    return;
  }

  res.json({
    ...creds,
    warning: "These credentials are shown once. Save them securely.",
  });
}
