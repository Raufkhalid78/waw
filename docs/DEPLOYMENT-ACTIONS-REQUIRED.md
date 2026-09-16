# Deployment Actions Required  -  Post-Audit Fixes

**Date:** 2026-09-14 (updated)  **Status:** All code fixes complete and building (API, web, seller, admin  -  `tsc` clean; Flutter mobile `analyze` clean; 139/139 API unit tests pass). The actions below are operator steps that cannot be done from the repo.

---

## 0. NEW THIS CHANGE SET (2026-09-14 audit remediation)

1. **Migration `056_audit_stock_sync_and_ban_guard.sql` must be applied** (see 3 procedure):
   - Keeps `offer_variants.stock_quantity` in sync with the inventory ledger via trigger  -  without it every variant product shows "Out of Stock" on the storefront (the 047 backfill alone went stale immediately).
   - Blocks self-unban: banned users could flip `is_banned = false` via the owner-scoped profiles UPDATE policy.
2. **Rotate the Typesense browser key (2)**  -  the API now **hard-fails at boot in production** when `TYPESENSE_API_KEY === NEXT_PUBLIC_TYPESENSE_API_KEY`.
3. **Raast webhook secret**  -  placeholder values (e.g. `REPLACE_WITH*`) are now fatal at boot; the secret is REQUIRED in production. A fresh 48-char secret was generated into the local `.env`; mirror it in the Railway API service and the Raast merchant console.
4. Re-run `npm test --workspace=@waw/api`  -  new contract-regression tests (`tests/audit-contract-fixes.test.ts`, `tests/r2-storage.test.ts`) cover the dispute-resolution enum, /sell CNIC, coupon fields, settings bounds, product-edit camelCase, return-items payloads, and the R2 SigV4 signing path.

Money-path fixes shipped in code: admin dispute resolution now executes real refunds/payout holds (panel + service enum aligned, unknown values rejected); admin cancellation routes through the atomic `cancel_order` RPC; the Raast webhook settles through the same `settle_order_payment` RPC as APG; `reverseOrder` is mounted at `POST /api/admin/orders/:id/reverse`; marketplace settings PATCH is server-validated per key; store suspension cascades to offers (`SUSPENDED_BY_MARKETPLACE`); commission overrides are bounded 0 - 50 and default to the configured platform rate.

Commerce fixes: variant `stock_quantity` now selected by the products/search APIs; web session refresh-on-401 (orders no longer de-link after 15 min); user cart fetched after login; guest Raast QR initiation via order-phone capability with a stable idempotency key per quote (no duplicate orders); the 7-day return wizard sends real `items[]` with per-item quantity selection and no fabricated refund/tracking values; logged-in checkout derives province from `serviceable_cities`; guest coupon validation is public (preview only  -  redemption stays auth-gated server-side); buyer cancel button on the order page (pre-dispatch only); guest order-tracking page at **/track** using the order-number+phone lookup; real server-computed facets (categories/cities/price range) and soldCount on product lists; search pagination wired end-to-end; per-page metadata for cart/checkout/search/account/wishlist/help/sell/track; honest order-page payment status + GST/discount lines; account page renders real profile data (no fake PII) and distinguishes load errors from an empty order history.

Casing audit result: a full pass over every API  -  frontend  -  DB field path found and fixed the remaining shape bugs  -  account page `total_pkr`/`order_status`  -  `total_amount_pkr`/`global_status`; order page item reads now match the real `order_items` columns (no `product_image` column exists); the seller portal now reads the parent `orders` embed for buyer/payment fields; the Flutter mobile app now sums variant stock for `inStock` and merges flat + nested `order_items`/`shipments` shapes. The API's own PostgREST access had zero casing mismatches (verified by a script over all `.from/.eq/.insert/.update` call sites against the migration-derived schema).

## Cloudflare R2 media storage (when you're ready to switch)

The upload layer is driver-based (`apps/api/src/modules/uploads/`): with R2 credentials set, all uploads go to R2; without them it falls back to Supabase Storage - no code changes needed either way.

**Single-bucket layout** - one R2 bucket holds all media under folder prefixes (`product-images/`, `store-assets/`, `review-photos/`, `profile-avatars/`), with the CDN domain bound directly to the bucket. No Worker, no per-bucket domains.

1. Cloudflare dashboard > R2 > **Create bucket** > name `waw-media` (or set `R2_BUCKET` to override), location hint APAC, Standard storage class, no lifecycle rules, no r2.dev public access.
2. R2 > **Manage API tokens** > create a token: Object Read & Write, scoped to `waw-media`, no IP filter. Note the Access Key ID + Secret Access Key (shown once) and the Account ID.
3. `waw-media` bucket > **Settings** > **Custom Domains** > **Connect Domain** > `cdn.waw.com.pk` (domain must already be on Cloudflare DNS). TLS provisions automatically.
4. Set in the Railway API service:
   ```
   R2_ACCOUNT_ID=<cloudflare account id>
   R2_ACCESS_KEY_ID=<token access key>
   R2_SECRET_ACCESS_KEY=<token secret>
   R2_PUBLIC_BASE_URL=https://cdn.waw.com.pk
   ```
