import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import * as vault from "../services/vault";

const prisma = new PrismaClient();

export async function handleCoinbaseWebhook(req: Request, res: Response): Promise<void> {
  const event = req.body;

  if (event.type === "charge:confirmed") {
    const chargeId = event.data.id;
    const metadata = event.data.metadata || {};

    await processPayment("COINBASE", chargeId, metadata.orderId);
  }

  res.status(200).json({ received: true });
}

export async function handleBTCPayWebhook(req: Request, res: Response): Promise<void> {
  const event = req.body;

  if (event.type === "InvoiceReceivedPayment" || event.type === "InvoiceSettled") {
    const invoiceId = event.invoiceId;
    const orderId = event.metadata?.orderId;

    if (orderId) {
      await processPayment("BTCPAY", invoiceId, orderId);
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

  if (!order || order.status !== "PENDING") return;

  const reserved = await vault.reserveCredential(order.product.provider);
  if (!reserved) {
    console.error(`No available credentials for ${order.product.provider}`);
    await prisma.order.update({
      where: { id: orderId },
      data: { status: "CANCELLED" },
    });
    return;
  }

  await prisma.order.update({
    where: { id: orderId },
    data: {
      status: "DELIVERED",
      paidAt: new Date(),
      deliveredAt: new Date(),
      vaultCredPath: reserved.id,
    },
  });

  await prisma.product.update({
    where: { id: order.productId },
    data: { stock: { decrement: 1 } },
  });
}
