# Waw Marketplace — Full-Site QA & Security Audit Report

**Date:** 2026-09-13
**Scope:** Buyer storefront (`apps/web`), Seller portal (`apps/seller`), Admin panel (`apps/admin`), Core API (`apps/api`), deployed environments, git history
**Method:** Live black-box API probing of production Railway API, deep code review of all four apps, git-history secret forensics, live credential validation (Typesense), CSRF/rate-limit/auth-guard verification
**Test environments:**
- API (live): `https://waw-production-8aca.up.railway.app` — `NODE_ENV=production`
- Web/Admin/Seller UIs: **not deployed** — `staging.waw.com.pk`, `staging-admin.waw.com.pk`, `staging-seller.waw.com.pk` do not resolve (DNS)
- Local full-stack: not runnable (Docker unavailable; API depends on remote Supabase/Upstash/Typesense)
- Browser/mobile viewport passes: not executable (no deployed UI); compensated by code-level review of all flows
- Data state: production DB contains **2 seed products** ("E2E Cotton Kurta", "E2E Wireless Earbuds") — no real catalog

---

## Executive Summary

The platform's **security architecture is genuinely strong** — server-authoritative pricing, quote tokens, idempotency keys, CSRF double-submit, HttpOnly SameSite=strict sessions, comprehensive rate limiting, parameterized queries, helmet/CSP, per-endpoint RBAC re-loaded from the DB. This is well above average for a marketplace.

However, the platform is **not launch-ready**. The dominant problem is not access control — it is **response-contract drift between UIs and the API**: the seller portal and admin panel were evidently only ever tested against empty databases, and their client-side field mappings don't match the API's actual responses. With real data, the seller Orders page, dashboard, Payouts page, and Products page crash, and five admin moderation queues (Stores, Reviews, KYC, Disputes, Returns) render permanently empty. Several admin buttons call endpoints that do not exist.

Additionally, the **production authentication and checkout pipelines are broken at runtime** (OTP send/verify → 500, guest cart → 500, guest order → 500 — all confirmed live), the production environment contains **live exposed secrets** (including a Typesense key with confirmed full admin privileges and a placeholder Raast webhook secret that passes validation), and the three UIs are **not deployed at all**.

**Verdict: NO-GO for launch.** Estimated remediation: 2–4 weeks for the launch blockers, 4–6 weeks for full launch quality.

### Top 5 Launch Blockers

| # | Blocker | Evidence |
|---|---------|----------|
| 1 | **Production auth & checkout are broken** — OTP send/verify returns `500 "Failed to send OTP"` (messaging creds blank), guest cart `GET /api/cart` returns 500, guest order creation returns 500. No customer can log in or buy anything. | Live probes, 2026-09-13 |
| 2 | **Live production secrets on disk + in git history** — root `.env` holds JWT secret, Supabase service-role key, DB password, Redis credentials; historical commit `1ac86f9` leaked a real DB password in `.env.staging`. The Typesense key exposed via `NEXT_PUBLIC_` was **live-confirmed to have full admin privileges** (created & deleted a test collection and API key during audit). | `.env:17-46`; git forensics; live Typesense test |
| 3 | **Raast payment webhook secret is the public placeholder `change_me_staging`** and passes the production length check (≥16). Anyone who knows the repo can forge a signed webhook, mark orders PAID/CONFIRMED, and trigger free fulfillment. | `.env:57`, `env.ts:172-174`, `app.ts:702-805` |
| 4 | **Seller portal is unusable with real data** — Orders page and dashboard crash (TypeError) because the client expects camelCase but the API returns snake_case; Payouts and Products have the same mapping bug; KYC submission silently drops CNIC/bank fields so onboarding fails. | `apps/seller/src/lib/api.ts:209-217` vs `seller.controller.ts:377-384` |
| 5 | **Admin moderation queues are dead** — Stores, Reviews, KYC, Disputes, and Returns pages always show "empty" due to response-shape mismatches; store approve/reject and payout-settle call non-existent routes (404, silent). Admin cannot run the marketplace. | `apps/admin/src/lib/api.ts:282-289,317-393` vs `admin.service.ts` |

---

## 1. Customer/User Journey — Findings

### Critical

| # | Role | Module/Flow | Steps to Reproduce | Expected Result | Actual Result | Severity | Recommendation |
|---|------|-------------|--------------------|-----------------|---------------|----------|----------------|
| C1 | Customer | Login (WhatsApp OTP) | `POST /api/auth/whatsapp-otp/send` with `{"phone":"+923000000001"}` against production API | 200 + OTP dispatched | **HTTP 500 `{"error":"Failed to send OTP"}`** — messaging credentials blank (TWILIO/META tokens empty in `.env:64-68`) | Critical | Configure WhatsApp/Twilio provider or fail-soft with a "login temporarily unavailable" state; alert on 5xx rate |
| C2 | Customer | Cart (guest) | Open storefront, add item to cart, refresh page; or `GET /api/cart?guestToken=x` on production | Cart persists and reloads | **HTTP 500** on the server cart (live); client-side, cart wipes on every refresh because `initGuestCart` is never called (`useCartStore.ts:188-197` dead code) | Critical | Fix DB/cart table failure; wire `initGuestCart` on app mount; add persist middleware as fallback |
| C3 | Customer | Guest checkout | `POST /api/orders/guest` with valid payload + matching CSRF cookie/header | Order created (COD) | **HTTP 500 "internal error"** even with valid CSRF — entire guest checkout is dead in production | Critical | Reproduce server-side (Supabase/RPC failure); add canary E2E against staging deploy |

