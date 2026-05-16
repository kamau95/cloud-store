import { Response } from "express";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";
import { AuthRequest } from "../types";
import * as gatewaycrypto from "../services/gatewaycrypto";
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
    const { paymentAmount, adminFee, gatewayFee, sellerAmount } =
      gatewaycrypto.calculateFees(product.priceUsd);

    const result = await gatewaycrypto.createPayment(
      "USDT",
      paymentAmount,
      order.id
    );

    await prisma.order.update({
      where: { id: order.id },
      data: {
        paymentProvider: "GATEWAYCRYPTO",
        paymentChargeId: result.payment_id,
        cryptoAddress: result.wallet_address,
        cryptoAmount: parseFloat(result.amount),
        cryptoCurrency: result.currency,
        cryptoNetwork: "TRC-20",
        cryptoExpiresAt: new Date(result.expires_at),
        gatewayFee,
        adminFee,
        sellerAmount,
      },
    });

    res.json({
      orderId: order.id,
      paymentId: result.payment_id,
      walletAddress: result.wallet_address,
      amount: parseFloat(result.amount),
      basePrice: product.priceUsd,
      currency: result.currency,
      network: "TRC-20",
      expiresAt: result.expires_at,
      provider: "gatewaycrypto",
      feeBreakdown: {
        gatewayFee,
        adminFee,
        sellerAmount,
      },
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

export async function getCheckoutDetails(
  req: AuthRequest,
  res: Response
): Promise<void> {
  const order = await prisma.order.findUnique({
    where: { id: req.params.id },
    include: { product: true },
  });

  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return;
  }

  if (order.userId !== req.user!.userId && req.user!.role !== "ADMIN") {
    res.status(403).json({ error: "Not your order" });
    return;
  }

  if (order.paymentProvider !== "GATEWAYCRYPTO") {
    res.status(400).json({ error: "Not a GatewayCrypto order" });
    return;
  }

  res.json({
    orderId: order.id,
    paymentId: order.paymentChargeId,
    walletAddress: order.cryptoAddress,
    amount: order.cryptoAmount || order.amountUsd,
    currency: order.cryptoCurrency || "USDT",
    network: order.cryptoNetwork || "TRC-20",
    expiresAt: order.cryptoExpiresAt?.toISOString(),
    provider: "gatewaycrypto",
    status: order.status,
  });
}

export async function getOrderPaymentStatus(
  req: AuthRequest,
  res: Response
): Promise<void> {
  const order = await prisma.order.findUnique({
    where: { id: req.params.id },
    select: {
      id: true,
      status: true,
      paymentProvider: true,
      credentialId: true,
    },
  });

  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return;
  }

  if (order.paymentProvider !== "GATEWAYCRYPTO") {
    res.status(400).json({ error: "Not a GatewayCrypto order" });
    return;
  }

  res.json({
    orderId: order.id,
    status: order.status,
    delivered: order.status === "DELIVERED",
    credentialId: order.credentialId,
  });
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
