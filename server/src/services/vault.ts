import { PrismaClient, Provider } from "@prisma/client";
import type { Prisma } from "@prisma/client";

const prisma = new PrismaClient();

type CredentialData = {
  provider: string;
  email: string;
  password: string;
  accessKey?: string;
  secretKey?: string;
  region?: string;
  specs?: Record<string, unknown>;
};

export async function storeCredential(
  credId: string,
  credential: CredentialData
): Promise<void> {
  const specs = credential.specs as Prisma.InputJsonValue | undefined;
  await prisma.credential.upsert({
    where: { id: credId },
    update: {
      email: credential.email,
      password: credential.password,
      accessKey: credential.accessKey || null,
      secretKey: credential.secretKey || null,
      region: credential.region || null,
      specs,
    },
    create: {
      id: credId,
      provider: credential.provider as Provider,
      email: credential.email,
      password: credential.password,
      accessKey: credential.accessKey || null,
      secretKey: credential.secretKey || null,
      region: credential.region || null,
      specs,
    },
  });
}

export async function getCredential(
  credId: string
): Promise<Record<string, unknown> | null> {
  try {
    const cred = await prisma.credential.findUnique({
      where: { id: credId },
    });
    if (!cred) return null;
    return cred as unknown as Record<string, unknown>;
  } catch {
    return null;
  }
}

export async function deleteCredential(credId: string): Promise<void> {
  await prisma.credential.delete({ where: { id: credId } });
}

export async function listCredentials(): Promise<string[]> {
  const creds = await prisma.credential.findMany({
    select: { id: true },
    orderBy: { createdAt: "desc" },
  });
  return creds.map((c) => c.id);
}

export async function reserveCredential(
  provider: string
): Promise<{ id: string; data: Record<string, unknown> } | null> {
  const cred = await prisma.credential.findFirst({
    where: { provider: provider as Provider, claimed: false },
    orderBy: { createdAt: "asc" },
  });

  if (!cred) return null;

  const updated = await prisma.credential.update({
    where: { id: cred.id },
    data: { claimed: true, claimedAt: new Date() },
  });

  return { id: updated.id, data: updated as unknown as Record<string, unknown> };
}