### High

| # | Role | Module/Flow | Steps to Reproduce | Expected Result | Actual Result | Severity | Recommendation |
|---|------|-------------|--------------------|-----------------|---------------|----------|----------------|
| C4 | Customer | Checkout — Raast QR | Select "Raast QR" payment, confirm order | QR screen shown | Order is created, then `window.location.href = "/payment/raast?..."` redirects to a **route that doesn't exist → 404**, cart uncleared, no payment screen (`checkout/page.tsx:405`; only `/payment/result` exists) | High | Build `/payment/raast` page or render QR inline before order creation |
| C5 | Customer | Checkout — Card (Bank Alfalah APG) | Select debit/credit card, submit | Redirect to bank hosted page | CSP `form-action 'self'` (`next.config.mjs:84`) **blocks the cross-origin POST** to `card.postUrl` (`checkout/page.tsx:348-371`) — card payments cannot complete | High | Add APG origin to `form-action`, or navigate via `window.location` GET |
| C6 | Customer | Cart persistence | Add items, log out, log back in (or just F5) | Cart restored | Cart badge/drawer empty after refresh — server sync writes but never reads back | High | Covered by C2 |

### Medium

| # | Role | Module/Flow | Steps to Reproduce | Expected Result | Actual Result | Severity | Recommendation |
|---|------|-------------|--------------------|-----------------|---------------|----------|----------------|
| C7 | Customer | Product page — Stored XSS | As seller, save description containing `</script><img src=x onerror=alert(1)>`; open product page | Escaped/inert | `JSON.stringify` JSON-LD injected via `dangerouslySetInnerHTML` doesn't escape `/` → **script tag breakout** on buyer storefront (`ProductDetailClient.tsx:223`, `products/[id]/page.tsx:104`, `JsonLd.tsx:64…`) | Medium | `JSON.stringify(x).replace(/</g,"\\u003c")`; drop `'unsafe-eval'` from CSP |
| C8 | Customer | Login — Resend OTP | On OTP step, click "Resend Code", wait 45s | New OTP arrives | Button only restarts the countdown timer; **no API call is made** (`AuthModal.tsx:565-571`) | Medium | Call the send endpoint again with per-phone throttle |
| C9 | Customer | Social login | Fail a Google/Apple sign-in | Visible error | Redirects to `/?auth_error=...` but **no component reads the param** — silent failure (`auth/callback/route.ts:16,27`) | Medium | Toast/banner on homepage reading `auth_error` |
| C10 | Customer | Wishlist | Tap heart on product card, refresh | Wishlist persists | Local-only toggle, never calls `addToWishlist/removeFromWishlist` API; header badge resets; `/wishlist` page shows server data — **two divergent systems** (`useCartStore.ts:207`, `ProductCard.tsx:131`) | Medium | Route hearts through the API; single source of truth |
| C11 | Customer | Wishlist — Move to Cart | On `/wishlist`, click "Move to Cart" | Item moved & removed from wishlist | Calls `toggleWishlist` on an item not in local state → **adds it locally**; stays on server wishlist; badge count corrupted (`wishlist/page.tsx:57-68`) | Medium | Call `removeFromWishlist` explicitly |
| C12 | Customer | Post-payment | Complete payment → click "View Orders" | Order history | Links to `/orders` which **doesn't exist** (only `/orders/[id]`) → 404 (`payment/result/page.tsx:214`) | Medium | Link to `/account` orders tab or build `/orders` |
| C13 | Customer | Account page | Open `/account` while logged out | Login prompt | Full UI shell with **placeholder PII** (`customer@waw.pk`, `+92 300 1234567`) and **fabricated payment methods** (fake Raast ID, fake HBL card `••••4892`), non-functional notification toggles (`account/page.tsx:77-108, 516-601`) | Medium | Auth gate/redirect; remove fake data |
| C14 | Customer | Returns wizard | Start a return on a Karachi order | Editable, truthful flow | `pickupCity` hardcoded "Lahore" and not editable; fake pickup address prefilled; fabricated tracking number `REV-PTX-…`; success shows hardcoded "Refund PKR 3,200"; "5 Days Remaining" regardless of date; photo upload dropzone is decorative (no input) (`orders/[id]/return/page.tsx:35,80,134,246,449`) | Medium | Wire to real return API data; remove fabrications |
| C15 | Customer | API errors → empty states | Cause a 500 (e.g., current cart API outage), open account orders | Error message/retry | `fetchUserOrders` returns `[]` on any error → UI shows **"No Past Orders Found"** — misleading (`api.ts:549-589`, `account/page.tsx:92-106`) | Medium | Distinguish error vs empty; add retry CTA |
| C16 | Customer | Cart vs checkout totals | Apply a coupon, compare cart page total vs checkout quote | Identical totals | Cart subtracts coupon **after** GST; shared calculator/server quote subtracts **before** GST → different totals (`cart/page.tsx:312` vs `packages/types/src/pricing.ts:97-101`) | Medium | Use the shared pricing engine on the cart page |
| C17 | Customer | Order detail (guest/401) | Open another user's order URL | "Log in to view" | 401 and 404 render the same "Order Not Found" (`orders/[id]/page.tsx:59-72,144-165`) | Medium | Differentiate 401 → login prompt |

