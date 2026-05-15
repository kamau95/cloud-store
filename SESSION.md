# Session 5 — Vault → DB Credential model, Paymento live, production fixes

## What was done

### Infrastructure changes
- Replaced HashiCorp Vault with Prisma `Credential` model (credentials stored in PostgreSQL)
- Removed Vault from `docker-compose.yml` and all env config
- Created 3 DB migrations:
  - `20260515120000_add_paymento` — adds `PAYMENTO` to `PaymentProvider` enum
  - `20260515130000_add_credential_model` — creates `Credential` table, adds `credentialId` to `Order`, drops `vaultCredPath`

### Code changes
- **`server/src/services/vault.ts`** — Rewritten: now uses Prisma instead of HTTP to Vault. Same API (`storeCredential`, `getCredential`, `deleteCredential`, `listCredentials`, `reserveCredential`)
- **`server/src/controllers/webhooks.ts`** — Uses `credentialId` instead of `vaultCredPath`
- **`server/src/controllers/orders.ts`** — Uses `credentialId`, fixed `returnUrl` to use production host
- **`server/src/controllers/admin.ts`** — Uses `credentialId` instead of `vaultCredPath`
- **`server/src/index.ts`** — Calls `seedDatabase()` on startup before listening
- **`server/src/seed.ts`** — Extracted seed function compiled with the server (no tsx dependency at runtime)
- **`server/src/services/paymento.ts`** — Fixed `createPayment` response parsing: Paymento returns token as string in `body`, not `body.token`

### Frontend
- **`client/src/pages/Home.tsx`** — Updated to reference Paymento instead of Coinbase/BTCPay
- **`client/src/pages/ProductDetail.tsx`** — Updated payment text to Paymento

### DevOps
- Created `server/.env.example`
- Added `seed:vault` script to `server/package.json`
- Configured Paymento IPN URL to `https://cloud-store-ykd3.onrender.com/api/orders/webhook/paymento`
- Set Paymento API key + webhook secret in `server/.env`
- Set `PAYMENTO_API_KEY` and `PAYMENTO_WEBHOOK_SECRET` — **NOT set on Render dashboard env vars**

### Production state (as of end of session)
- ✅ Admin login works: `admin@cloudstore.com` / `admin123`
- ✅ Products are seeded (4 products, in stock)
- ✅ Health endpoint responds
- ❌ Checkout fails with "Payment provider failed" (last commit pushed but **needs manual deploy on Render**)
- ❌ `PAYMENTO_API_KEY` and `PAYMENTO_WEBHOOK_SECRET` need to be set as env vars on Render dashboard

## Key files
| Path | Role |
|---|---|
| `server/prisma/schema.prisma` | `Credential` model + Order.credentialId relation |
| `server/src/services/vault.ts` | Rewritten: Prisma-based credential management |
| `server/src/services/paymento.ts` | Paymento API wrapper (create/verify/setIPN) |
| `server/src/seed.ts` | Auto-seeds DB on server startup |
| `server/prisma/seed-vault.ts` | Seeds test credentials into DB |
| `server/prisma/migrations/20260515130000_add_credential_model/` | Migration for Credential table |

## To do next (in order)
1. **Manual deploy on Render** — go to dashboard.render.com → web service → Manual Deploy → Deploy latest commit (picks up Paymento API response fix for createPayment)
2. **Set env vars on Render** — add `PAYMENTO_API_KEY` and `PAYMENTO_WEBHOOK_SECRET` in Render dashboard → Environment
3. **Test checkout** — buy a product, get redirected to Paymento gateway
4. **Pay with ETH** — complete payment on Paymento
5. **Verify webhook** — check order status changes to DELIVERED and credential is assigned
6. **Seed production credentials** — via admin panel Upload Accounts or run `seed-vault.ts` locally against production DB
