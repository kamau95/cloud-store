import { Response } from "express";
import { PrismaClient } from "@prisma/client";
import { AuthRequest } from "../types";
import { logEvent } from "../services/audit";

const prisma = new PrismaClient();

export async function listSessions(req: AuthRequest, res: Response): Promise<void> {
  const sessions = await prisma.userSession.findMany({
    where: { userId: req.user!.id },
    select: { id: true, ip: true, subnet: true, city: true, country: true, userAgent: true, createdAt: true, lastSeen: true },
    orderBy: { lastSeen: "desc" },
  });
  res.json(sessions);
}

export async function revokeSession(req: AuthRequest, res: Response): Promise<void> {
  const session = await prisma.userSession.findFirst({
    where: { id: req.params.id, userId: req.user!.id },
  });
  if (!session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }
  await prisma.userSession.delete({ where: { id: session.id } });
  logEvent({ userId: req.user!.id, event: "session_revoked", metadata: { sessionId: session.id }, ip: req.ip, userAgent: req.headers["user-agent"] });
  res.json({ ok: true });
}

export async function revokeAllSessions(req: AuthRequest, res: Response): Promise<void> {
  await prisma.user.update({
    where: { id: req.user!.id },
    data: { tokenVersion: { increment: 1 } },
  });
  await prisma.userSession.deleteMany({ where: { userId: req.user!.id } });
  logEvent({ userId: req.user!.id, event: "all_sessions_revoked", ip: req.ip, userAgent: req.headers["user-agent"] });
  req.session.destroy(() => {
    res.clearCookie("__Host-sid");
    res.json({ ok: true });
  });
}