### Low

| # | Role | Module/Flow | Steps to Reproduce | Expected Result | Actual Result | Severity | Recommendation |
|---|------|-------------|--------------------|-----------------|---------------|----------|----------------|
| C18 | Customer | OTP input UX | Type letters into OTP boxes | Digits only | Non-digits accepted, confusing "Invalid OTP" (`AuthModal.tsx:120-131`); modal state not reset on dismiss (`:249-256`); loose phone normalization sends OTP to malformed numbers (`:43-49`) | Low | Filter `\d`, reset on close, validate PK format |
| C19 | Customer | Sign up | Toggle Login/Sign up tabs | Different behavior | Tabs are cosmetic — identical handler, no name/password collection (`AuthModal.tsx:25,344-367`) | Low | Merge or differentiate |
| C20 | Customer | Promo code field | View checkout promo input | Neutral placeholder | Placeholder **leaks a live-looking code** "AZADI2026" (`checkout/page.tsx:897`); removed voucher reappears due to stale sessionStorage (`:917-925`) | Low | Generic placeholder; clear storage on remove |
| C21 | Customer | Product Q&A | Submit a question, view Q&A tab | Question appears | Write-only: fetch is never called, tab always "No questions yet" (`ProductDetailClient.tsx:787-842`, `api.ts:801-809`); product badges never render (mapper drops `badges`) | Low | Wire fetch + map badges |
| C22 | Customer | Error UX | Trigger invoice download failure | Inline styled error | Blocking `alert()` dialogs (`orders/[id]/page.tsx:53`); ErrorBoundary renders raw `error.message` in production (`ErrorBoundary.tsx:51-59`) | Low | Toasts; generic error text |
| C23 | Customer | SEO/meta | Inspect titles, robots | Consistent branding | Homepage title punctuation differs from root default; robots.txt missing `/orders/`, `/payment/`; manifest theme-color (`#0F172A`) ≠ meta (`#FEF600`); duplicate conflicting JSON-LD on product pages; all client pages share default title | Low | Align titles/theme; disallow private routes; dedupe JSON-LD |

**Verified good (buyer):** pricing integrity (server quote tokens + `crypto.randomUUID()` idempotency, client prices ignored — `checkout/page.tsx:279-294`), PKCE+state OAuth, CSRF double-submit with retry, HttpOnly sessions revoked on logout, image optimizer host allow-list (anti-SSRF), search input sanitized (live probe: XSS/SQLi payloads returned 200 with empty result set, no error).

---

## 2. Seller Journey — Findings

### Critical

| # | Role | Module/Flow | Steps to Reproduce | Expected Result | Actual Result | Severity | Recommendation |
|---|------|-------------|--------------------|-----------------|---------------|----------|----------------|
| S1 | Seller | Orders / Dashboard | Log in as seller with ≥1 order; open `/orders` or `/` | Order list renders | `fetchSellerOrders` does zero field mapping (client camelCase vs API snake_case) → `order.sellerPayoutPkr.toLocaleString()` **throws TypeError → ErrorBoundary**. Before crash: statuses blank, action buttons never render, filters match nothing. Dashboard "Net Seller Earnings" shows **"PKR NaN"** (`apps/seller/src/lib/api.ts:209-217` vs `seller.controller.ts:377-384`) | Critical | Map snake_case → camelCase (pattern already exists in `fetchSellerStore`) |

### High

