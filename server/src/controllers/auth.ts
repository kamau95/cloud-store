import { Response } from "express";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";
import { AuthRequest } from "../types";
import { supabaseAdmin, supabaseAnon } from "../services/session";
import { logEvent } from "../services/audit";

const prisma = new PrismaClient();

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function register(req: AuthRequest, res: Response): Promise<void> {
  const { email, password } = req.body;

  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email: email.toLowerCase(),
    password,
    email_confirm: true,
  });

  if (authError) {
    if (authError.message.includes("already registered")) {
      res.status(409).json({ error: "Email already registered" });
      return;
    }
    res.status(500).json({ error: authError.message });
    return;
  }

  const supabaseId = authData.user!.id;

  await prisma.user.upsert({
    where: { id: supabaseId },
    update: { email: email.toLowerCase() },
    create: {
      id: supabaseId,
      email: email.toLowerCase(),
      role: "USER",
    },
  });

  logEvent({ userId: supabaseId, email: email.toLowerCase(), event: "register", ip: req.ip, userAgent: req.headers["user-agent"] });

  res.status(201).json({ user: { id: supabaseId, email: email.toLowerCase(), role: "USER" } });
}

export async function login(req: AuthRequest, res: Response): Promise<void> {
  const { email, password } = req.body;

  const { data, error } = await supabaseAnon.auth.signInWithPassword({
    email: email.toLowerCase(),
    password,
  });

  if (error || !data.session) {
    logEvent({ email: email.toLowerCase(), event: "login_failed", ip: req.ip, userAgent: req.headers["user-agent"] });
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  const user = await prisma.user.findUnique({
    where: { id: data.user.id },
    select: { id: true, email: true, role: true },
  });

  if (!user) {
    await prisma.user.create({
      data: { id: data.user.id, email: email.toLowerCase() },
    });
  }

  const profile = user || { id: data.user.id, email: email.toLowerCase(), role: "USER" as const };

  logEvent({ userId: profile.id, email: profile.email, event: "login", ip: req.ip, userAgent: req.headers["user-agent"] });

  res.json({
    accessToken: data.session.access_token,
    refreshToken: data.session.refresh_token,
    expiresAt: data.session.expires_at,
    user: profile,
  });
}

export async function logout(req: AuthRequest, res: Response): Promise<void> {
  const header = req.headers.authorization;
  if (header?.startsWith("Bearer ")) {
    await supabaseAdmin.auth.admin.signOut(req.user!.id);
  }
  logEvent({ userId: req.user?.id, email: req.user?.email, event: "logout", ip: req.ip, userAgent: req.headers["user-agent"] });
  res.json({ ok: true });
}

export async function getMe(req: AuthRequest, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: { id: true, email: true, role: true, createdAt: true },
  });

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  res.json(user);
}
