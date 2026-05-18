import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import * as vault from "../services/vault";

const prisma = new PrismaClient();

export async function handleNowPaymentsWebhook(
  req: Request,
  res: Response
): Promise<void> {
  const event = req.body as Record<string, unknown>;
  const paymentId = event.payment_id as string | undefined;
  const paymentStatus = event.payment_status as string | undefined;

  if (!paymentId) {
    console.warn("NOWPayments webhook missing payment_id");
    res.status(200).json({ received: true });
    return;
  }

  if (paymentStatus !== "finished") {
    console.log(
      `NOWPayments webhook: payment ${paymentId} status ${paymentStatus} not actionable`
    );
    res.status(200).json({ received: true });
    return;
  }

  try {
    const order = await prisma.order.findFirst({
      where: { paymentChargeId: paymentId, paymentProvider: "NOWPAYMENTS" },
    });

    if (!order) {
      console.error(`No order found for NOWPayments payment ${paymentId}`);
      res.status(200).json({ received: true });
      return;
    }

    await processPayment("NOWPAYMENTS", paymentId, order.id);
  } catch (err) {
    console.error(
      `NOWPayments process failed for payment ${paymentId}:`,
      (err as Error).message
    );
  }

  res.status(200).json({ received: true });
}

async function processPayment(
  provider: "NOWPAYMENTS",
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
