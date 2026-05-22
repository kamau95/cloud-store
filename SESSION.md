# Cloud Store — Session & Auth Architecture

## Auth System: Supabase Auth (replaced Passport.js)

- **Client**: `@supabase/supabase-js` SDK handles sign-up, sign-in, password reset
- **Server**: JWT verification middleware via `jsonwebtoken` + Supabase JWT secret
- **Profile**: `User` table in Postgres (via Prisma) stores `id` (Supabase UUID), `email`, `role`
- **Admin API**: Used for server-side operations (user creation in seed, logout, etc.)

### Key Files
| File | Purpose |
|---|---|
| `client/src/lib/supabase.ts` | Supabase client (anon key) |
| `client/src/context/AuthContext.tsx` | React context wrapping Supabase auth state |
| `client/src/api/client.ts` | API client auto-attaches Bearer token |
| `server/src/services/session.ts` | Supabase admin + anon clients, JWT verification |
| `server/src/middleware/auth.ts` | `authenticate`, `requireAdmin`, `requireSuperAdmin` |

### Auth Flow
1. User signs in via `supabase.auth.signInWithPassword()` on the client
2. Supabase SDK stores session, exposes `access_token`
3. API client reads token from session and sends as `Authorization: Bearer <token>`
4. Server middleware verifies JWT, looks up user's `role` from `User` table
5. Role-based guards (`requireAdmin`, `requireSuperAdmin`) check `req.user.role`

### Routes
- `POST /api/auth/register` — creates user in Supabase Auth + profile in DB
- `POST /api/auth/login` — authenticates via Supabase, returns tokens + profile
- `GET /api/auth/me` — returns current user profile
- `POST /api/auth/logout` — revokes all sessions
- `POST /api/password/forgot` — sends recovery email via Supabase
- `POST /api/password/reset` — updates password via Supabase

### Environment Variables (Server)
- `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`

### Environment Variables (Client)
- `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
