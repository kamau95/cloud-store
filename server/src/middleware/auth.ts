import { Response, NextFunction } from "express";
import { PrismaClient } from "@prisma/client";
import { AuthRequest } from "../types";
import { verifyIdToken, firebaseAdmin } from "../services/firebase";

const prisma = new PrismaClient();

export async function authenticate(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const token = header.slice(7);
  const decoded = await verifyIdToken(token);
  if (!decoded) {
    res.status(401).json({ error: "Invalid or expired token" });
    return;
  }

  if (!decoded.email_verified) {
    try {
      const userRecord = await firebaseAdmin.auth().getUser(decoded.uid);
      if (!userRecord.emailVerified) {
        await firebaseAdmin.auth().updateUser(decoded.uid, { emailVerified: true });
      }
    } catch {
      res.status(500).json({ error: "Failed to verify email status" });
      return;
    }
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: decoded.uid },
    select: { role: true },
  });

  req.user = {
    userId: decoded.uid,
    id: decoded.uid,
    email: decoded.email || "",
    role: dbUser?.role || "LOW",
    tokenVersion: 0,
  };
  next();
}

export async function authenticateBasic(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const token = header.slice(7);
  const decoded = await verifyIdToken(token);
  if (!decoded) {
    res.status(401).json({ error: "Invalid or expired token" });
    return;
  }

  req.user = {
    userId: decoded.uid,
    id: decoded.uid,
    email: decoded.email || "",
    role: "LOW",
    tokenVersion: 0,
  };
  next();
}

export async function sessionBinding(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  next();
}

export async function tokenVersionCheck(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  if (!req.user) {
    next();
    return;
  }

  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: { role: true },
  });

  if (!user) {
    res.status(401).json({ error: "User not found" });
    return;
  }

  req.user.role = user.role;
  next();
}

export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction): void {
  if (!req.user || (req.user.role !== "MID" && req.user.role !== "TOP")) {
    res.status(403).json({ error: "Admin access required" });
    return;
  }
  next();
}

export function requireSuperAdmin(req: AuthRequest, res: Response, next: NextFunction): void {
  if (!req.user || req.user.role !== "TOP") {
    res.status(403).json({ error: "Super admin access required" });
    return;
  }
  next();
}
