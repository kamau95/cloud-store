import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import * as vault from "../services/vault";
import { CoinbaseWebhookEvent, BTCPayWebhookEvent } from "../types";

const prisma = new PrismaClient();

export async function handleCoinbaseWebhook(req: Request, res: Response): Promise<void> {
  const event = req.body as CoinbaseWebhookEvent;

  if (event.type === "charge:confirmed" || event.type === "charge:completed") {
    const chargeId = event.data.id;
    const metadata = event.data.metadata || {};
    const orderId = metadata.orderId;

    if (orderId) {
      await processPayment("COINBASE", chargeId, orderId);
    } else {
      console.warn(`Coinbase webhook missing orderId metadata for charge ${chargeId}`);
    }
  }

  res.status(200).json({ received: true });
}

export async function handleBTCPayWebhook(req: Request, res: Response): Promise<void> {
  const event = req.body as BTCPayWebhookEvent;

  if (event.type === "InvoiceReceivedPayment" || event.type === "InvoiceSettled") {
    const invoiceId = event.invoiceId;
    const orderId = event.metadata?.orderId;

    if (orderId) {
      await processPayment("BTCPAY", invoiceId, orderId);
    } else {
      console.warn(`BTCPay webhook missing orderId metadata for invoice ${invoiceId}`);
    }
  }

  res.status(200).json({ received: true });
}

async function processPayment(
  provider: "COINBASE" | "BTCPAY",
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
      vaultCredPath: reserved.id,
    },
  });

  await prisma.product.update({
    where: { id: order.productId },
    data: { stock: { decrement: 1 } },
  });

  console.log(`Order ${orderId} auto-delivered via ${provider} payment ${chargeId}`);
}
