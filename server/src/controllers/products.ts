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
  specs: z.record(z.unknown()).optional(),
  stock: z.number().int().min(0).default(0),
});

export const updateProductSchema = createProductSchema.partial();

export async function listProducts(req: AuthRequest, res: Response): Promise<void> {
  const { provider } = req.query;
  const where: Record<string, unknown> = { active: true };
  if (provider) where.provider = provider;

  const products = await prisma.product.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });

  res.json(products);
}

export async function getProduct(req: AuthRequest, res: Response): Promise<void> {
  const product = await prisma.product.findUnique({
    where: { id: req.params.id },
  });

  if (!product) {
    res.status(404).json({ error: "Product not found" });
    return;
  }

  res.json(product);
}

export async function createProduct(req: AuthRequest, res: Response): Promise<void> {
  const product = await prisma.product.create({ data: req.body });
  res.status(201).json(product);
}

export async function updateProduct(req: AuthRequest, res: Response): Promise<void> {
  const existing = await prisma.product.findUnique({ where: { id: req.params.id } });
  if (!existing) {
    res.status(404).json({ error: "Product not found" });
    return;
  }

  const product = await prisma.product.update({
    where: { id: req.params.id },
    data: req.body,
  });

  res.json(product);
}

export async function deleteProduct(req: AuthRequest, res: Response): Promise<void> {
  const existing = await prisma.product.findUnique({ where: { id: req.params.id } });
  if (!existing) {
    res.status(404).json({ error: "Product not found" });
    return;
  }

  await prisma.product.delete({ where: { id: req.params.id } });
  res.status(204).send();
}
