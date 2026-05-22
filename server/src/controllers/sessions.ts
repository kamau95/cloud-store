import { Response } from "express";
import { AuthRequest } from "../types";
import { logEvent } from "../services/audit";
import { supabaseAdmin } from "../services/session";

export async function listSessions(req: AuthRequest, res: Response): Promise<void> {
  const { data: { users } } = await supabaseAdmin.auth.admin.listUsers();
  const user = users?.find((u) => u.id === req.user!.id);
  if (!user?.last_sign_in_at) {
    res.json([]);
    return;
  }
  res.json([{
    id: user.id,
    ip: null,
    userAgent: null,
    createdAt: user.created_at,
    lastSeen: user.last_sign_in_at,
  }]);
}

export async function revokeSession(req: AuthRequest, res: Response): Promise<void> {
  res.status(400).json({ error: "Individual session revocation not available with Supabase Auth. Use revoke all sessions instead." });
}

export async function revokeAllSessions(req: AuthRequest, res: Response): Promise<void> {
  const { error } = await supabaseAdmin.auth.admin.signOut(req.user!.id);
  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  logEvent({ userId: req.user!.id, event: "all_sessions_revoked", ip: req.ip, userAgent: req.headers["user-agent"] });
  res.json({ ok: true });
}
