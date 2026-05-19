import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function logEvent(params: {
  userId?: string;
  email?: string;
  event: string;
  ip?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
}) {
  await prisma.authEvent.create({ data: params as any }).catch(() => {});
}
