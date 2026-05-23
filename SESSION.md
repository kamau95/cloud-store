# Cloud Store — Session & Auth Architecture

## Auth System: Firebase Auth (migrated from Supabase)

- **Client**: Firebase Auth SDK handles sign-up, sign-in, password reset, email verification
- **Server**: Firebase Admin SDK verifies ID tokens, manages users
- **Profile**: `User` table in Postgres (via Prisma) stores `id` (Firebase UID), `email`, `role`
- **Roles**: `LOW` (user), `MID` (admin), `TOP` (super admin)

### Key Files
| File | Purpose |
|---|---|
| `client/src/lib/firebase.ts` | Lazy Firebase client — fetches config from `/api/auth/config` at runtime |
| `client/src/context/AuthContext.tsx` | React context wrapping Firebase auth state |
| `client/src/api/client.ts` | API client auto-attaches Bearer token from Firebase ID token |
| `server/src/services/firebase.ts` | Firebase Admin SDK init, token verification, config endpoint |
| `server/src/middleware/auth.ts` | `authenticate` (checks emailVerified), `requireAdmin`, `requireSuperAdmin` |

### Auth Flow
1. Client fetches Firebase config from `GET /api/auth/config`
2. Initializes Firebase app, user signs in via `signInWithEmailAndPassword()`
3. Firebase SDK persists session, `onAuthStateChanged` fires
4. API client gets ID token via `user.getIdToken()` and sends as `Authorization: Bearer <token>`
5. Server middleware verifies ID token via Firebase Admin SDK, checks `emailVerified`
6. Role-based guards (`requireAdmin` → `MID`, `requireSuperAdmin` → `TOP`) check `req.user.role`

### Register Flow
1. Client tries `createUserWithEmailAndPassword()`
2. If `EMAIL_EXISTS`, falls back to `signInWithEmailAndPassword()` (same credentials)
3. Sends verification email via `sendEmailVerification()`
4. Calls `POST /api/auth/register` with ID token → server creates/upserts DB record
5. Signs user out → shows "Check your email" screen

### Routes
- `GET /api/auth/config` — returns Firebase Web SDK config (unauthenticated)
- `POST /api/auth/register` — creates DB record (requires ID token)
- `POST /api/auth/login` — server-side login (checks email verified)
- `GET /api/auth/me` — returns current user profile
- `POST /api/auth/logout` — revokes refresh tokens
- `POST /api/password/forgot` — generates password reset link
- `POST /api/password/reset` — updates password

### Seed / Migrated Users (created on startup)
| Email | Password | Role |
|---|---|---|
| admin@cloudstore.com | admin123 | MID |
| zankykamau@gmail.com | private009 | TOP |
| user@test.com | user123 | LOW |

Existing DB users from Supabase era are auto-migrated on startup:
- Firebase Auth account created with random password
- Password reset email sent via Firebase REST API
- DB record updated with Firebase UID

### Environment Variables (Server — set in Render)
- `FIREBASE_SERVICE_ACCOUNT` — full service account JSON (recommended)
- OR individual: `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`
- `FIREBASE_API_KEY` — Web API key
- `FIREBASE_AUTH_DOMAIN` — e.g. `project.firebaseapp.com`
- `FIREBASE_STORAGE_BUCKET`, `FIREBASE_MESSAGING_SENDER_ID`, `FIREBASE_APP_ID`
- `FRONTEND_URL` — for CORS and redirect URLs
- `DATABASE_URL` — Postgres connection string

### Deployment (Render Docker)
- `Dockerfile` at repo root builds client + server in stages
- Client builds without any `VITE_` env vars (config fetched at runtime)
- Start command runs `prisma migrate deploy && node dist/index.js`
- Prisma needs `binaryTargets = ["native", "debian-openssl-3.0.x"]` in schema.prisma

### Supabase → Firebase Migration Steps (completed)
1. ✅ Installed `firebase-admin` (server) and `firebase` (client)
2. ✅ Created Firebase Admin SDK service with token verification
3. ✅ Updated auth middleware to verify Firebase ID tokens + check emailVerified
4. ✅ Updated register/login/logout controllers for Firebase
5. ✅ Updated password reset flow to use Firebase Admin SDK
6. ✅ Removed `@supabase/supabase-js`, `jose`, `ws` dependencies
7. ✅ CSP updated to allow Firebase REST APIs
8. ✅ Seed creates users in Firebase Auth directly
9. ✅ Existing DB users auto-migrated to Firebase Auth on startup
10. ✅ Roles renamed: USER→LOW, ADMIN→MID, SUPER_ADMIN→TOP

### Firebase Console Settings
- **Authentication > Sign-in method**: Email/Password enabled
- **Authentication > Templates > Password reset**: Action URL set to `https://cloud-store-ykd3.onrender.com/reset-password`
- **Authentication > URL Configuration**: Site URL = Render URL, Redirect URLs include Render URL

### CSP Directives (server/src/index.ts)
- `connect-src`: `'self'`, Firebase Auth domain, `identitytoolkit.googleapis.com`, `securetoken.googleapis.com`
- No Supabase URLs needed anymore
