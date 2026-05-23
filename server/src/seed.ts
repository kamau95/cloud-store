import { PrismaClient, Provider } from "@prisma/client";
import { firebaseAdmin } from "./services/firebase";

const prisma = new PrismaClient();

async function ensureUser(email: string, password: string, role: "LOW" | "MID" | "TOP") {
  let firebaseUid: string;

  try {
    const userRecord = await firebaseAdmin.auth().createUser({
      email,
      password,
      emailVerified: true,
    });
    firebaseUid = userRecord.uid;
  } catch (err: any) {
    if (err.code === "auth/email-already-exists") {
      const userRecord = await firebaseAdmin.auth().getUserByEmail(email);
      firebaseUid = userRecord.uid;
      await firebaseAdmin.auth().updateUser(firebaseUid, { password, emailVerified: true });
    } else {
      return;
    }
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing && existing.id !== firebaseUid) {
    await prisma.$transaction([
      prisma.$executeRawUnsafe(`UPDATE "Order" SET "userId" = $1 WHERE "userId" = $2`, firebaseUid, existing.id),
      prisma.$executeRawUnsafe(`UPDATE "User" SET id = $1, role = $2 WHERE id = $3`, firebaseUid, role, existing.id),
    ]);
  } else {
    await prisma.user.upsert({
      where: { id: firebaseUid },
      update: { email, role },
      create: { id: firebaseUid, email, role },
    });
  }
}

async function migrateExistingUsers() {
  const dbUsers = await prisma.user.findMany();

  for (const dbUser of dbUsers) {
    try {
      await firebaseAdmin.auth().getUser(dbUser.id);
      continue;
    } catch {
    }

    try {
      await firebaseAdmin.auth().getUserByEmail(dbUser.email);
      const fbUser = await firebaseAdmin.auth().getUserByEmail(dbUser.email);
      if (dbUser.id !== fbUser.uid) {
        await prisma.$transaction([
          prisma.$executeRawUnsafe(`UPDATE "Order" SET "userId" = $1 WHERE "userId" = $2`, fbUser.uid, dbUser.id),
          prisma.$executeRawUnsafe(`UPDATE "User" SET id = $1, role = $2 WHERE id = $3`, fbUser.uid, dbUser.role, dbUser.id),
        ]);
      }
      continue;
    } catch {
    }

    try {
      const userRecord = await firebaseAdmin.auth().createUser({
        email: dbUser.email,
        password: Math.random().toString(36).slice(2, 18),
        emailVerified: false,
      });

      if (dbUser.id !== userRecord.uid) {
        await prisma.$transaction([
          prisma.$executeRawUnsafe(`UPDATE "Order" SET "userId" = $1 WHERE "userId" = $2`, userRecord.uid, dbUser.id),
          prisma.$executeRawUnsafe(`UPDATE "User" SET id = $1, role = $2 WHERE id = $3`, userRecord.uid, dbUser.role, dbUser.id),
        ]);
      }

      const apiKey = process.env.FIREBASE_API_KEY;
      if (apiKey) {
        try {
          await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${apiKey}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ requestType: "PASSWORD_RESET", email: dbUser.email }),
          });
        } catch {
        }
      }

      console.log(`  Migrated user: ${dbUser.email} (password reset email sent)`);
    } catch {
      console.error(`  Failed to migrate user: ${dbUser.email}`);
    }
  }
}

export async function seedDatabase() {
  const productCount = await prisma.product.count();

  if (productCount === 0) {
    await ensureUser("admin@cloudstore.com", "admin123", "MID");
    await ensureUser("zankykamau@gmail.com", "private009", "TOP");
    await ensureUser("user@test.com", "user123", "LOW");
    await migrateExistingUsers();

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

    console.log("First-time seed complete");
  }

  const superEmail = process.env.SEED_SUPER_EMAIL;
  const superPassword = process.env.SUPER_ADMIN_PASSWORD;
  if (superEmail) {
    const password = superPassword || Math.random().toString(36).slice(2, 18);
    await ensureUser(superEmail, password, "TOP");
    if (!superPassword) {
      const apiKey = process.env.FIREBASE_API_KEY;
      if (apiKey) {
        await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${apiKey}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ requestType: "PASSWORD_RESET", email: superEmail }),
        }).catch(() => {});
      }
      console.log(`Super admin ${superEmail} created. Password reset email sent.`);
    } else {
      console.log(`Super admin ${superEmail} created with configured password.`);
    }
  }
}
