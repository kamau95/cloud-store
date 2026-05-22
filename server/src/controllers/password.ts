import { Response } from "express";
import { z } from "zod";
import { supabaseAdmin, supabaseAnon } from "../services/session";
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
  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";

  const { error } = await supabaseAnon.auth.resetPasswordForEmail(email.toLowerCase(), {
    redirectTo: `${frontendUrl}/reset-password`,
  });

  if (error) {
    console.error("Password reset error:", error.message);
  }

  logEvent({ email: email.toLowerCase(), event: "password_reset_requested", ip: req.ip, userAgent: req.headers["user-agent"] });
  res.json({ ok: true });
}

export async function resetPassword(req: AuthRequest, res: Response): Promise<void> {
  const { token, password } = req.body;

  const { data, error } = await supabaseAdmin.auth.admin.updateUserById(token, {
    password,
  });

  if (error) {
    res.status(400).json({ error: error.message });
    return;
  }

  logEvent({ userId: data.user.id, email: data.user.email, event: "password_reset_completed", ip: req.ip, userAgent: req.headers["user-agent"] });
  res.json({ ok: true });
}
