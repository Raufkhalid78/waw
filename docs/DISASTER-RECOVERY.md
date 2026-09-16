# Disaster Recovery & Backup Plan — Waw Marketplace

> Owner: fill in the contacts table before go-live. Review quarterly and after any
> infrastructure change. Related runbook: `docs/production-operations-guide.md`.

## 1. Backup Strategy

| Data store | Backup mechanism | Retention | Verification |
|---|---|---|---|
| Supabase PostgreSQL (orders, payments, profiles, ledger) | Supabase managed daily backups + **Point-in-Time Recovery (PITR)** | 7 days PITR window / 30 days daily | Daily: `bash scripts/verify-backups.sh` (fails loudly if `SUPABASE_PITR_ENABLED` is not set) |
| Cloudflare R2 (product images, KYC docs) | R2 bucket versioning (enable on both buckets) | 30 days previous versions | Monthly: spot-check restore of a random object |
| Typesense (search index) | **Not backed up** — fully re-indexable from Postgres | n/a | Rebuild drill: `POST /api/admin/search/reindex` after any Typesense restore |
| Upstash Redis (sessions, rate limits, idempotency cache) | **Not backed up** — cache/session data only; safe to lose | n/a | None — sessions re-authenticate on next request |

**RPO target: 5 minutes** (PITR granularity). **RTO target: 1 hour** (recreate project + restore + smoke test).

## 2. Restore Drill (run monthly — an untested backup is not a backup)

1. Create a **scratch** Supabase project (never restore into production).
2. Restore from PITR to a timestamp **before** a known test mutation (place a
   test order first so you can verify the restore actually rewinds it).
3. Point `DATABASE_URL` at the scratch project; run the API locally.
4. Verify: row counts reconcile (`orders`, `payments`, `profiles`, `stores`);
   a test order placed after the restore point is absent.
5. Rebuild the search index against the scratch DB (Typesense reindex) and run
   one checkout through the quote engine.
6. Record the drill result (date, RTO achieved, discrepancies) below.

**Drill log:** _(date / RTO / notes — keep appending)_

## 3. Failure Runbooks

### 3.1 Postgres unreachable (readyz fails, `/health` OK)
1. Confirm via `GET /readyz` (admin) which dependency is unhealthy.
2. Check the Supabase status page / project dashboard for incidents.
3. If Supabase is down platform-wide: put the storefront in maintenance mode,
   pause checkout (orders + payments) — browsing can stay up (cached).
4. If the database is corrupted/lost: restore per §2, promote the scratch
   project (update connection strings), then reindex Typesense.

### 3.2 Payment gateway down (Bank Alfalah APG / Raast)
1. COD is unaffected — keep it enabled so the marketplace still transacts.
2. Digital payments fail closed: APG/onsite initiation errors are surfaced to
   buyers with the order saved (`payment_status` stays PENDING) — **no money
   moves, no duplicate orders** (quote-token idempotency).
3. Queued settlements retry via the durable outbox
   (`outbox-processor.cron.ts`) — check `jobs` logs for retry exhaustion.
4. When the gateway recovers, buyers complete payment from the order page
   (Retry Payment) or WhatsApp support completes it manually.

### 3.3 Courier API down (PostEx)
1. Courier booking is event-driven via the outbox — bookings retry
   automatically; orders stay CONFIRMED, fulfilment lags.
2. CS should tell buyers "label pending" rather than cancelling.

### 3.4 Frontend/API deployment gone bad
1. Roll back on Railway: previous deployment → Redeploy (see the rollback
   section in `docs/production-operations-guide.md`).
2. Frontend (Vercel): `vercel rollback <deployment>` or promote the last good
   production build.
3. Migrations are forward-only additive — a code rollback should not require a
   DB rollback; verify with `supabase migration list`.

### 3.5 Data breach / credential leak
1. Rotate immediately: Supabase service-role key, JWT_SECRET (invalidates all
   sessions), guest token secret, payment provider credentials, Upstash/R2 keys.
2. Revoke all sessions: `profiles` → force logout via
   `POST /api/admin/users/:id/ban` for affected accounts, or rotate JWT_SECRET
   for a global kill.
3. Review `audit_logs` (admin panel → Audit Logs) for the actor/actions.
4. Notify affected users per PECA 2016 obligations; log the incident timeline.

## 4. Contacts

| Role | Name | Channel |
|---|---|---|
| Incident commander | _fill in_ | |
| Database/infra owner | _fill in_ | |
| Payments/bank liaison | _fill in_ | |
| Courier liaison | _fill in_ | |
| Legal/privacy (PECA) | _fill in_ | |