5. Verify: upload a product image from the seller portal - the returned URL must be `https://cdn.waw.com.pk/product-images/<userId>/...` and load publicly. Then (optionally) revoke the Supabase storage buckets.
6. The web image optimizer allowlist (`apps/web/next.config.mjs`) already permits `cdn.waw.com.pk`, `*.r2.cloudflarestorage.com` and `*.r2.dev`. If you choose a different public domain, add it to `images.remotePatterns`.

Uploads remain fully validated regardless of driver: role-gated buckets, 10 MB cap, magic-byte sniffing, server-generated object paths, and server-derived file extensions (never the client filename).
## 1. URGENT  -  Rotate exposed secrets (before anything else)

The root `.env` contained live production secrets on disk, and git history leaked a real DB password (commit `1ac86f9`, `.env.staging`). Anyone who has seen this machine or repo history may hold these.

| Secret | Where it's exposed | Rotate via |
|---|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | Root `.env` | Supabase Dashboard  -  Settings  -  API  -  *Reset service_role key*. Also rotate the anon key. |
| `DATABASE_URL` password (`postgres:Raufkhalid - `) | Root `.env` + **git history** | Supabase Dashboard  -  Database  -  reset the Postgres password. |
| `JWT_SECRET` | Root `.env` | Generate: `openssl rand -base64 48`  -  set in Railway. (Invalidates in-flight JWTs  -  fine, sessions are Redis-backed.) |
| Upstash Redis token/password | Root `.env` | Upstash console  -  rotate token. |
| Typesense admin key (`waw-search-key-2026-secure-prod`) | Root `.env` + **`NEXT_PUBLIC_TYPESENSE_API_KEY`** | See 2. |
| `RAAST_WEBHOOK_SECRET` | Was `change_me_staging` (public placeholder) | Generate: `openssl rand -base64 48`  -  set in Railway API service + share with the Raast merchant console. **The API now hard-fails in production on placeholder values.** |

Then set the real values **only in the Railway dashboard** (Variables per service). Root `.env` stays gitignored.

### Git history purge (DB password leak)
```powershell
git clone --mirror https://github.com/<you>/waw.git waw-clean
cd waw-clean
# using git-filter-repo:
pip install git-filter-repo
git filter-repo --replace-text <(echo "Raufkhalid%40178%24==>REMOVED") --force
git push --force --all
```
Coordinate with anyone holding clones to re-clone after the purge.

---

## 2. Typesense scoped key (admin key is in the browser bundle)

Confirmed during the audit: the `NEXT_PUBLIC_TYPESENSE_API_KEY` value has **full admin privileges** (it created/deleted collections and API keys). Anyone can extract it from the storefront JS bundle and drop your product index.

**Fix:**
1. On `https://typesense-production-468f.up.railway.app` (using the current admin key via a header), create a scoped search-only key:
   ```
   POST /keys
   {
     "description": "storefront search",
     "actions": ["documents:search"],
     "collections": ["products"],
     "expires_at": <far future or omit>
   }
   ```
2. Put the returned **generated key value** into `NEXT_PUBLIC_TYPESENSE_API_KEY` (web + any client) in Railway.
3. Keep the admin key only in the API's `TYPESENSE_API_KEY` (server-side).

---

## 3. Run the pending Supabase migrations

**Root cause of the production cart/guest-order 500s:** the deployed API expects the current schema, but the live database still has legacy FKs (`cart_items.variant_id  -  product_variants` instead of `offer_variants`). Migration `054_fix_cart_items_schema_drift.sql` (new, in this change set) fixes it.

Check applied versions, then apply everything pending (55 included  -  `055_public_advisory_lock_wrappers.sql`; **56 included  -  `056_audit_stock_sync_and_ban_guard.sql`, required for variant stock display and ban enforcement**):

```powershell
cd D:\Mobile Applications\waw\supabase
npx supabase login   # if needed
# Inspect what's pending first (dry-run):
npx supabase db push --linked --dry-run
# Apply:
npx supabase db push --linked
```

If you prefer the SQL editor: run each `migrations/NNN_*.sql` file **in order** that is not yet listed in `schema_migrations`, in one transaction per file, starting with `054`.

After applying, verify the cart is fixed:
```
GET https://api.waw.com.pk/api/cart?guestToken=anything   -  200 {"cartId":...,"items":[]}
```

---

## 4. WhatsApp/Twilio credentials (OTP login is broken)

`POST /api/auth/whatsapp-otp/send` returns `500 "Failed to send OTP"` in production because `META_WHATSAPP_TOKEN` / `META_WHATSAPP_PHONE_NUMBER_ID` / `TWILIO_*` are blank. **No customer can log in until this is configured.**

Set in the Railway API service (choose one path):
- **Meta WhatsApp Cloud API** (primary): `META_WHATSAPP_TOKEN` + `META_WHATSAPP_PHONE_NUMBER_ID` (WhatsApp Business console).
- **Twilio Verify fallback**: `TWILIO_ACCOUNT_SID` + `TWILIO_AUTH_TOKEN` + `TWILIO_VERIFY_SERVICE_SID`.

