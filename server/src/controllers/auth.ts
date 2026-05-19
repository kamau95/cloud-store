import { Response } from "express";
import argon2 from "argon2";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";
import { AuthRequest } from "../types";
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

  const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (existing) {
    res.status(409).json({ error: "Email already registered" });
    return;
  }

  const passwordHash = await argon2.hash(password, { type: argon2.argon2id });
  const user = await prisma.user.create({
    data: { email: email.toLowerCase(), passwordHash },
  });

  req.session.regenerate(async (err) => {
    if (err) {
      res.status(500).json({ error: "Session error" });
      return;
    }
    req.login({ id: user.id, userId: user.id, email: user.email, role: user.role, tokenVersion: user.tokenVersion }, (loginErr) => {
      if (loginErr) {
        res.status(500).json({ error: "Login error" });
        return;
      }
      logEvent({ userId: user.id, email: user.email, event: "register", ip: req.ip, userAgent: req.headers["user-agent"] });
      res.status(201).json({ user: { id: user.id, email: user.email, role: user.role } });
    });
  });
}

export async function login(req: AuthRequest, res: Response): Promise<void> {
  const { email } = req.body;

  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (!user) {
    logEvent({ email, event: "login_failed_user_not_found", ip: req.ip, userAgent: req.headers["user-agent"] });
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  req.session.regenerate(async (err) => {
    if (err) {
      res.status(500).json({ error: "Session error" });
      return;
    }
    req.login({ id: user.id, userId: user.id, email: user.email, role: user.role, tokenVersion: user.tokenVersion }, (loginErr) => {
      if (loginErr) {
        res.status(500).json({ error: "Login error" });
        return;
      }
      logEvent({ userId: user.id, email: user.email, event: "login", ip: req.ip, userAgent: req.headers["user-agent"] });
      res.json({ user: { id: user.id, email: user.email, role: user.role } });
    });
  });
}

export async function logout(req: AuthRequest, res: Response): Promise<void> {
  const user = req.user;
  req.session.destroy(() => {
    res.clearCookie("__Host-sid");
    if (user) {
      logEvent({ userId: user.userId, email: user.email, event: "logout", ip: req.ip, userAgent: req.headers["user-agent"] });
    }
    res.json({ ok: true });
  });
}

export async function getMe(req: AuthRequest, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  const user = await prisma.user.findUnique({
    where: { id: req.user.userId },
    select: { id: true, email: true, role: true, createdAt: true },
  });
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.json(user);
}
