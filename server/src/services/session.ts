import { createClient } from "@supabase/supabase-js";
import { createRemoteJWKSet, jwtVerify } from "jose";
import ws from "ws";

const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || "";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

const realtimeConfig = { transport: ws as any };

export const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
  realtime: realtimeConfig,
});

export const supabaseAnon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
  realtime: realtimeConfig,
});

const JWKS = createRemoteJWKSet(new URL(`${SUPABASE_URL}/auth/v1/.well-known/jwks.json`));

export interface SupabaseJwtPayload {
  aud: string;
  sub: string;
  email: string;
  phone: string;
  app_metadata: Record<string, unknown>;
  user_metadata: Record<string, unknown>;
  role: string;
  iat: number;
  exp: number;
}

export async function verifyToken(token: string): Promise<SupabaseJwtPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWKS, {
      algorithms: ["ES256"],
    });
    return payload as unknown as SupabaseJwtPayload;
  } catch {
    return null;
  }
}
