const firebaseErrors: Record<string, string> = {
  "auth/invalid-credential": "Invalid email or password",
  "auth/user-not-found": "No account found with this email",
  "auth/wrong-password": "Invalid email or password",
  "auth/email-already-in-use": "An account with this email already exists",
  "auth/weak-password": "Password must be at least 6 characters",
  "auth/invalid-email": "Invalid email address",
  "auth/too-many-requests": "Too many attempts. Try again later",
  "auth/user-disabled": "This account has been disabled",
  "auth/expired-action-code": "This link has expired",
  "auth/invalid-action-code": "This link is invalid or already used",
};

export function friendlyError(error: unknown): string {
  const msg = (error as Error)?.message || "";
  for (const [code, friendly] of Object.entries(firebaseErrors)) {
    if (msg.includes(code)) return friendly;
  }
  if (msg.includes("EMAIL_EXISTS")) return "An account with this email already exists";
  return msg;
}
