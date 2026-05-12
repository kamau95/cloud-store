import fetch from "node-fetch";

const VAULT_ADDR = process.env.VAULT_ADDR || "http://localhost:8200";
const VAULT_TOKEN = process.env.VAULT_TOKEN || "vault-dev-token";
const KV_PATH = process.env.VAULT_KV_PATH || "accounts";

async function vaultRequest(method: string, path: string, body?: unknown) {
  const url = `${VAULT_ADDR}/v1/${path}`;
  const res = await fetch(url, {
    method,
    headers: {
      "X-Vault-Token": VAULT_TOKEN,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Vault error (${res.status}): ${err}`);
  }

  const contentType = res.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return res.json() as Promise<{ data?: Record<string, unknown> }>;
  }
  return null;
}

export async function storeCredential(
  credId: string,
  credential: {
    provider: string;
    email: string;
    password: string;
    accessKey?: string;
    secretKey?: string;
    region?: string;
    specs?: Record<string, unknown>;
  }
): Promise<void> {
  await vaultRequest("POST", `${KV_PATH}/data/${credId}`, {
    data: credential,
  });
}

export async function getCredential(
  credId: string
): Promise<Record<string, unknown> | null> {
  try {
    const result = await vaultRequest("GET", `${KV_PATH}/data/${credId}`);
    return (result?.data as { data: Record<string, unknown> })?.data || null;
  } catch {
    return null;
  }
}

export async function deleteCredential(credId: string): Promise<void> {
  await vaultRequest("DELETE", `${KV_PATH}/meta/${credId}`);
}

export async function listCredentials(): Promise<string[]> {
  try {
    const result = await vaultRequest("LIST", `${KV_PATH}/metadata`);
    const data = result?.data as { keys?: string[] };
    return data?.keys || [];
  } catch {
    return [];
  }
}

export async function reserveCredential(provider: string): Promise<{ id: string; data: Record<string, unknown> } | null> {
  const keys = await listCredentials();
  const available = keys.filter((k) => k.startsWith(`${provider.toLowerCase()}-`));

  for (const key of available) {
    const cred = await getCredential(key);
    if (cred && !cred.claimed) {
      await storeCredential(key, { ...(cred as Record<string, unknown>), claimed: true, claimedAt: new Date().toISOString() } as never);
      return { id: key, data: cred };
    }
  }

  return null;
}
