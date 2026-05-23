import { PrismaClient } from "@prisma/client";
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
      console.error(`ensureUser failed for ${email}:`, err.code, err.message);
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

async function migrateEnum() {
  const enumValues = await prisma.$queryRawUnsafe<{ enumlabel: string }[]>(
    `SELECT e.enumlabel FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid WHERE t.typname = 'Role'`
  );
  const values = enumValues.map((r: any) => r.enumlabel);
  if (!values.includes("LOW")) {
    await prisma.$executeRawUnsafe(`ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'LOW'`);
    await prisma.$executeRawUnsafe(`ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'MID'`);
    await prisma.$executeRawUnsafe(`ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'TOP'`);
    await prisma.$executeRawUnsafe(`UPDATE "User" SET role = 'LOW' WHERE role = 'USER'`);
    await prisma.$executeRawUnsafe(`UPDATE "User" SET role = 'MID' WHERE role = 'ADMIN'`);
    await prisma.$executeRawUnsafe(`UPDATE "User" SET role = 'TOP' WHERE role = 'SUPER_ADMIN'`);
    console.log("Migrated Role enum from legacy values to LOW/MID/TOP");
  }
}

export async function seedDatabase() {
  await migrateEnum();

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
