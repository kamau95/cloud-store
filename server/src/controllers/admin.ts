import { Request, Response } from "express";
import { PrismaClient, Provider } from "@prisma/client";
import { z } from "zod";
import { AuthRequest } from "../types";
import * as vault from "../services/vault";
import { firebaseAdmin } from "../services/firebase";
import { sendDeliveryNotification, sendOrderConfirmation } from "../services/email";

const prisma = new PrismaClient();

export async function listAllProducts(req: AuthRequest, res: Response): Promise<void> {
  let products: any[] = await prisma.product.findMany({
    orderBy: { createdAt: "desc" },
  });
  for (const p of products) {
    const count = await prisma.credential.count({
      where: { provider: p.provider as Provider, claimed: false },
    });
    p.stock = count;
  }
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
  const { search, dateFrom, dateTo } = req.query;

  const where: Record<string, unknown> = {};

  if (search) {
    where.OR = [
      { id: { contains: search as string, mode: "insensitive" } },
      { user: { email: { contains: search as string, mode: "insensitive" } } },
    ];
  }

  if (dateFrom || dateTo) {
    const createdAt: Record<string, Date> = {};
    if (dateFrom) createdAt.gte = new Date(dateFrom as string);
    if (dateTo) createdAt.lte = new Date(dateTo as string);
    where.createdAt = createdAt;
  }

  const orders = await prisma.order.findMany({
    where,
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
    include: { user: { select: { email: true } } },
  });

  sendDeliveryNotification(updated.user.email, order.id, order.product.name).catch(() => {});

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

export const updateWalletSchema = z.object({
  walletAddress: z.string().min(1),
});

export async function updateUserWallet(
  req: AuthRequest,
  res: Response
): Promise<void> {
  const { walletAddress } = req.body;
  const user = await prisma.user.findUnique({ where: { id: req.params.id } });
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  await prisma.user.update({
    where: { id: user.id },
    data: { walletAddress },
  });
  res.json({ message: "Wallet updated" });
}

export const uploadAccountsSchema = z.object({
  accounts: z.array(
    z.object({
      provider: z.enum(["AWS", "GCP", "AZURE", "OTHER"]),
      email: z.string().email(),
      password: z.string().min(1),
      accessKey: z.string().optional(),
      secretKey: z.string().optional(),
      region: z.string().optional(),
      sellerId: z.string().optional(),
    })
  ),
});

export async function uploadAccounts(req: AuthRequest, res: Response): Promise<void> {
  const { accounts } = req.body;
  let uploaded = 0;
  const errors: string[] = [];

  for (const account of accounts) {
    try {
      const credId = `${account.provider.toLowerCase()}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const credData: Record<string, unknown> = {
        id: credId,
        provider: account.provider,
        email: account.email,
        password: account.password,
        accessKey: account.accessKey,
        secretKey: account.secretKey,
        region: account.region,
        sellerId: account.sellerId || null,
      };
      await prisma.credential.create({ data: credData as any });
      uploaded++;
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

export const updateRoleSchema = z.object({
  role: z.enum(["LOW", "MID", "TOP"]),
});

export async function updateUserRole(req: AuthRequest, res: Response): Promise<void> {
  const { role } = req.body;
  const { id } = req.params;

  if (req.user?.id === id) {
    res.status(400).json({ error: "Cannot change your own role" });
    return;
  }

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  if (role === "TOP") {
    res.status(400).json({ error: "Cannot promote to TOP via this endpoint" });
    return;
  }

  const updated = await prisma.user.update({
    where: { id },
    data: { role },
    select: { id: true, email: true, role: true, createdAt: true },
  });

  res.json(updated);
}

export const inviteAdminSchema = z.object({
  email: z.string().email(),
});

export async function inviteAdmin(req: AuthRequest, res: Response): Promise<void> {
  const { email } = req.body;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    await prisma.user.update({
      where: { id: existing.id },
      data: { role: "MID" },
    });
    res.json({ message: "User promoted to admin" });
    return;
  }

  let firebaseUid: string;
  try {
    const userRecord = await firebaseAdmin.auth().createUser({
      email,
      password: Math.random().toString(36).slice(2, 18),
      emailVerified: false,
    });
    firebaseUid = userRecord.uid;
  } catch (err: any) {
    if (err.code === "auth/email-already-exists") {
      const userRecord = await firebaseAdmin.auth().getUserByEmail(email);
      firebaseUid = userRecord.uid;
    } else {
      res.status(500).json({ error: "Failed to create Firebase user" });
      return;
    }
  }

  await prisma.user.upsert({
    where: { id: firebaseUid },
    update: { email, role: "MID" },
    create: { id: firebaseUid, email, role: "MID" },
  });

  const apiKey = process.env.FIREBASE_API_KEY;
  if (apiKey) {
    await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requestType: "PASSWORD_RESET", email }),
    }).catch(() => {});
  }

  res.json({ message: "Admin invited. Password reset email sent." });
}

export async function deleteUser(req: AuthRequest, res: Response): Promise<void> {
  const { id } = req.params;

  if (req.user?.id === id) {
    res.status(400).json({ error: "Cannot delete yourself" });
    return;
  }

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  if (user.role === "TOP") {
    res.status(400).json({ error: "Cannot delete super admin" });
    return;
  }

  await prisma.$transaction([
    prisma.order.deleteMany({ where: { userId: id } }),
    prisma.user.delete({ where: { id } }),
  ]);

  res.json({ message: "User deleted" });
}

export const purgeUsersSchema = z.object({
  before: z.string().refine((d) => !isNaN(Date.parse(d)), { message: "Invalid date" }),
});

export async function purgeUsers(req: AuthRequest, res: Response): Promise<void> {
  const { before } = req.body;
  const cutoff = new Date(before);

  const targetUsers = await prisma.user.findMany({
    where: { createdAt: { lt: cutoff }, role: { not: "TOP" } },
    select: { id: true, email: true, createdAt: true },
  });

  const ids = targetUsers.map((u) => u.id);
  if (ids.length === 0) {
    res.json({ deleted: 0, message: "No users found before that date" });
    return;
  }

  await prisma.$transaction([
    prisma.order.deleteMany({ where: { userId: { in: ids } } }),
    prisma.user.deleteMany({ where: { id: { in: ids } } }),
  ]);

  res.json({
    deleted: ids.length,
    users: targetUsers.map((u) => ({ email: u.email, joined: u.createdAt })),
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

export async function handlePayoutCallback(req: Request, res: Response): Promise<void> {
  const auth = req.headers.authorization;
  if (auth !== `Bearer ${process.env.INTERNAL_API_KEY}`) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const { event, orderId, amount, maintenanceFee, sellerPayout, payoutTxid } = req.body;
  if (!event || !orderId) {
    res.status(400).json({ error: "Missing event or orderId" });
    return;
  }

  try {
    if (event === "payment_received") {
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: { product: true, user: { select: { email: true } } },
      });
      if (!order) {
        res.status(404).json({ error: "Order not found" });
        return;
      }
      if (order.status !== "PENDING") {
        res.json({ received: true });
        return;
      }

      await prisma.order.update({
        where: { id: orderId },
        data: {
          status: "PAID",
          paymentProvider: "NOWPAYMENTS",
          displayedNetworkFee: maintenanceFee || null,
          sellerAmount: sellerPayout || null,
          paidAt: new Date(),
        },
      });

      const reserved = await vault.reserveCredential(order.product.provider);
      if (!reserved) {
        console.error(`No credentials for ${order.product.provider}, order ${orderId}`);
        res.json({ received: true });
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

      sendOrderConfirmation(order.user.email, orderId, order.product.name, amount || order.amountUsd).catch(() => {});
      sendDeliveryNotification(order.user.email, orderId, order.product.name).catch(() => {});

      console.log(`Order ${orderId} auto-delivered via split server callback`);
    } else if (event === "payout_completed" && payoutTxid) {
      await prisma.order.update({
        where: { id: orderId },
        data: { payoutTxid },
      });
      console.log(`Order ${orderId} payout TXID: ${payoutTxid}`);
    }

    res.json({ received: true });
  } catch (err) {
    console.error("Payout callback error:", err);
    res.status(500).json({ error: "Internal error" });
  }
}
