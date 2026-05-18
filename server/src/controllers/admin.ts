import { Response } from "express";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";
import { AuthRequest } from "../types";
import * as vault from "../services/vault";

const prisma = new PrismaClient();

export const uploadAccountsSchema = z.object({
  accounts: z.array(
    z.object({
      provider: z.enum(["AWS", "GCP", "AZURE", "OTHER"]),
      email: z.string().email(),
      password: z.string().min(1),
      accessKey: z.string().optional(),
      secretKey: z.string().optional(),
      region: z.string().optional(),
      specs: z.record(z.unknown()).optional(),
    })
  ),
});

export async function listAllProducts(req: AuthRequest, res: Response): Promise<void> {
  const products = await prisma.product.findMany({
    orderBy: { createdAt: "desc" },
  });
  res.json(products);
}

export async function getUsers(req: AuthRequest, res: Response): Promise<void> {
  const users = await prisma.user.findMany({
    select: { id: true, email: true, role: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });
  res.json(users);
}

export async function getAllOrders(req: AuthRequest, res: Response): Promise<void> {
  const orders = await prisma.order.findMany({
    include: { user: { select: { email: true } }, product: true },
    orderBy: { createdAt: "desc" },
  });
  res.json(orders);
}

export async function deliverOrder(req: AuthRequest, res: Response): Promise<void> {
  const order = await prisma.order.findUnique({
    where: { id: req.params.id },
    include: { product: true },
  });

  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return;
  }

  const reserved = await vault.reserveCredential(order.product.provider);
  if (!reserved) {
    res.status(400).json({ error: "No available credentials for this provider" });
    return;
  }

  const updated = await prisma.order.update({
    where: { id: order.id },
    data: {
      status: "DELIVERED",
      paidAt: new Date(),
      deliveredAt: new Date(),
      credentialId: reserved.id,
    },
  });

  await prisma.product.update({
    where: { id: order.productId },
    data: { stock: { decrement: 1 } },
  });

  res.json(updated);
}

export async function cancelOrder(req: AuthRequest, res: Response): Promise<void> {
  const order = await prisma.order.findUnique({ where: { id: req.params.id } });
  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return;
  }
  if (order.status !== "PENDING") {
    res.status(400).json({ error: "Only pending orders can be cancelled" });
    return;
  }
  const updated = await prisma.order.update({
    where: { id: order.id },
    data: { status: "CANCELLED" },
  });
  res.json(updated);
}

export async function deleteOrder(req: AuthRequest, res: Response): Promise<void> {
  const order = await prisma.order.findUnique({ where: { id: req.params.id } });
  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return;
  }
  if (order.status !== "CANCELLED") {
    res.status(400).json({ error: "Only cancelled orders can be deleted" });
    return;
  }
  await prisma.order.delete({ where: { id: order.id } });
  res.status(204).send();
}

export async function uploadAccounts(req: AuthRequest, res: Response): Promise<void> {
  const { accounts } = req.body;
  let uploaded = 0;
  const errors: string[] = [];

  for (const account of accounts) {
    try {
      const credId = `${account.provider.toLowerCase()}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      await vault.storeCredential(credId, account);
      uploaded++;

      await prisma.product.updateMany({
        where: { provider: account.provider as never, active: true },
        data: { stock: { increment: 1 } },
      });
    } catch (err) {
      errors.push(`Failed to store ${account.email}: ${(err as Error).message}`);
    }
  }

  res.json({ uploaded, errors: errors.length > 0 ? errors : undefined });
}

export async function getFeeSummary(
  req: AuthRequest,
  res: Response
): Promise<void> {
  const orders = await prisma.order.findMany({
    where: { paymentProvider: "NOWPAYMENTS", status: "DELIVERED" },
    select: { amountUsd: true, adminFee: true, gatewayFee: true, sellerAmount: true },
  });

  const totalProductRevenue = orders.reduce(
    (sum, o) => sum + o.amountUsd,
    0
  );
  const totalAdminFees = orders.reduce(
    (sum, o) => sum + (o.adminFee || 0),
    0
  );
  const totalGatewayFees = orders.reduce(
    (sum, o) => sum + (o.gatewayFee || 0),
    0
  );
  const totalSellerPayouts = orders.reduce(
    (sum, o) => sum + (o.sellerAmount || 0),
    0
  );

  res.json({
    totalOrders: orders.length,
    totalProductRevenue,
    totalAdminFees,
    totalGatewayFees,
    totalSellerPayouts,
    totalCollected: totalProductRevenue,
  });
}

export async function listAccountPool(req: AuthRequest, res: Response): Promise<void> {
  const keys = await vault.listCredentials();
  const accounts = [];

  for (const key of keys) {
    const cred = await vault.getCredential(key);
    if (cred) {
      accounts.push({
        path: key,
        provider: cred.provider,
        email: cred.email,
        claimed: cred.claimed || false,
        claimedAt: cred.claimedAt || null,
      });
    }
  }

  res.json(accounts);
}
