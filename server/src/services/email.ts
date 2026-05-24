import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "",
  port: parseInt(process.env.SMTP_PORT || "587", 10),
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER || "",
    pass: process.env.SMTP_PASS || "",
  },
});

const fromAddress = process.env.SMTP_FROM || "noreply@cloudstore.com";

function isConfigured(): boolean {
  return !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

export async function sendOrderConfirmation(
  email: string,
  orderId: string,
  productName: string,
  amount: number
): Promise<void> {
  if (!isConfigured()) return;

  await transporter.sendMail({
    from: fromAddress,
    to: email,
    subject: `Payment received — Order #${orderId}`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;">
        <h2 style="color:#3b82f6;">CloudStore</h2>
        <p>Your payment of <strong>$${amount.toFixed(2)}</strong> for <strong>${productName}</strong> has been received.</p>
        <p>Order <strong>#${orderId}</strong> is now being processed. Your credentials will be delivered shortly.</p>
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;">
        <p style="color:#6b7280;font-size:12px;">If you have any questions, contact support.</p>
      </div>
    `,
  });
}

export async function sendVerificationEmail(
  email: string,
  link: string
): Promise<void> {
  if (!isConfigured()) return;

  await transporter.sendMail({
    from: fromAddress,
    to: email,
    subject: "Verify your email for CloudStore",
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;">
        <h2 style="color:#3b82f6;">CloudStore</h2>
        <p>Click the button below to verify your email address.</p>
        <p style="margin:24px 0;">
          <a href="${link}" style="display:inline-block;background:#3b82f6;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">Verify Email</a>
        </p>
        <p style="color:#6b7280;font-size:14px;">Or copy this link:</p>
        <p style="color:#6b7280;font-size:12px;word-break:break-all;">${link}</p>
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;">
        <p style="color:#6b7280;font-size:12px;">If you did not create this account, ignore this email.</p>
      </div>
    `,
  });
}

export async function sendDeliveryNotification(
  email: string,
  orderId: string,
  productName: string
): Promise<void> {
  if (!isConfigured()) return;

  const frontendUrl = process.env.FRONTEND_URL || "https://cloud-store-ykd3.onrender.com";

  await transporter.sendMail({
    from: fromAddress,
    to: email,
    subject: `Order delivered — #${orderId}`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;">
        <h2 style="color:#3b82f6;">CloudStore</h2>
        <p>Your <strong>${productName}</strong> credentials for order <strong>#${orderId}</strong> are ready.</p>
        <p><a href="${frontendUrl}/orders/${orderId}" style="display:inline-block;background:#3b82f6;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">View Credentials</a></p>
        <p style="color:#6b7280;font-size:14px;margin-top:16px;">⚠️ Credentials can only be viewed once. Save them immediately.</p>
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;">
        <p style="color:#6b7280;font-size:12px;">If you have any questions, contact support.</p>
      </div>
    `,
  });
}
