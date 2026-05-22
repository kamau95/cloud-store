import { PrismaClient, Provider } from "@prisma/client";
import { supabaseAdmin } from "./services/session";

const prisma = new PrismaClient();

async function ensureUser(email: string, password: string, role: "USER" | "ADMIN" | "SUPER_ADMIN") {
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (error) {
    if (error.message.includes("already registered")) {
      const { data: { users } } = await supabaseAdmin.auth.admin.listUsers();
      const existing = users?.find((u) => u.email === email);
      if (existing) {
        await prisma.user.upsert({
          where: { id: existing.id },
          update: { role },
          create: { id: existing.id, email, role },
        });
      }
      return;
    }
    console.error(`Failed to create user ${email}:`, error.message);
    return;
  }

  const uid = data.user!.id;
  await prisma.user.upsert({
    where: { id: uid },
    update: { email, role },
    create: { id: uid, email, role },
  });
}

export async function seedDatabase() {
  await ensureUser("admin@cloudstore.com", "admin123", "ADMIN");
  await ensureUser("dev@cloudstore.com", "super123", "SUPER_ADMIN");
  await ensureUser("user@test.com", "user123", "USER");

  const products = [
    {
      id: "aws-developer-account",
      name: "AWS Developer Account",
      provider: Provider.AWS,
      description: "Full access AWS developer account with $100 credits. Ideal for testing and development.",
      priceUsd: 49.99,
      region: "us-east-1",
      specs: { credits: 100, support: "basic", services: ["EC2", "S3", "RDS", "Lambda"] },
      stock: 10,
    },
    {
      id: "aws-production-account",
      name: "AWS Production Account",
      provider: Provider.AWS,
      description: "Production-ready AWS account with $500 credits, high limits, and premium support.",
      priceUsd: 199.99,
      region: "us-east-1",
      specs: { credits: 500, support: "business", services: ["EC2", "S3", "RDS", "Lambda", "ECS", "EKS"] },
      stock: 5,
    },
    {
      id: "gcp-starter-account",
      name: "GCP Starter Account",
      provider: Provider.GCP,
      description: "Google Cloud Platform account with $200 credits. Includes Compute Engine, Cloud Storage, and more.",
      priceUsd: 59.99,
      region: "us-central1",
      specs: { credits: 200, support: "basic", services: ["Compute Engine", "Cloud Storage", "Cloud SQL"] },
      stock: 10,
    },
    {
      id: "azure-dev-account",
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
      where: { id: product.id },
      update: {},
      create: product,
    });
  }

  console.log("Seed complete");
}
