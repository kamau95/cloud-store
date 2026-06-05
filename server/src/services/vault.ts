import { PrismaClient, Provider } from "@prisma/client";

const prisma = new PrismaClient();

type CredentialData = {
  provider: string;
  email: string;
  password: string;
  accessKey?: string;
  secretKey?: string;
  region?: string;
};

export async function storeCredential(
  credId: string,
  credential: CredentialData
): Promise<void> {
  await prisma.credential.upsert({
    where: { id: credId },
    update: {
      email: credential.email,
      password: credential.password,
      accessKey: credential.accessKey || null,
      secretKey: credential.secretKey || null,
      region: credential.region || null,
    },
    create: {
      id: credId,
      provider: credential.provider as Provider,
      email: credential.email,
      password: credential.password,
      accessKey: credential.accessKey || null,
      secretKey: credential.secretKey || null,
      region: credential.region || null,
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

// --- ApiKey operations ---

export async function storeApiKey(
  id: string,
  productId: string,
  keyValue: string
): Promise<void> {
  await prisma.apiKey.create({ data: { id, productId, keyValue } });
}

export async function getApiKey(
  keyId: string
): Promise<Record<string, unknown> | null> {
  try {
    const key = await prisma.apiKey.findUnique({ where: { id: keyId } });
    if (!key) return null;
    return key as unknown as Record<string, unknown>;
  } catch {
    return null;
  }
}

export async function deleteApiKey(keyId: string): Promise<void> {
  await prisma.apiKey.delete({ where: { id: keyId } });
}

export async function listApiKeys(): Promise<
  Array<{ id: string; productId: string; keyValue: string; claimed: boolean; claimedAt: Date | null }>
> {
  return prisma.apiKey.findMany({ orderBy: { createdAt: "desc" } });
}

export async function reserveApiKey(
  productId: string
): Promise<{ id: string; keyValue: string } | null> {
  const key = await prisma.apiKey.findFirst({
    where: { productId, claimed: false },
    orderBy: { createdAt: "asc" },
  });
  if (!key) return null;
  const updated = await prisma.apiKey.update({
    where: { id: key.id },
    data: { claimed: true, claimedAt: new Date() },
  });
  return { id: updated.id, keyValue: updated.keyValue };
}

export async function countApiKeyStock(productId: string): Promise<number> {
  return prisma.apiKey.count({ where: { productId, claimed: false } });
}
