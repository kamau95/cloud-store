# Session Log

## Goal
- Build a cloud account marketplace (AWS/GCP/Azure credentials sold via crypto payment) with Firebase Auth, hidden super admin panel, email notifications, and role-based access.

## Constraints & Preferences
- Super admin (TOP) uses a separate hidden SPA at a configurable `ROOT_PATH` env var — no links, no code in main bundle.
- Regular admins (MID) use visible `/admin/*` routes in the main app.
- Only one super admin account exists; super admin can invite/promote/demote other users (LOW ↔ MID).
- No "forgot password" on the hidden admin login page.
- Commit messages must be vague (no hints about feature).
- App deployed on Render at `cloud-store-ykd3.onrender.com`.
- Always ask user for commit message before committing changes.

## Progress

### Done
- All previous items (404/403 pages, admin routes, email service, admin SPA, seed, Firebase Auth setup, etc.)
- **Fixed `useAuth must be used within AuthProvider`**: admin SPA (`main.tsx`) now wraps with `AuthProvider`; `App.tsx` uses shared `useAuth()` instead of custom `useAdminAuth()`.
- **Fixed 403 on admin API endpoints**: `authenticate` middleware now loads user's role from DB instead of defaulting to `"LOW"`, so `requireAdmin`/`requireSuperAdmin` see the correct role immediately.
- **Fixed admin SPA dashboard links**: changed `/admin/products` etc. to dynamic `linkPrefix` — empty for TOP (admin SPA: `/products`) or `/admin` for MID (main app: `/admin/products`).
- **Fixed session not persisting after login**: `getMe` auto-creates DB record if Firebase-authenticated user has no DB entry (instead of returning 404).
- **Fixed Role enum mismatch**: DB had legacy values (`USER`, `ADMIN`, `SUPER_ADMIN`) while Prisma expected (`LOW`, `MID`, `TOP`). Added `migrateEnum()` to `seed.ts` that runs on startup.
- **Fixed server crash loop (502)**: moved seed to run after `app.listen()` so Render health check succeeds immediately (seed was blocking startup, causing restart loop).
- **Removed product seeding and user migration**: seed now only does enum migration + super admin `ensureUser`. Products and users are managed manually through the app.
- **Fixed `getMe` crash (P2002 unique constraint)**: when email exists with a different Firebase UID, update the existing record's UID instead of crashing.
- **Added `process.on("unhandledRejection")` handler**: prevents async errors in Express route handlers from crashing the Node process.
- **MID can view users**: removed `requireSuperAdmin` from `GET /admin/users` — MID can see all users but not modify roles. Hides TOP users from MID. LOW badge hidden, MID displays as "Admin".
- **Full page redirect on login**: admin SPA login now uses `window.location.href` instead of `navigate()` to force clean Firebase initialization.
- **Removed StrictMode from admin SPA**: prevents double-mount race conditions with Firebase auth listener.
- **Bulk user purge**: `POST /admin/users/purge` protected by `requireSuperAdmin` with date input UI in TOP users page.
- **Single user delete**: `DELETE /admin/users/:id` now permanently deletes user + orders (was just demoting to LOW). Trash button in expanded user details.
- **Responsive admin UI**: all admin pages now wrap/stack properly on mobile (flex-wrap, full-width inputs, stacked forms).
- **Login toast fix**: removed duplicate auth-check `useEffect` from admin login page — "Logged in" toast shows only once.

### Known Issues
- Firebase `accounts:lookup` 400 error on initial admin SPA load (cached/invalid session). Workaround: full page redirect after login + removed StrictMode.

## Key Decisions
- Seed runs in background after server starts to avoid Render health check timeout.
- `getMe` auto-creates DB record (or updates UID on conflict) instead of returning 404.
- Enums migrated via raw SQL on startup (ALTER TYPE ADD VALUE) instead of Prisma migrations.
- Admin SPA uses shared `AuthProvider` from main app to avoid duplicate auth logic.
- Full page redirect (`window.location.href`) on admin login to ensure clean Firebase auth initialization.
- Existing `deleteUser` controller changed from "demote to LOW" to permanent user+orders deletion.

## Env Vars (Render)
- `ROOT_PATH` — hidden admin SPA path segment
- `SEED_SUPER_EMAIL` — super admin email (creates/updates each deploy)
- `SUPER_ADMIN_PASSWORD` — super admin password
- Firebase vars: `FIREBASE_API_KEY`, `FIREBASE_AUTH_DOMAIN`, `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`, `FIREBASE_STORAGE_BUCKET`, `FIREBASE_APP_ID`, `FIREBASE_MESSAGING_SENDER_ID`
- SMTP vars: `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`
- `APP_URL`, `FRONTEND_URL`, `DATABASE_URL`