| # | Role | Module/Flow | Steps to Reproduce | Expected Result | Actual Result | Severity | Recommendation |
|---|------|-------------|--------------------|-----------------|---------------|----------|----------------|
| S2 | Seller | Payouts | Open `/payouts` with ≥1 payout row | Settlement ledger | Same mapping bug → `netPayoutPkr.toLocaleString()` **crashes page**; dates "Invalid Date"; "Total Settled" miscounts (`SETTLED` vs `COMPLETED` terminal status split); missing bank details show a **fabricated Meezan IBAN** as the disbursement target (`payouts/page.tsx:30-40,84-88`) | High | Fix mapping; unify payout terminal statuses; remove fake IBAN |
| S3 | Seller | Product catalog | Open `/products` with existing offers | Titles, images, stock, categories | Reads top-level fields that live nested → **blank titles, no images, everything "OUT OF STOCK", category "General"**; creating a product prepends a raw row → `basePricePkr.toLocaleString()` **crashes catalog**; editing blanks description & always sends `description:""`/`image_url:""` → server zod **400s every save** (`products/page.tsx:158,239,431`; `api.ts:252-268`; `schemas.ts:56,63`) | High | Map offer rows properly; send only changed fields; map insert response |
| S4 | Seller | Bulk upload | Download sample CSV → import it | Products imported | Sample ships with **empty Image_URL** → `z.string().url()` rejects every row; failures swallowed in `catch {}` → "Successfully imported 0 products" with no explanation; naive `split(",")` breaks on commas in titles (`bulk-upload/page.tsx:22-25,43-47,79-85`) | High | Quoted-CSV parser, header validation, per-row error reporting, default image handling |
| S5 | Seller | KYC submission | Complete settings KYC form → save | KYC accepted | Client sends `{cnic_number, bank_account_number…}`; API destructures `{cnic, bankAccount…}` → fields **silently dropped**, runtime 400 "Pakistani CNIC is required". Pre-built KYC schema never wired to route (`api.ts:438-449` vs `seller.controller.ts:146`; `app.ts:544`) | High | Align field names; attach `validateBody(SellerKycSchema)` |
| S6 | Seller | KYC documents | Look for CNIC/business doc upload in onboarding | Document collection | **No document upload exists at all** — only store logo; marketing claims "Nadra/FBR verification" (`page.tsx:123`) | High | Add document upload + admin review path |
| S7 | Seller | Order invoice | Click "Download Invoice" on any order | PDF | (a) sends **store-order ID** to a **parent-order** endpoint → 404; (b) endpoint authorizes **buyers only** → sellers can never succeed (`orders/page.tsx:240`; `order.controller.ts:316-339`) | High | Seller invoice endpoint with store ownership check |
| S8 | Seller | Order status transitions | As seller, PATCH own store-order status with arbitrary value | State machine enforced | `UpdateOrderStatusSchema` accepts all 8 statuses; `updateStoreOrderStatus` writes directly with **no transition validation** → CONFIRMED→DELIVERED (skips courier, triggers escrow maturity), DELIVERED→CANCELLED, etc. (`schemas.ts:136-143`; `seller.controller.ts:339-344`) | High | Reuse the courier service's monotonic transition gate |
| S9 | Seller | Coupons / Inventory | Open `/coupons` or try Inventory "Adjust" | Working features (both in nav) | `GET /api/seller/coupons` is **not registered → 404**, list always empty; `/api/seller/inventory/adjust` **doesn't exist** — page itself admits it via alert (`api.ts:309`, `inventory/page.tsx:61-76`) | High | Register both endpoints or remove nav items |
| S10 | Seller | Production auth topology | Deploy portal on split domain (portal ≠ API origin) | Data loads | API cookies are **host-only on the portal origin**; all browser fetches go to the **API origin** → cookies never sent → 401 → refresh 401 → dead session; works only on `localhost` (cookie hosts ignore ports). Also: middleware **deletes the session on API outage** (>30s), broken-401 handler never redirects to login; login page logo gets 307-redirected (matcher doesn't exclude public assets) (`session.controller.ts:20-34`; `seller/src/lib/api.ts:134-169`; `seller/src/middleware.ts:70-84`) | High | Cookie `Domain=.waw.com.pk` or same-origin API proxy; fail-open on outage; fix matcher & 401 redirect |

### Medium

| # | Role | Module/Flow | Steps to Reproduce | Expected Result | Actual Result | Severity | Recommendation |
|---|------|-------------|--------------------|-----------------|---------------|----------|----------------|
| S11 | Seller | Product status display | Create a listing (goes to PENDING approval) | "Pending review" indicator | Status column shows "Live" purely from stock count; PENDING/REJECTED never surfaced (`products/page.tsx:447-453`) | Medium | Show actual offer status |
| S12 | Seller | Commission display | View order detail | Store's actual rate | Hardcoded "Waw Platform Take (10%)" — real rate is per-store/subscription-adjusted (`orders/page.tsx:211`) | Medium | Read from store profile |
| S13 | Seller | Login UX | Click Google/Apple sign-in | Real OAuth | Fake `setTimeout` → "will be available soon"; "Verified Merchant" badge renders even for PENDING_KYC/SUSPENDED; `?from=` deep-link ignored after login (`login/page.tsx:101-108,193-255`; `SellerNav.tsx:123-126`; `middleware.ts:66`) | Medium | Hide fake OAuth; gate badge on status; honor `from` |
| S14 | Seller | Error surfacing | Trigger a validation error server-side | Field-level message | Client discards zod `details`, shows generic "Validation failed"; NaN stock → null → generic 400 with no field hint (`api.ts:171-173`) | Medium | Surface `details` per field |
| S15 | Seller | Empty/loading states | Open `/orders`, `/products`, `/payouts`, `/coupons` | Skeletons + empty states | No loading states (blank flash); no empty state on order list or coupon grid; `/feedback` (Reviews & Q&A) is a static placeholder in nav (`orders/page.tsx:111-174`; `feedback/page.tsx:1-45`) | Medium | Add skeletons/empty states; wire or remove feedback page |
| S16 | Seller | Terminology | Read nav, pages | Consistent vocabulary | Six names for orders ("Store Orders", "Sub-Orders", "Packages", "CN"…); five names for commission; three for payouts; "Merchant" vs "Seller" vs "Vendor"; overlapping nav items "Catalog & Inventory" vs "Stock Management" | Medium | Define a terminology glossary |
| S17 | Seller | Theme consistency | Open `/settings`, `/analytics`, `/ai/describe`, `/subscription` | Dark portal theme | Light-theme pages inside dark portal; skeletons use `bg-gray-100` | Medium | Unify theme |

**Verified good (seller):** server-side middleware role check (BUYER cannot open seller pages), OTP bypass env-gated and hard-fails in production, ownership checks on product update/delete and order status, soft-deletes preserve order/payout history, no IDOR found in seller client code, no tokens in localStorage.

---

## 3. Admin Journey — Findings

### Critical

| # | Role | Module/Flow | Steps to Reproduce | Expected Result | Actual Result | Severity | Recommendation |
|---|------|-------------|--------------------|-----------------|---------------|----------|----------------|
| A1 | Admin | Stores / Reviews / KYC / Disputes / Returns queues | Log in, open each page with data present | Lists render | Client expects `{stores}` / `{reviews,total}` / `{submissions}` / `{disputes,total}` / `{returns,total}`; API returns `{sellers,pagination}` or **raw arrays** → every queue **always shows its empty state**; moderation is impossible; empty states mask the bug (`lib/api.ts:282-393` vs `admin.service.ts:405-414,187-199,302-311,691-704`; `support.service.ts:303-325`) | Critical | Align response contracts; add contract tests |

### High

| # | Role | Module/Flow | Steps to Reproduce | Expected Result | Actual Result | Severity | Recommendation |
|---|------|-------------|--------------------|-----------------|---------------|----------|----------------|
| A2 | Admin | Store approve/reject | Click Approve on a store | Store approved | Calls `PATCH /api/admin/stores/:id/approve|reject` — **routes don't exist** (only `PATCH /api/admin/sellers/:id {status}`); 404 with **no error UI** → operator believes it worked (`lib/api.ts:282-289`; `app.ts:995-1000`) | High | Wire to the sellers endpoint; add onError toasts |
| A3 | Admin | Payout settle | Click "Settle" | Payout settled | Sends `PATCH …/settle`; API registers **POST** → 404; only `console.error` — silent failure on a money operation (`lib/api.ts:384-387`; `app.ts:1007-1012`) | High | Fix verb; surface errors; add confirmation dialog |
| A4 | Admin | Flash sales | Create flash sale with `{name, starts_at, ends_at, discount_percent}` | Sale created | API expects `{title, start_time, end_time…}` and has **no discount_percent field** → insert fails/logs only; add-item sends snake_case where controller reads camelCase → 400 (`lib/api.ts:474-492`; `admin.service.ts:893-915`; `admin.controller.ts:392-405`) | High | Align field names |
| A5 | Admin | MFA settings | Open `/settings/mfa`, click Enable/Verify | MFA enrolled | Page uses raw `fetch` **without `X-CSRF-Token`** → **all MFA operations 403** "CSRF token missing"; `/enroll` also never returns the secret so manual key entry is impossible (`settings/mfa/page.tsx:12-23,59-60`) | High | Use `adminFetch`; return secret from API |
| A6 | Admin | Orders oversight | Open `/orders` | True statuses | Page reads `order.status`; API returns `global_status` → badges **always empty**, selects always show PENDING regardless of truth; `items_count` vs `item_count` → items always 0 (`orders/page.tsx:144-159`; `admin.service.ts:567-581`) | High | Read `global_status`/`item_count` |
| A7 | Admin | Dispute resolution | Type a resolution, click Submit | Refund/payout action | UI sends **free text**; API expects enum `REFUND_BUYER / RELEASE_SELLER_PAYOUT / DISMISSED` — free text **silently closes the ticket with no financial action** (`disputes/page.tsx:33-43`; `support.service.ts:330-400`) | High | Enum-driven UI + amount field |
| A8 | Admin | Money actions safety | Click "Approve Refund" (real gateway refund) or "Settle" | Confirmation dialog | **No confirmation on any money-moving action**; order CANCELLED and KYC reject also one-click (`returns/page.tsx:131-139`; `payouts/page.tsx:145-151`; `orders/page.tsx:149-159`; `kyc/page.tsx:153-168`) | High | Confirmation dialogs on all irreversible actions |
| A9 | Admin | Production auth topology | Split-domain deploy | Admin panel works | Same host-only-cookie defect as seller portal → every data call 401s → login loop on any real deployment (`session.controller.ts:20-34`; `admin/src/lib/api.ts:24,48-50`) | High | Cookie domain or same-origin proxy |

### Medium

| # | Role | Module/Flow | Steps to Reproduce | Expected Result | Actual Result | Severity | Recommendation |
|---|------|-------------|--------------------|-----------------|---------------|----------|----------------|
| A10 | Admin | Login rate limiting | Brute-force admin login | Per-attacker limit | Proxied login makes API limiter key on the **admin server's IP** — all attackers + all admins share one 10/15min bucket (lockout DoS); no limiter at the admin edge (`login/route.ts:71-76`; `app.ts:354`) | Medium | Forward `X-Forwarded-For`; edge limiter |
| A11 | Admin | Search/filter | Search products by title; search users/orders | Hits | Product search queries **SKU only** (`admin.service.ts:76`) while UI says "Search products…"; **no search at all** on Users/Stores/Orders; Users role filter omits FINANCE/OPS/MODERATOR; Stores filter includes invalid `PENDING` status → empty; Orders filter omits OUT_FOR_DELIVERY/RETURNED | Medium | Title search; add user/order search; sync filter enums |
| A12 | Admin | Audit logs | Inspect who did what | Viewer | Logging is write-only: every entry hardcodes **actorRole "SUPER_ADMIN"** regardless of actor (14 call sites); **no audit viewer UI or read endpoint**; ban reasons generic (no prompt) (`admin.service.ts:136-869`; `Sidebar.tsx:33-51`) | Medium | Pass true role; build log viewer; reason prompt |
| A13 | Admin | Sub-admin roles | Log in as FINANCE/OPS_AGENT/MODERATOR | Scoped capabilities | They can log in (middleware allows) but **every `/api/admin/*` call 403s** (requires ADMIN); all 17 nav items render for every role; `/api/admin/mfa/*` missing `requireRole` entirely (any BUYER can call); `/api/uploads/:bucket` requires only `requireAuth` — **buyers can upload to the `stores` bucket** (`app.ts:1262, 1159-1175`; `require-role.middleware.ts`) | Medium | Per-route role lists incl. sub-admins; bucket allow-list |
| A14 | Admin | Analytics | Open dashboard/analytics | Accurate metrics | `codFeesCollectedPkr` **hardcoded 0**; GMV computed from `.limit(10000)` rows (understates at scale); "Active Sellers" = ALL stores incl. pending; "System Info" hardcodes 10%/PKR 5,000 instead of reading settings; no date ranges; **no export anywhere** (`admin.service.ts:20-38`; `analytics/page.tsx:43`) | Medium | Real COD fee metric; unbounded/count queries; CSV export |
| A15 | Admin | CMS gaps | Manage coupons/shipping/currency | Full CMS | **No admin coupon management exists** (seller-only creation); currency hardcoded+disabled; no shipping-zones/cities UI; banner form fields (`tag, campaign_type, sort_order, link_text…`) silently dropped by API; banner edit shows blank dates (`starts_at` vs `start_date`) (`admin.service.ts:977-1017`; `banners/page.tsx:70-115`) | Medium | Add coupon admin; wire banner fields |
| A16 | Admin | Mutation errors | Fail a Ban / order-status / product-reject call | Visible error | React Query mutations have **no onError** on users/orders/products/stores pages — failures invisible (32 handlers are `console.error`-only across the panel) | Medium | Global mutation toast |
| A17 | Admin | Unbounded lists | Open Disputes/Returns/Reviews/KYC | Paginated | Those API endpoints return **entire tables** (no server pagination); client fakes pagination by slicing 20 | Medium | Server-side pagination |

### Low

| # | Role | Module/Flow | Steps to Reproduce | Expected Result | Actual Result | Severity | Recommendation |
|---|------|-------------|--------------------|-----------------|---------------|----------|----------------|
| A18 | Admin | Nav hygiene | Inspect sidebar | Clean logout | `document.cookie` delete is a no-op on httpOnly cookie (dead code); `?from=` ignored; dead OAuth buttons error on click; login proxy returns raw `err.message` to client (info leak); no `X-Robots-Tag: noindex`; every tab shares one title; duplicate favicons; dark-mode flash on load | Low | Cleanup pass |

**Verified good (admin):** three-layer route protection (server middleware + client guard + per-endpoint `requireRole`), role re-loaded from DB on every request with banned-user rejection, TOTP MFA enforced server-side for privileged roles, session creation rejects role escalation, immutable audit trail (37 call sites), settings clamped by bounds + server schema, React Query invalidation (no optimistic-update masking).

---

## 4. Security & Vulnerability Checks — Cross-Cutting

### Critical

| # | Role | Module/Flow | Steps to Reproduce | Expected Result | Actual Result | Severity | Recommendation |
|---|------|-------------|--------------------|-----------------|---------------|----------|----------------|
| X1 | All | Secrets exposure | Read root `.env`; run `git log -S` | No live secrets in files/history | **Live production secrets on disk**: JWT secret, Supabase **service-role key** (bypasses all RLS), DB URL with password `Raufkhalid%40178%24`, Upstash Redis URL+token, Typesense key. Git history commit `1ac86f9` committed `.env.staging` with a real DB password (user `postgres`, 8-char password). Root `.env` is untracked (gitignore works now) but the damage pattern is established | Critical | **Rotate every secret immediately** (JWT, service-role, DB password, Redis, Typesense); purge secrets from git history (BFG); move to Railway secret store |
| X2 | All | Typesense admin key in browser bundle | Extract `NEXT_PUBLIC_TYPESENSE_API_KEY` from any storefront JS bundle; call Typesense | Scoped search-only key | **Live-verified full admin privileges**: during this audit the key successfully **created and deleted a test collection and created and deleted an API key** on `typesense-production-468f.up.railway.app`. Anyone can drop the product index or mint keys | Critical | Issue a scoped `documents:search` key for `NEXT_PUBLIC_`; keep admin key server-side only |
| X3 | Payments | Raast webhook forgery | Sign a `POST /api/payments/raast/webhook` payload with HMAC using the known placeholder secret | Rejected | `RAAST_WEBHOOK_SECRET=change_me_staging` in production `.env`; validation only checks length ≥16 (placeholder is 17) → forged webhook marks orders **PAID/CONFIRMED** and triggers courier booking + confirmation events = free goods. (Guard itself is correct: 401 on missing/bad signature in live tests) | Critical | Set a real 32+ char secret; blocklist placeholders in `env.ts` |
| X4 | All | Production runtime failures | (See C1-C3) | Healthy pipeline | OTP 500s, cart 500s, guest order 500s in production — platform non-functional and unmonitored (no Sentry DSN configured) | Critical | Fix + add uptime/5xx alerting |

### High

| # | Role | Module/Flow | Steps to Reproduce | Expected Result | Actual Result | Severity | Recommendation |
|---|------|-------------|--------------------|-----------------|---------------|----------|----------------|
| X5 | Seller | AI description IDOR | As subscribed seller A, `POST /api/ai/generate-description` with seller B's `product_id` | Ownership error | Only "owns *a* store with subscription" is checked; updates **any** `catalog_products.description` by id — defacement/phishing of any listing incl. 1P (`ai.controller.ts:41-46`) | High | Verify product→store ownership before update |
| X6 | Customer | Fake reviews | As any authenticated user, review a product never purchased | Rejected or moderated | "Verified purchase check" only sets a flag — review inserted with **status APPROVED, public immediately**, counted in rating aggregation; the strict RPC-gated reviews router exists but is **imported and never mounted** (dead code) (`app.ts:1296-1346`; `reviews.routes.ts` unmounted) | High | Reject or force PENDING for non-purchasers; delete dead router |
| X7 | All | Guest-order dispute IDOR | As any authenticated user, `POST /api/orders/:guestOrderId/dispute` with a guessed guest order UUID | 403 | Ownership check skipped when `buyer_id` is NULL → dispute opened on any guest order with attacker-set `claimedAmountPkr` → **freezes seller escrow payouts** (denial-of-payout weapon) (`order.service.ts:584`; contrast `support.service.ts:52`) | High | Require guest-token proof or reject disputes by non-owners |
| X8 | Auth | OTP brute-force limiter bypass | Alternate `03001234567` / `+923001234567` / `923001234567` on verify | One bucket per phone | `otpVerifyRateLimiter` keys on **raw body phone**; normalization happens after → each format variant gets its own 5/5min bucket against the same OTP key (`rate-limit.middleware.ts:190-193`; `auth.service.ts:44-46`) | High | Normalize before keying |

### Medium

| # | Role | Module/Flow | Steps to Reproduce | Expected Result | Actual Result | Severity | Recommendation |
|---|------|-------------|--------------------|-----------------|---------------|----------|----------------|
| X9 | Auth | OTP send bombing | Rotating IPs: `POST /api/auth/whatsapp-otp/send` for a victim phone | Per-destination cap | IP-keyed limiter only — **no per-phone cap**; each send replaces the victim's in-flight OTP (also locks out legitimate verification) (`rate-limit.middleware.ts:67-80`) | Medium | Per-phone send cap (e.g., 3/hour) |
| X10 | Auth | Token lifecycle | Steal a WhatsApp-OTP login JWT | Revocable, short-lived | 30-day bearer JWT, **not revocable** (revokeAllSessions only clears Redis sessions); Socket.IO trusts the JWT's `role` claim instead of DB → demoted admin retains admin socket powers up to 30 days (`auth.service.ts:142-150`; `server.ts:27-48`) | Medium | Short-lived JWTs or session-only; re-check role on socket join |
| X11 | All | Error leakage | Trigger errors on seller/admin/user/question/store endpoints | Generic message | 48+ handlers return raw `err.message` (Supabase/Postgres internals, constraint names); `sanitizeClientError` exists but applied inconsistently (`seller.controller.ts:127-547`, `admin.controller.ts:12-543`, etc.) | Medium | Route all errors through the sanitizer |
| X12 | All | File uploads | `POST /api/uploads/:bucket` with `shell.php` + `Content-Type: image/jpeg` | Extension allowlist | MIME checked from **client-supplied header only**; stored extension taken from user filename → `.php/.html/.svg` into **public** buckets (SVG = stored-XSS if rendered) (`upload.service.ts:68-73`; `upload.middleware.ts`) | Medium | Allowlist extensions; verify magic bytes |
| X13 | Admin | Payout settlement bypass | Admin settles a HELD/immature payout | Blocked by gates | `settlePayout` writes COMPLETED with **no status/maturity/dispute checks**, bypassing `PayoutSettlementService` gates (`admin.service.ts:500-535`) | Medium | Route through the settlement service |
| X14 | Payments | APG verify amplifier | Loop `GET /api/payments/apg/verify/:orderNumber` with arbitrary order numbers | Authenticated | Unauthenticated; each call triggers an outbound bank API inquiry; only global 120/min/IP limiter applies (`app.ts:630`) | Medium | Add paymentRateLimiter |
| X15 | All | Guest order DoS | `POST /api/orders/guest` with thousands of items | Bounded array | `items` array unbounded (only per-item qty ≤100) → N-query quote fan-out; bounded only by 500KB body + 5/min/IP (`schemas.ts:102-110`) | Medium | Cap items (e.g., 50) like the quote schema |
| X16 | All | CORS | Compromise an admin account | Static origins | Admins can extend `cors_allowed_origins` via marketplace settings → attacker domain whitelisted (`app.ts:170-175`) | Medium | Remove dynamic origin editing or restrict to SUPER_ADMIN |

### Verified defenses (live-tested or code-verified)

| Check | Result |
|---|---|
| Admin/seller endpoint access without auth (live) | 401 on all probed `/api/admin/*`, `/api/seller/*`, `/api/orders` |
| SQL injection in search/products | Not found — supabase-js parameterization; live payloads returned sanitized empty results |
| XSS in search inputs | Sanitized (global HTML-entity middleware + React escaping) |
| CSRF double-submit | Live-verified: POSTs without cookie/header → 403 "CSRF token missing" |
| Raast webhook HMAC | Live-verified: 401 on missing/bad signature (undermined only by X3 placeholder secret) |
| Security headers (live) | Helmet CSP, HSTS 180d, nosniff, X-Frame-Options SAMEORIGIN, COOP/COOP/Referrer-Policy, x-correlation-id |
| Cookie flags | HttpOnly + Secure(prod) + SameSite=strict; 15-min sessions; refresh rotation; fixation-safe fresh tokens |
| Rate limiting | Global 120/min + login 10/15m + OTP send/verify + orders 5/min + cart 30/min + reviews 3/min + MFA 5/5m (Redis-backed) |
| Pricing integrity | Server quote tokens (15-min JWT), checkout RPCs, client prices ignored; APG settlement requires bank IPN + amount match |
| Refunds | Over-refund gate, PAID-only, idempotency key, FINANCE+ role for completion |
| Test-OTP bypass (`123456`) | Env-gated; production boot hard-fails (but fragile: any non-`"production"` NODE_ENV re-enables it) |

---

## 5. Refinement & Polish Checklist

| Area | Status | Notes |
|---|---|---|
| Consistent UI | ❌ | Seller portal mixes light-theme pages in dark shell (S17); admin uses native `alert()`/`confirm()` inconsistently |
| Consistent terminology | ❌ | 6 names for orders, 5 for commission (S16); "Merchant/Seller/Vendor" mixed |
| Loading states | ⚠️ | Admin: good skeletons. Web: partial. Seller: missing on 4 core pages |
| Error messages | ❌ | Raw `err.message` leaks (X11); errors shown as empty states (C15); silent mutation failures (A16); generic "Validation failed" hides field details (S14) |
| Empty states | ⚠️ | Styled everywhere but **mask real data** on 5 admin pages and lie on seller orders/products due to mapping bugs |
| Form validation | ⚠️ | Client validation inconsistent with server zod (bank account regex, price 0, stock NaN); messages generic, not field-adjacent |
| Mobile responsiveness | ⚠️ | Not verifiable this pass (UIs not deployed); mobile-chrome Playwright project exists but suite requires all services |
| Page titles/meta/favicon | ⚠️ | Web storefront: strong (real generateMetadata, sitemap, robots). Seller/Admin: single shared title, no noindex on authenticated portals |
| Broken image placeholders | ❌ | Seller products render no images (mapping bug S3); seller login logo redirects (S10) |
| Currency/date formatting | ❌ | "PKR NaN" on seller dashboard (S1); "Invalid Date" on payouts (S2) |
| Staging/deployment | ❌ | Web/admin/seller staging domains don't resolve; production DB holds only 2 E2E seed products |

---

## Recommended Remediation Order

**Week 1 — Stop the bleeding (Critical)**
1. Rotate ALL secrets (X1/X2); purge git history; scoped Typesense key
2. Set real Raast webhook secret + placeholder blocklist (X3)
3. Fix production OTP/cart/guest-order 500s; wire Sentry/uptime alerts (X4, C1-C3)

**Week 2-3 — Make it usable (High)**
4. Fix all seller client↔API mapping contracts (S1-S3); KYC fields (S5); dead endpoints (S9)
5. Fix admin response contracts (A1); register/align broken endpoints (A2-A4); MFA CSRF (A5); orders fields (A6); dispute enum (A7)
6. Fix buyer payment paths: Raast 404 (C4), card CSP (C5), cart reload (C2)
7. Close IDOR/verification holes: AI description (X5), reviews (X6), guest disputes (X7), OTP limiter keying (X8)

**Week 4+ — Launch quality**
8. Confirmations on money actions (A8), per-role admin RBAC + nav gating (A13), audit log viewer + true actor roles (A12)
9. Error sanitization (X11), upload hardening (X12), search/filters (A11), exports (A14)
10. Polish: terminology, themes, empty/loading/error states, SEO titles, fake-data removal (C13, C14)

**Post-fix verification:** deploy staging domains, seed realistic data, run the existing Playwright suites (they already encode the auth/checkout/admin contracts), add UI↔API contract tests so the snake_case/camelCase class of bug can never recur, and re-run this audit's live probes.
