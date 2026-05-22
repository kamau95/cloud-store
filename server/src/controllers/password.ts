import { Response } from "express";
import { z } from "zod";
import { firebaseAdmin } from "../services/firebase";
import { logEvent } from "../services/audit";
import { AuthRequest } from "../types";

export const forgotSchema = z.object({
  email: z.string().email(),
});

export const resetSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export async function forgotPassword(req: AuthRequest, res: Response): Promise<void> {
  const { email } = req.body;

  try {
    await firebaseAdmin.auth().generatePasswordResetLink(email.toLowerCase());
  } catch (err: any) {
    console.error("Password reset error:", err.message);
  }

  logEvent({ email: email.toLowerCase(), event: "password_reset_requested", ip: req.ip, userAgent: req.headers["user-agent"] });
  res.json({ ok: true });
}

export async function resetPassword(req: AuthRequest, res: Response): Promise<void> {
  const { token, password } = req.body;

  try {
    await firebaseAdmin.auth().updateUser(token, { password });
    logEvent({ userId: token, event: "password_reset_completed", ip: req.ip, userAgent: req.headers["user-agent"] });
    res.json({ ok: true });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
}
