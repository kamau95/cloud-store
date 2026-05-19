# Cloud Store — Session Context

## Project
Cloud store selling cloud service accounts (AWS, GCP, Azure credentials). Customers pay with USDT TRC-20 from exchange accounts (Binance, Coinbase, Kraken, Bybit).

## Payment Gateway: NOWPayments
- **API base**: `https://api.nowpayments.io/v1`
- **Auth**: API key (`x-api-key` header)
- **Fee**: 0.5% service fee (same-currency) + network fee (paid by customer via `is_fee_paid_by_user=true`)
- **Create payment**: `POST /v1/payment` — returns `pay_address`, `pay_amount`, `payment_id`, `expiration_estimate_date`
- **Get status**: `GET /v1/payment/{payment_id}`
- **IPN (webhook)**: `POST` to configured URL with HMAC-SHA512 signature in `x-nowpayments-sig` header
- **IPN verification**: Sort body keys alphabetically → `JSON.stringify` → HMAC-SHA512 with IPN secret → compare to `x-nowpayments-sig`
- **Pay currency**: `usdttrc20` (USDT on TRON TRC-20 network)
- **Checkout flow**: Create order → create payment → receive address → customer sends USDT → IPN callback → auto-deliver credential
- **Deployed URL**: `https://cloud-store-ykd3.onrender.com`

## Fee Structure
- **Admin fee**: 5% (`NOWPAYMENTS_ADMIN_FEE_PERCENT=0.05`)
- **Gateway fee**: 0.5% (`ASSUMED_FEE=0.005`)
- **Seller payout**: ~94.5% of product price (tracked per-order as `sellerAmount`)
- Customer pays listed price — no visible markup

## Admin Tiers
| Role | Credentials | Permissions |
|---|---|---|
| `SUPER_ADMIN` | `dev@cloudstore.com` / `super123` | Products, orders, accounts + fee summary + user list |
| `ADMIN` | `admin@cloudstore.com` / `admin123` | Products, orders, accounts only |
| `USER` | `user@test.com` / `user123` | Browse, purchase |

**Enforcement**: `requireAdmin` (ADMIN+SUPER_ADMIN), `requireSuperAdmin` (SUPER_ADMIN only) middleware in `server/src/middleware/auth.ts`. Routes split in `server/src/routes/admin.ts`.

## Key Files
| File | Purpose |
|---|---|---|
| `server/src/services/nowpayments.ts` | API client: `createPayment()`, `getPaymentStatus()`, `verifyIPN()`, `calculateFees()` |
| `server/src/routes/webhooks.ts` | HMAC-SHA512 IPN verification middleware + NOWPayments webhook route |
| `server/src/controllers/webhooks.ts` | Webhook handler — verifies payment, calls `processPayment` |
| `server/src/controllers/orders.ts` | Checkout flow, checkout details, payment status polling |
| `server/src/controllers/admin.ts` | Admin controllers — CRUD products, orders, accounts + `deleteOrder()` (cancelled only) |
| `server/src/routes/admin.ts` | Route-level admin/super-admin permission split |
| `client/src/pages/Checkout.tsx` | Checkout page — address display, exchange guide, pre-payment checklist, live polling |
| `client/src/pages/AdminDashboard.tsx` | Role-based rendering — super-admin sees fee cards |
| `client/src/pages/AdminOrders.tsx` | Orders management — desktop (tab filter + inline cards), mobile (vertical status accordion with inline details) |
| `client/src/pages/AdminUsers.tsx` | Super admin user management — list users, change roles |
| `client/src/pages/AdminProducts.tsx` | Product CRUD — create, edit, delete, JSON specs editor |
| `client/src/components/Layout.tsx` | Responsive nav — desktop inline links, mobile hamburger dropdown |
| `server/prisma/schema.prisma` | `Role` enum (USER/ADMIN/SUPER_ADMIN), `PaymentProvider` enum (NOWPAYMENTS), crypto+fee fields on Order |

## DB Migrations Applied (6)
1. `add_gatewaycrypto` — `GATEWAYCRYPTO` in `PaymentProvider` enum (legacy, replaced)
2. `add_crypto_payment_fields` — `cryptoAddress`, `cryptoAmount`, `cryptoCurrency`, `cryptoNetwork`, `cryptoExpiresAt`
3. `add_fee_fields` — `adminFee`, `gatewayFee`
4. `add_seller_amount` — `sellerAmount`
5. `add_super_admin_role` — `SUPER_ADMIN` in `Role` enum
6. `add_nowpayments` — `NOWPAYMENTS` in `PaymentProvider` enum

## Environment Variables (must be set on deploy)
| Variable | Value |
|---|---|
| `DATABASE_URL` | Render PostgreSQL connection string |
| `JWT_SECRET` | Strong random secret |
| `NOWPAYMENTS_API_KEY` | API key from NOWPayments dashboard |
| `NOWPAYMENTS_IPN_SECRET` | IPN secret key from NOWPayments dashboard (save on creation) |
| `NOWPAYMENTS_CALLBACK_URL` | `https://cloud-store-ykd3.onrender.com/api/orders/webhook/nowpayments` |
| `NOWPAYMENTS_ADMIN_FEE_PERCENT` | `0.05` |
| `APP_URL` | `https://cloud-store-ykd3.onrender.com` |
| `FRONTEND_URL` | `https://cloud-store-ykd3.onrender.com` |
| `GOOGLE_CLIENT_ID` | (placeholder — set up Google OAuth from Cloud Console when ready) |

## Current Status
- ✅ NOWPayments service layer implemented (`server/src/services/nowpayments.ts`)
- ✅ Migration applied — `NOWPAYMENTS` added to `PaymentProvider` enum
- ✅ Code pushed to GitHub (`main` branch)
- ✅ Deployed on Render (Dockerfile-based, single service)
- ✅ 6 migrations applied on deploy via `npx prisma migrate deploy`
- ✅ Admin can delete cancelled orders permanently (`DELETE /admin/orders/:id`)
- ✅ Admin user management UI — super admins can view users and change roles (`/admin/users`)
- ✅ Product specs editor — JSON field in admin product create/edit form
- ✅ Admin orders search & date filter — search by order ID / email, filter by date range
- ✅ Responsive mobile nav — hamburger menu with all links on small screens
- ✅ Admin orders mobile layout — vertical status accordion with inline order details
- ✅ Action buttons redesign — icons + filled buttons in a dedicated bottom bar
- ⏳ **Needs**: Register on NOWPayments → generate API key + IPN secret → set env vars on Render
- ⏳ **Needs**: Set payout wallet in NOWPayments dashboard (USDT TRC-20 address)

## How to Resume
1. Register at [NOWPayments.io](https://nowpayments.io) → Dashboard → Settings → API keys → generate API key + IPN secret
   - Then set `GOOGLE_CLIENT_ID` in server `.env` from Google Cloud Console → APIs & Services → Credentials → OAuth client ID (Web application)
   - Authorized JS origins: `http://localhost:5173`, `https://cloud-store-ykd3.onrender.com`
2. Set payout wallet in Dashboard → Settings → Payout wallets (USDT TRC-20 address)
3. Set env vars on Render: `NOWPAYMENTS_API_KEY`, `NOWPAYMENTS_IPN_SECRET`, `NOWPAYMENTS_CALLBACK_URL`
4. Redeploy on Render — migrations auto-apply on startup
5. Test checkout: log in → browse product → click "Buy Now" → see payment address → send USDT TRC-20
6. Verify webhook triggers credential delivery after payment confirmation
