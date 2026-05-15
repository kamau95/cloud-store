# Session 4 — Paymento Integration (completed)

## What was done
### Session 3 (abandoned)
- ~~BTCPay Server on Atal VPS~~ — abandoned, switched to Paymento

### This session — Replaced Coinbase + BTCPay with Paymento
- Created `server/src/services/paymento.ts` — Paymento API wrapper:
  - `createPayment(amount, orderId, returnUrl)` → token + paymentUrl
  - `verifyPayment(token)` → confirms payment status
  - `setIPNUrl(url)` — configure callback URL via API
- Added `verifyPaymentoWebhook` middleware (HMAC-SHA256, `X-HMAC-SHA256-SIGNATURE`)
- Added `handlePaymentoWebhook` controller:
  - Verifies signature → calls verify API → auto-delivers credential
  - Processes status `7` (Paid) and `8` (Approve)
- Simplified checkout: single Paymento flow (no more Coinbase→BTCPay fallback)
- Removed `coinbase.ts`, `btcpay.ts`, `CoinbaseCharge`, `CoinbaseWebhookEvent`, `BTCPayInvoice`, `BTCPayWebhookEvent` types
- Added `PAYMENTO` to Prisma `PaymentProvider` enum
- Updated `.env` vars: `PAYMENTO_API_KEY`, `PAYMENTO_WEBHOOK_SECRET`
- Updated frontend: ProductDetail payment text, types
- TypeScript: clean (both server + client)

## Key files
| Path | Role |
|---|---|
| `server/src/services/paymento.ts` | Paymento API service |
| `server/src/middleware/webhook.ts` | `verifyPaymentoWebhook` middleware |
| `server/src/controllers/webhooks.ts` | `handlePaymentoWebhook` + `processPayment` |
| `server/src/controllers/orders.ts` | Checkout — Paymento only |
| `server/src/routes/webhooks.ts` | Route: `POST /paymento` |

## To do next
- [ ] Sign up at https://app.paymento.io → get API Key + Webhook Secret
- [ ] Set `PAYMENTO_API_KEY` and `PAYMENTO_WEBHOOK_SECRET` on Render
- [ ] Configure IPN URL on Paymento to `https://cloud-store-ykd3.onrender.com/api/orders/webhook/paymento`
- [ ] Set up Vault properly (dev mode → production)
- [ ] Seed Vault with cloud credentials
- [ ] End-to-end test: buy product → crypto payment → webhook → auto-delivery
