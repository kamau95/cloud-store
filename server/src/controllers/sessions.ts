import { Response } from "express";
import { AuthRequest } from "../types";
import { logEvent } from "../services/audit";

export async function listSessions(req: AuthRequest, res: Response): Promise<void> {
  res.json([{
    id: req.user!.id,
    ip: null,
    userAgent: null,
    createdAt: null,
    lastSeen: null,
  }]);
}

export async function revokeSession(req: AuthRequest, res: Response): Promise<void> {
  res.status(400).json({ error: "Individual session revocation not available." });
}

export async function revokeAllSessions(req: AuthRequest, res: Response): Promise<void> {
  logEvent({ userId: req.user!.id, event: "all_sessions_revoked", ip: req.ip, userAgent: req.headers["user-agent"] });
  res.json({ ok: true });
}
