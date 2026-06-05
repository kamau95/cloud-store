import { Response } from "express";
import { PrismaClient, Provider } from "@prisma/client";
import { z } from "zod";
import { AuthRequest } from "../types";

const prisma = new PrismaClient();

export const createProductSchema = z.object({
  name: z.string().min(1),
  provider: z.nativeEnum(Provider),
  description: z.string().min(1),
  priceUsd: z.number().positive(),
  region: z.string().optional(),
});

export const updateProductSchema = createProductSchema.partial();

import * as vault from "../services/vault";

async function enrichStock(products: Array<Record<string, unknown>>): Promise<Array<Record<string, unknown>>> {
  for (const p of products) {
    if (p.provider === "API_KEY") {
      p.stock = await vault.countApiKeyStock(p.id as string);
    } else {
      const count = await prisma.credential.count({
        where: { provider: p.provider as Provider, claimed: false },
      });
      p.stock = count;
    }
  }
  return products;
}

export async function listProducts(req: AuthRequest, res: Response): Promise<void> {
  const { provider } = req.query;
  const where: Record<string, unknown> = { active: true };
  if (provider) where.provider = provider;

  const products = await prisma.product.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });

  res.json(await enrichStock(products));
}

export async function getProduct(req: AuthRequest, res: Response): Promise<void> {
  const product = await prisma.product.findUnique({
    where: { id: req.params.id },
  });

  if (!product) {
    res.status(404).json({ error: "Product not found" });
    return;
  }

  const enriched = await enrichStock([product]);
  res.json(enriched[0]);
}

export async function createProduct(req: AuthRequest, res: Response): Promise<void> {
  const product = await prisma.product.create({
    data: {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      ...req.body,
      stock: 0,
    },
  });
  res.status(201).json(product);
}

export async function updateProduct(req: AuthRequest, res: Response): Promise<void> {
  const existing = await prisma.product.findUnique({ where: { id: req.params.id } });
  if (!existing) {
    res.status(404).json({ error: "Product not found" });
    return;
  }

  const { stock: _, ...data } = req.body;
  const product = await prisma.product.update({
    where: { id: req.params.id },
    data,
  });

  res.json(product);
}

export async function deleteProduct(req: AuthRequest, res: Response): Promise<void> {
  const existing = await prisma.product.findUnique({ where: { id: req.params.id } });
  if (!existing) {
    res.status(404).json({ error: "Product not found" });
    return;
  }

  await prisma.product.update({
    where: { id: req.params.id },
    data: { active: false },
  });
  res.json({ deactivated: true });
}
