import { Response } from "express";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";
import { AuthRequest } from "../types";
import { firebaseAdmin } from "../services/firebase";
import { logEvent } from "../services/audit";
import { sendVerificationEmail, isSmtpConfigured } from "../services/email";

const prisma = new PrismaClient();

export const registerSchema = z.object({
  email: z.string().email(),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function register(req: AuthRequest, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const { email } = req.body;

  try {
    const userRecord = await firebaseAdmin.auth().getUser(req.user.id);

    await prisma.user.upsert({
      where: { id: userRecord.uid },
      update: { email: email.toLowerCase() },
      create: {
        id: userRecord.uid,
        email: email.toLowerCase(),
        role: "LOW",
      },
    });

    const frontendUrl = process.env.FRONTEND_URL || "https://cloud-store-ykd3.onrender.com";

    firebaseAdmin.auth().generateEmailVerificationLink(email.toLowerCase(), { url: `${frontendUrl}/login` })
      .then((link) => {
        sendVerificationEmail(email.toLowerCase(), link).catch((err) => {
          console.error("Failed to send verification email via SMTP:", err);
        });
      })
      .catch((err) => {
        console.error("Failed to generate verification link:", err);
      });

    logEvent({ userId: userRecord.uid, email: email.toLowerCase(), event: "register", ip: req.ip, userAgent: req.headers["user-agent"] });

    res.status(201).json({ message: "Check your email for a verification link." });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}

export async function login(req: AuthRequest, res: Response): Promise<void> {
  const { email, password } = req.body;

  try {
    const userRecord = await firebaseAdmin.auth().getUserByEmail(email.toLowerCase());

    if (!userRecord.emailVerified) {
      logEvent({ email: email.toLowerCase(), event: "login_failed_unconfirmed", ip: req.ip, userAgent: req.headers["user-agent"] });
      res.status(403).json({ error: "Email not confirmed. Check your inbox." });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: userRecord.uid },
      select: { id: true, email: true, role: true },
    });

    if (!user) {
      await prisma.user.create({
        data: { id: userRecord.uid, email: email.toLowerCase() },
      });
    }

    const profile = user || { id: userRecord.uid, email: email.toLowerCase(), role: "LOW" as const };

    logEvent({ userId: profile.id, email: profile.email, event: "login", ip: req.ip, userAgent: req.headers["user-agent"] });

    res.json({ user: profile });
  } catch (err: any) {
    if (err.code === "auth/user-not-found") {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }
    res.status(500).json({ error: err.message });
  }
}

export async function logout(req: AuthRequest, res: Response): Promise<void> {
  if (req.user) {
    await firebaseAdmin.auth().revokeRefreshTokens(req.user.id);
  }
  logEvent({ userId: req.user?.id, email: req.user?.email, event: "logout", ip: req.ip, userAgent: req.headers["user-agent"] });
  res.json({ ok: true });
}

export async function getMe(req: AuthRequest, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  let user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: { id: true, email: true, role: true, createdAt: true },
  });

  if (!user) {
    try {
      user = await prisma.user.create({
        data: { id: req.user.id, email: req.user.email.toLowerCase() },
        select: { id: true, email: true, role: true, createdAt: true },
      });
    } catch (err: any) {
      if (err.code === "P2002") {
        user = await prisma.user.update({
          where: { email: req.user.email.toLowerCase() },
          data: { id: req.user.id },
          select: { id: true, email: true, role: true, createdAt: true },
        });
      } else {
        throw err;
      }
    }
  }

  res.json(user);
}
