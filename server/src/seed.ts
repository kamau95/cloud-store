import { PrismaClient, Provider, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

export async function seedDatabase() {
  const adminPassword = await bcrypt.hash("admin123", 12);
  await prisma.user.upsert({
    where: { email: "admin@cloudstore.com" },
    update: {},
    create: {
      email: "admin@cloudstore.com",
      passwordHash: adminPassword,
      role: Role.ADMIN,
    },
  });

  const userPassword = await bcrypt.hash("user123", 12);
  await prisma.user.upsert({
    where: { email: "user@test.com" },
    update: {},
    create: {
      email: "user@test.com",
      passwordHash: userPassword,
      role: Role.USER,
    },
  });

  const products = [
    {
      name: "AWS Developer Account",
      provider: Provider.AWS,
      description: "Full access AWS developer account with $100 credits. Ideal for testing and development.",
      priceUsd: 49.99,
      region: "us-east-1",
      specs: { credits: 100, support: "basic", services: ["EC2", "S3", "RDS", "Lambda"] },
      stock: 10,
    },
    {
      name: "AWS Production Account",
      provider: Provider.AWS,
      description: "Production-ready AWS account with $500 credits, high limits, and premium support.",
      priceUsd: 199.99,
      region: "us-east-1",
      specs: { credits: 500, support: "business", services: ["EC2", "S3", "RDS", "Lambda", "ECS", "EKS"] },
      stock: 5,
    },
    {
      name: "GCP Starter Account",
      provider: Provider.GCP,
      description: "Google Cloud Platform account with $200 credits. Includes Compute Engine, Cloud Storage, and more.",
      priceUsd: 59.99,
      region: "us-central1",
      specs: { credits: 200, support: "basic", services: ["Compute Engine", "Cloud Storage", "Cloud SQL"] },
      stock: 10,
    },
    {
      name: "Azure Dev Account",
      provider: Provider.AZURE,
      description: "Microsoft Azure account with $150 credits for development and testing.",
      priceUsd: 44.99,
      region: "eastus",
      specs: { credits: 150, support: "basic", services: ["VMs", "Blob Storage", "SQL Database"] },
      stock: 8,
    },
  ];

  for (const product of products) {
    await prisma.product.upsert({
      where: { id: product.name.toLowerCase().replace(/\s+/g, "-") },
      update: {},
      create: {
        id: product.name.toLowerCase().replace(/\s+/g, "-"),
        ...product,
      },
    });
  }

  console.log("Seed complete");
}
