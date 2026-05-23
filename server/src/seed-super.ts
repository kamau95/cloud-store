import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { firebaseAdmin } from "./services/firebase";

const prisma = new PrismaClient();

async function main() {
  const email = process.argv[2];
  const password = process.argv[3];
  const role = (process.argv[4] || "TOP") as "LOW" | "MID" | "TOP";

  if (!email || !password) {
    console.error("Usage: npx tsx src/seed-super.ts <email> <password> [role]");
    process.exit(1);
  }

  let firebaseUid: string;
  try {
    const userRecord = await firebaseAdmin.auth().createUser({ email, password, emailVerified: true });
    firebaseUid = userRecord.uid;
    console.log("Firebase user created");
  } catch (err: any) {
    if (err.code === "auth/email-already-exists") {
      const userRecord = await firebaseAdmin.auth().getUserByEmail(email);
      firebaseUid = userRecord.uid;
      await firebaseAdmin.auth().updateUser(firebaseUid, { password, emailVerified: true });
      console.log("Firebase user updated with new password");
    } else {
      throw err;
    }
  }

  await prisma.user.upsert({
    where: { id: firebaseUid },
    update: { email, role },
    create: { id: firebaseUid, email, role },
  });

  console.log(`DB record upserted: ${email} as ${role}`);
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
