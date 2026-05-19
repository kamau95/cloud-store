import { Pool } from "pg";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import argon2 from "argon2";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const SESSION_SECRET = process.env.SESSION_SECRET || process.env.JWT_SECRET || "dev-session-secret-change-me";

const pgPool = new Pool({ connectionString: process.env.DATABASE_URL });

const PgStore = connectPgSimple(session);

export const sessionMiddleware = session({
  store: new PgStore({
    pool: pgPool,
    tableName: "user_session_store",
    createTableIfMissing: true,
  }),
  secret: SESSION_SECRET,
  name: "__Host-sid",
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 24 * 60 * 60 * 1000,
  },
});

passport.use(
  new LocalStrategy(
    { usernameField: "email", passwordField: "password" },
    async (email, password, done) => {
      try {
        const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
        if (!user) return done(null, false, { message: "Invalid email or password" });

        let valid = false;
        try {
          valid = await argon2.verify(user.passwordHash, password);
        } catch {
          valid = bcrypt.compareSync(password, user.passwordHash);
        }
        if (!valid) return done(null, false, { message: "Invalid email or password" });

        return done(null, { id: user.id, userId: user.id, email: user.email, role: user.role, tokenVersion: user.tokenVersion });
      } catch (err) {
        return done(err);
      }
    }
  )
);

passport.serializeUser((user: Express.User, done) => {
  done(null, { id: user.id, userId: user.id, email: user.email, role: user.role, tokenVersion: user.tokenVersion });
});

passport.deserializeUser(async (serialized: Express.User, done) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: serialized.id },
      select: { id: true, email: true, role: true, tokenVersion: true },
    });
    if (!user) return done(null, false);
    if (user.tokenVersion !== serialized.tokenVersion) return done(null, false);
    done(null, { id: user.id, userId: user.id, email: user.email, role: user.role, tokenVersion: user.tokenVersion });
  } catch (err) {
    done(err);
  }
});

export { passport, pgPool };
