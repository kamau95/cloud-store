# Session 6 — GatewayCrypto integration, admin tiers, fee system

## What was done

### Payment gateway switch
- Replaced Paymento with **GatewayCrypto** as the sole payment gateway
- Created `server/src/services/gatewaycrypto.ts` — calls `POST /v1/payments` on GatewayCrypto API
  - `createPayment(currency, network, amount, orderId)` — generates unique deposit address
  - `getPaymentStatus(paymentId)` — server-side verification
  - `calculateFees(price)` — computes admin fee, gateway fee, seller amount

### Fee structure
- Customer pays the **listed price** (no visible markup)
- **Admin fee**: 5% (configurable via `GATEWAYCRYPTO_ADMIN_FEE_PERCENT`)
- **Gateway fee**: assumed 1% (configurable via `GATEWAYCRYPTO_ASSUMED_FEE`)
- **Seller amount**: the rest (~94%) — tracked per-order
- All fees tracked in DB: `adminFee`, `gatewayFee`, `sellerAmount` on Order model

### Admin role split (two-tier admin)
- Added `SUPER_ADMIN` role to `Role` enum
- **SUPER_ADMIN** (`dev@cloudstore.com` / `super123`):
  - Sees fee dashboard (admin fees, seller payouts, gateway fees)
  - Can view all users
  - Everything ADMIN can do
- **ADMIN** (`admin@cloudstore.com` / `admin123`):
  - Manage products, orders, accounts
  - Cannot see fees, users, or system-level data
- Backend: `requireSuperAdmin` middleware on fee/user routes
- Frontend: role-based rendering on AdminDashboard + Layout nav

### Checkout page (new)
- `client/src/pages/Checkout.tsx` — payment address display page
- Shows: amount, wallet address (with copy), network warning (TRC-20 ONLY)
- Exchange withdrawal guide (expandable: Binance/Coinbase/Kraken/Bybit)
- Pre-payment checklist (5 checkboxes before monitoring starts)
- Expiration timer (auto-refresh quote if expired)
- Live polling every 10s via `GET /orders/:id/status`
- Success screen with link to credentials

### Backend changes
- `server/src/middleware/gatewaycrypto-webhook.ts` — HMAC-SHA256 verification via `X-Signature`
- Webhook handler in `controllers/webhooks.ts` — verifies payment status server-side then calls `processPayment`
- Added `GET /orders/checkout/:id` — loads checkout details from stored crypto fields
- Added `GET /orders/:id/status` — polling endpoint for checkout page
- Added `GET /admin/fees` — super-admin-only fee summary
- `GET /admin/users` — super-admin-only user list

### Database migrations (3 new)
1. `20260516201548_add_gatewaycrypto` — adds `GATEWAYCRYPTO` to `PaymentProvider` enum
2. `20260516201820_add_crypto_payment_fields` — adds `cryptoAddress`, `cryptoAmount`, `cryptoCurrency`, `cryptoNetwork`, `cryptoExpiresAt` to Order
3. `20260516202717_add_fee_fields` — adds `adminFee`, `gatewayFee` to Order
4. `20260516203807_add_seller_amount` — adds `sellerAmount` to Order
5. `20260516204500_add_super_admin_role` — adds `SUPER_ADMIN` to `Role` enum

### Frontend changes
- `client/src/pages/Checkout.tsx` — new page (address + warnings + guide + polling)
- `client/src/pages/ProductDetail.tsx` — navigates to `/checkout/:id` instead of opening Paymento URL
- `client/src/pages/AdminDashboard.tsx` — role-based: super admin sees fee cards, regular admin doesn't
- `client/src/components/Layout.tsx` — admin nav link visible to both admin roles
- `client/src/types/index.ts` — updated for `SUPER_ADMIN` role, new `CheckoutResponse` shape

### Key config (`.env.example`)
```
GATEWAYCRYPTO_API_KEY=...
GATEWAYCRYPTO_WEBHOOK_SECRET=...
GATEWAYCRYPTO_CALLBACK_URL=...
GATEWAYCRYPTO_ASSUMED_FEE=0.01
GATEWAYCRYPTO_ADMIN_FEE_PERCENT=0.05
```

## Key files
| Path | Role |
|---|---|
| `server/src/services/gatewaycrypto.ts` | GatewayCrypto API wrapper + fee calculation |
| `server/src/middleware/gatewaycrypto-webhook.ts` | Webhook HMAC signature verification |
| `server/src/controllers/webhooks.ts` | Webhook handler + processPayment |
| `server/src/controllers/orders.ts` | Checkout flow (GatewayCrypto), payment status, fee breakdown |
| `server/src/routes/admin.ts` | Split routes: admin vs super-admin endpoints |
| `client/src/pages/Checkout.tsx` | Checkout page with address, warnings, exchange guide, polling |

## To do next
1. Sign up for GatewayCrypto, get API key, set env vars
2. Add fee card as payout wallet in GatewayCrypto dashboard
3. Set webhook route (`/api/orders/webhook/gatewaycrypto`) as callback in GC
4. Deploy to Render — run `npx prisma migrate deploy` for 5 new migrations
5. Test checkout flow end-to-end
6. If GatewayCrypto webhook signature format differs from assumed `X-Signature` HMAC-SHA256, adjust `middleware/gatewaycrypto-webhook.ts`
