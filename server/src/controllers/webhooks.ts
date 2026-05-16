import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import * as vault from "../services/vault";
import * as gatewaycrypto from "../services/gatewaycrypto";

const prisma = new PrismaClient();

const GC_STATUSES = {
  COMPLETED: "completed",
  FINISHED: "finished",
} as const;

export async function handleGatewayCryptoWebhook(
  req: Request,
  res: Response
): Promise<void> {
  const event = req.body as gatewaycrypto.GatewayCryptoCallbackPayload;
  const { payment_id, status } = event;

  if (!payment_id) {
    console.warn("GatewayCrypto webhook missing payment_id");
    res.status(200).json({ received: true });
    return;
  }

  if (status !== GC_STATUSES.COMPLETED && status !== GC_STATUSES.FINISHED) {
    console.log(
      `GatewayCrypto webhook: payment ${payment_id} status ${status} not actionable`
    );
    res.status(200).json({ received: true });
    return;
  }

  try {
    const order = await prisma.order.findFirst({
      where: { paymentChargeId: payment_id, paymentProvider: "GATEWAYCRYPTO" },
    });

    if (!order) {
      console.error(`No order found for GatewayCrypto payment ${payment_id}`);
      res.status(200).json({ received: true });
      return;
    }

    const verified = await gatewaycrypto.getPaymentStatus(payment_id);

    if (verified.status !== GC_STATUSES.COMPLETED && verified.status !== GC_STATUSES.FINISHED) {
      console.warn(
        `GatewayCrypto verify: payment ${payment_id} status ${verified.status} not confirmed`
      );
      res.status(200).json({ received: true });
      return;
    }

    await processPayment("GATEWAYCRYPTO", payment_id, order.id);
  } catch (err) {
    console.error(
      `GatewayCrypto verify failed for payment ${payment_id}:`,
      (err as Error).message
    );
  }

  res.status(200).json({ received: true });
}

async function processPayment(
  provider: "GATEWAYCRYPTO",
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
