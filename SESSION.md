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
- **Split server architecture**: dedicated `split-server/` at `wildokapi.online` — own SQLite DB, receives NOWPayments IPN webhooks. Funds flow: Buyer → NOWPayments → Admin Balance → Split Server → Seller Wallet (via Mass Payouts).
- **Fee model**: single `MAINTENANCE_FEE_PERCENT` (default 20%) — one line item shown to seller, covers admin cut + NOWPayments gateway fees. Seller sees only "Maintenance Fee: $X".
- **No shared DB**: split server has its own SQLite database. Communicates with main app via callbacks (`POST /api/admin/internal/payout-callback`).
- **Order delivery via callback**: split server sends `payment_received` event → main app marks order PAID, reserves credential, marks DELIVERED, sends emails.
- **Payout via callback**: split server sends `payout_completed` event → main app updates `Order.payoutTxid`.
- **Seller wallet**: `PATCH /admin/users/:id/wallet` endpoint for super admin to set seller payout addresses.
- **Seller association**: `sellerId` field on credentials (upload schema + model).
- **Payout info on admin orders**: delivered orders display maintenance fee and TXID.

### Known Issues
- Firebase `accounts:lookup` 400 error on initial admin SPA load (cached/invalid session). Workaround: full page redirect after login + removed StrictMode.

## Key Decisions
- **Split server isolated**: own SQLite DB, no direct DB access to main app. Callback-based communication via `INTERNAL_API_KEY`.
- **Funds flow through admin balance**: buyer pays NOWPayments → settles in admin wallet → split server triggers Mass Payout to seller.
- **One maintenance fee**: single percent covers admin cut + gateway costs. Seller sees one deduction.
- **Payout background job every 15 min**: processes pending payouts via NOWPayments Mass Payouts API.
- **Seller wallet on User model**: super admin sets wallet address. Credentials linked to sellers via `sellerId`.

## Env Vars (Render)
- `ROOT_PATH` — hidden admin SPA path segment
- `SEED_SUPER_EMAIL` — super admin email (creates/updates each deploy)
- `SUPER_ADMIN_PASSWORD` — super admin password
- Firebase vars: `FIREBASE_API_KEY`, `FIREBASE_AUTH_DOMAIN`, `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`, `FIREBASE_STORAGE_BUCKET`, `FIREBASE_APP_ID`, `FIREBASE_MESSAGING_SENDER_ID`
- SMTP vars: `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`
- `APP_URL`, `FRONTEND_URL`, `DATABASE_URL`
- `SPLIT_SERVER_URL` — where split server lives
- `INTERNAL_API_KEY` — shared secret for callbacks

## Env Vars (Split Server)
- `DATABASE_URL=file:./split.db` — SQLite
- `NOWPAYMENTS_API_KEY`, `NOWPAYMENTS_IPN_SECRET`, `NOWPAYMENTS_SANDBOX`
- `MAINTENANCE_FEE_PERCENT=0.20`
- `INTERNAL_API_KEY` — shared secret with main app
- `MAIN_APP_CALLBACK_URL` — where split server sends payment/payout updates