While unconfigured, the login modal will show the server error  -  acceptable for internal testing only.

---

## 5. Railway environment variables  -  API service (final state)

Set/verify these in the Railway **API** service (values from the fixed root `.env`, minus secrets you're rotating):

```
NODE_ENV=production
NEXT_PUBLIC_API_URL=https://api.waw.com.pk
CORS_ORIGIN=https://www.waw.com.pk,https://admin.waw.com.pk,https://seller.waw.com.pk
RAST_MERCHANT_ALIAS=waw@hbl
RAAST_MERCHANT_NAME=Waw
RAAST_MERCHANT_CITY=Lahore
RAAST_WEBHOOK_SECRET=<openssl rand -base64 48>
GUEST_TOKEN_SECRET=<openssl rand -base64 48>   # required for guest checkout
TYPESENSE_HOST=typesense-production-468f.up.railway.app
TYPESENSE_PORT=443
TYPESENSE_PROTOCOL=https
NEXT_PUBLIC_TYPESENSE_HOST=typesense-production-468f.up.railway.app
NEXT_PUBLIC_TYPESENSE_PORT=443
NEXT_PUBLIC_TYPESENSE_PROTOCOL=https
NEXT_PUBLIC_TYPESENSE_API_KEY=<scoped search-only key from 2>
APG_ENV=production            # when Bank Alfalah goes live (sandbox until then)
APG_MERCHANT_ID=<from bank>
POSTEX_API_TOKEN=<from PostEx> # courier booking; without it COD fulfillment is disabled
```

Web/seller/admin services: `NEXT_PUBLIC_API_URL=https://api.waw.com.pk` + their Supabase public vars.

**Note on cookies:** all four apps live on `*.waw.com.pk` and the API is `api.waw.com.pk`, so the host-only session cookies work only because the storefronts proxy login through same-origin Next routes while browsers send cookies cross-subdomain. If you ever see admin/seller data calls 401 in production, apply the cookie-domain fix: add `domain: ".waw.com.pk"` to the `waw_session`/`waw_refresh`/`waw_csrf` cookie options in `apps/api/src/modules/auth/session.controller.ts` + `csrf.middleware.ts` and redeploy all apps.

---

## 6. Deploy order (after 1 - 4)

1. Apply migrations (3)  -  the old API tolerates the new schema; the new API **requires** it.
2. Deploy the API service (this repo's fixes).
3. Deploy web, seller, admin.
4. Smoke test:
   - `POST /api/auth/whatsapp-otp/send`  -  200
   - `GET /api/cart?guestToken=x`  -  200
   - Guest checkout end-to-end on www.waw.com.pk
   - Seller portal: orders/payouts/products pages with real data
   - Admin: Stores/Reviews/KYC/Disputes/Returns lists render; approve/reject/settle work
5. Re-run the Playwright suites (`npm run test:e2e` with all services up)  -  they encode the auth/checkout/admin contracts.

---

## Summary of code fixes shipped in this change set

**API:** AI-description IDOR ownership check; reviews require verified purchase (else PENDING); guest-order dispute IDOR closed; OTP verify limiter normalizes phone + new per-phone send cap; placeholder-secret blocklist at boot; order-status state machine on both seller paths + admin path; admin payout settle gates (status + dispute checks) + true actor role in audit log; `GET /api/seller/coupons` registered; KYC accepts both field-name sets; seller invoice endpoint (`GET /api/seller/orders/:id/invoice`); CSP connect-src points at the real Typesense host; APG verify rate-limited; MFA enroll returns the secret.

**Seller:** snake_case - camelCase mappers for orders/payouts/products/coupons (crash bugs); KYC form fields + IBAN validation matching the API; invoice uses the seller endpoint; 401  -  login redirect; order-list empty state; status-update error surfacing.

**Admin:** response-shape fixes for Stores/Disputes/Returns/Reviews/KYC/Payouts (pages render data); store approve/reject wired to the real endpoint; payout settle POST + bank reference + confirm; money-action confirmations (refund/settle/KYC/cancel); disputes resolved via enum UI (Refund/Replacement/Reject) with amount; orders read `global_status`/`item_count` + full status filter list; MFA page sends CSRF; flash-sale create/add-item field mapping + window validation; payout terminal-status unification (SETTLED/COMPLETED/PAID).

**Web:** cart bootstrap on load + correct nested-response mapping (cart survives refresh); `/payment/raast` QR page built (was a 404 after order creation); CSP `form-action` allows Bank Alfalah hosted checkout; OTP resend actually resends + digits-only inputs; JSON-LD `</script>` breakout XSS escaped everywhere; OAuth failures surfaced on homepage; `/orders` 404 links fixed; fake payment methods & dead toggles on `/account` replaced with truthful copy; homepage title branding aligned.

**DB:** migration 054 fixes the `cart_items` FK drift (production cart 500s).

**Config:** root `.env` points at real domains (`api/www/admin/seller.waw.com.pk`), staging references removed, Raast merchant name de-staged, webhook secret marked for rotation.
