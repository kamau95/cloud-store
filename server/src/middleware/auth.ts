import { Response, NextFunction } from "express";
import { PrismaClient } from "@prisma/client";
import { AuthRequest } from "../types";

const prisma = new PrismaClient();

export function authenticate(req: AuthRequest, res: Response, next: NextFunction): void {
  if (!req.isAuthenticated || !req.isAuthenticated()) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  next();
}

export async function sessionBinding(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  if (!req.isAuthenticated || !req.isAuthenticated()) {
    next();
    return;
  }

  const userAgent = req.headers["user-agent"] || "";
  const ip = req.ip || "";
  const subnet = ip.includes(".") ? ip.split(".").slice(0, 2).join(".") : ip;

  const sessionData = req.session as any;
  if (!sessionData.fingerprint) {
    sessionData.fingerprint = { userAgent, subnet };
    next();
    return;
  }

  const fp = sessionData.fingerprint;

  if (fp.userAgent && userAgent && fp.userAgent !== userAgent) {
    req.logout(() => {
      req.session.destroy(() => {
        res.clearCookie("__Host-sid");
        res.status(401).json({ error: "Session hijacked — user-agent mismatch" });
      });
    });
    return;
  }

  if (fp.subnet && subnet && fp.subnet !== subnet) {
    req.logout(() => {
      req.session.destroy(() => {
        res.clearCookie("__Host-sid");
        res.status(401).json({ error: "Session hijacked — network change detected" });
      });
    });
    return;
  }

  next();
}

export async function tokenVersionCheck(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  if (!req.isAuthenticated || !req.isAuthenticated()) {
    next();
    return;
  }

  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: { tokenVersion: true },
  });

  if (!user || user.tokenVersion !== (req.user as any).tokenVersion) {
    req.logout(() => {
      req.session.destroy(() => {
        res.clearCookie("__Host-sid");
        res.status(401).json({ error: "Session expired — please log in again" });
      });
    });
    return;
  }

  next();
}

export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction): void {
  if (!req.user || (req.user.role !== "ADMIN" && req.user.role !== "SUPER_ADMIN")) {
    res.status(403).json({ error: "Admin access required" });
    return;
  }
  next();
}

export function requireSuperAdmin(req: AuthRequest, res: Response, next: NextFunction): void {
  if (!req.user || req.user.role !== "SUPER_ADMIN") {
    res.status(403).json({ error: "Super admin access required" });
    return;
  }
  next();
}
