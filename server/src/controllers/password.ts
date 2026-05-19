import { Response } from "express";
import crypto from "crypto";
import { PrismaClient } from "@prisma/client";
import argon2 from "argon2";
import { z } from "zod";
import { AuthRequest } from "../types";
import { logEvent } from "../services/audit";

const prisma = new PrismaClient();

export const forgotSchema = z.object({
  email: z.string().email(),
});

export const resetSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export async function forgotPassword(req: AuthRequest, res: Response): Promise<void> {
  const { email } = req.body;

  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (!user) {
    res.json({ ok: true });
    return;
  }

  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      token,
      expiresAt,
    },
  });

  logEvent({ userId: user.id, email: user.email, event: "password_reset_requested", ip: req.ip, userAgent: req.headers["user-agent"] });

  console.log(`\n[PASSWORD RESET] Token for ${email}: ${token}\n`);

  res.json({ ok: true });
}

export async function resetPassword(req: AuthRequest, res: Response): Promise<void> {
  const { token, password } = req.body;

  const resetToken = await prisma.passwordResetToken.findUnique({ where: { token } });
  if (!resetToken || resetToken.used || resetToken.expiresAt < new Date()) {
    res.status(400).json({ error: "Invalid or expired reset token" });
    return;
  }

  const passwordHash = await argon2.hash(password, { type: argon2.argon2id });

  await prisma.$transaction([
    prisma.passwordResetToken.update({ where: { id: resetToken.id }, data: { used: true } }),
    prisma.user.update({ where: { id: resetToken.userId }, data: { passwordHash } }),
  ]);

  logEvent({ userId: resetToken.userId, event: "password_reset_completed", ip: req.ip, userAgent: req.headers["user-agent"] });

  res.json({ ok: true });
}
