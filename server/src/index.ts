import "dotenv/config";
import path from "path";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { tokenVersionCheck } from "./middleware/auth";
import authRoutes from "./routes/auth";
import productRoutes from "./routes/products";
import orderRoutes from "./routes/orders";
import webhookRoutes from "./routes/webhooks";
import adminRoutes from "./routes/admin";
import passwordRoutes from "./routes/password";
import { seedDatabase } from "./seed";

const app = express();
const PORT = process.env.PORT || 3001;

app.set("trust proxy", 1);

const firebaseAuthDomain = process.env.FIREBASE_AUTH_DOMAIN || "";

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      connectSrc: [
        "'self'",
        ...(firebaseAuthDomain ? [`https://${firebaseAuthDomain}`] : []),
        "https://identitytoolkit.googleapis.com",
        "https://securetoken.googleapis.com",
      ],
      imgSrc: ["'self'", "data:", "blob:"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      frameAncestors: ["'none'"],
    },
  },
  hsts: { maxAge: 63072000, preload: true },
}));

app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:5173",
  credentials: true,
}));

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  keyGenerator: (req) => `${req.ip || req.socket.remoteAddress || ""}-${(req.body?.email || "").toLowerCase()}`,
  message: { error: "Too many login attempts. Try again later." },
});

app.use("/api/auth/login", loginLimiter);

app.use("/api/orders/webhook", express.raw({ type: "application/json" }), webhookRoutes);

app.use(express.json());

app.use(tokenVersionCheck);

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString(), version: "firebase-auth" });
});

app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/password", passwordRoutes);

const adminPath = process.env.ROOT_PATH;
if (process.env.NODE_ENV === "production") {
  const clientDist = path.join(__dirname, "../../client/dist");
  app.use(express.static(clientDist));

  if (adminPath) {
    app.get(`/${adminPath}*`, (_req, res) => {
      res.sendFile(path.join(clientDist, "admin.html"));
    });
  }

  app.get("*", (_req, res) => {
    res.sendFile(path.join(clientDist, "index.html"));
  });
}

app.use((_req, res) => {
  res.status(404).json({ error: "Not found" });
});

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal server error" });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  seedDatabase().catch((err) => {
    console.error("Seed failed:", err);
  });
});
