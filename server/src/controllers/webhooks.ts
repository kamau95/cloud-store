import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import * as vault from "../services/vault";
import * as paymento from "../services/paymento";
import { PaymentoWebhookPayload } from "../types";

const prisma = new PrismaClient();

const PAYMENTO_STATUS = {
  PAID: 7,
  APPROVE: 8,
} as const;

export async function handlePaymentoWebhook(req: Request, res: Response): Promise<void> {
  const event = req.body as PaymentoWebhookPayload;
  const { token, orderId, orderStatus } = event;

  if (!token || !orderId) {
    console.warn("Paymento webhook missing token or orderId");
    res.status(200).json({ received: true });
    return;
  }

  if (orderStatus !== PAYMENTO_STATUS.PAID && orderStatus !== PAYMENTO_STATUS.APPROVE) {
    console.log(`Paymento webhook: order ${orderId} status ${orderStatus} not actionable`);
    res.status(200).json({ received: true });
    return;
  }

  try {
    const verified = await paymento.verifyPayment(token);

    if (verified.orderStatus !== PAYMENTO_STATUS.PAID && verified.orderStatus !== PAYMENTO_STATUS.APPROVE) {
      console.warn(`Paymento verify: order ${orderId} status ${verified.orderStatus} not confirmed`);
      res.status(200).json({ received: true });
      return;
    }

    await processPayment("PAYMENTO", token, orderId);
  } catch (err) {
    console.error(`Paymento verify failed for order ${orderId}:`, (err as Error).message);
  }

  res.status(200).json({ received: true });
}

async function processPayment(
  provider: "PAYMENTO",
  chargeId: string,
  orderId: string
): Promise<void> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { product: true },
  });

  if (!order) {
    console.error(`Order ${orderId} not found for ${provider} payment ${chargeId}`);
    return;
  }

  if (order.status !== "PENDING") {
    console.warn(`Order ${orderId} already has status ${order.status}, skipping`);
    return;
  }

  await prisma.order.update({
    where: { id: orderId },
    data: {
      status: "PAID",
      paymentProvider: provider,
      paymentChargeId: chargeId,
      paidAt: new Date(),
    },
  });

  const reserved = await vault.reserveCredential(order.product.provider);
  if (!reserved) {
    console.error(`No available credentials for ${order.product.provider}, order ${orderId} will need manual delivery`);
    return;
  }

  await prisma.order.update({
    where: { id: orderId },
    data: {
      status: "DELIVERED",
      deliveredAt: new Date(),
      credentialId: reserved.id,
    },
  });

  await prisma.product.update({
    where: { id: order.productId },
    data: { stock: { decrement: 1 } },
  });

  console.log(`Order ${orderId} auto-delivered via ${provider} payment ${chargeId}`);
}
