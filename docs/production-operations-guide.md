# Waw (واو) — Production Operations Guide

## Table of Contents
- [Overview](#overview)
- [Architecture](#architecture)
- [Deployment](#deployment)
- [Monitoring](#monitoring)
- [Troubleshooting](#troubleshooting)
- [Security](#security)
- [Performance](#performance)

---

## Overview

This guide covers production operations for the Waw marketplace platform.

### System Components
| Component | Technology | Purpose |
|-----------|-----------|---------|
| API Server | Node.js/Express | Backend REST API |
| Database | PostgreSQL (Supabase) | Primary data store |
| Cache | Redis | Session, rate limiting, queues |
| Search | Typesense | Full-text product search |
| Queue | BullMQ | Background job processing |
| Monitoring | Sentry | Error tracking & alerting |

### Environment Variables

Required for production:

```bash
# Core
NODE_ENV=production
PORT=4000

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Redis
REDIS_HOST=your-redis-host
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password

# JWT
JWT_SECRET=your-jwt-secret-min-32-chars

# Payment (PostEx)
POSTEX_XPAY_MERCHANT_ID=your-merchant-id
POSTEX_XPAY_MERCHANT_PASSWORD=your-merchant-password

# Monitoring
SENTRY_DSN=your-sentry-dsn
LOG_LEVEL=info
```

---

## Architecture

### Request Flow
```
Client → CDN → Load Balancer → API Server → PostgreSQL
                                  ↓
                              Redis Cache
                                  ↓
                            BullMQ Workers
```

### Database Access Patterns
- **Reads**: Via Supabase client with RLS
- **Writes**: Via SECURITY DEFINER RPCs with auth.uid() verification
- **Locks**: Pessimistic locking via Redis for inventory operations

### Job Processing
- **Queue**: BullMQ with Redis backend
- **Retry**: Exponential backoff (3 attempts)
- **Dead Letter**: Failed jobs moved to dead-letter queue after retries

---

## Deployment

### Pre-Deployment Checklist
```bash
# 1. Run launch checklist
bash scripts/launch-checklist.sh

# 2. Verify migrations
bash scripts/verify-staging.sh

# 3. Run load tests
bash scripts/load-test.sh smoke
```

### Deployment Steps
```bash
# 1. Pull latest code
git pull origin main

# 2. Install dependencies
npm ci

# 3. Run migrations
npx supabase db push

# 4. Build applications
npm run build

# 5. Restart services
# (Docker/systemd/etc.)
```

### Rollback Procedure
```bash
# 1. Identify last known good commit
git log --oneline -10

# 2. Revert to that commit
git checkout <commit-hash>

# 3. Rebuild and restart
npm run build
# Restart services
```

---

## Monitoring

### Health Checks

| Endpoint | Purpose | Expected Response |
|----------|---------|-------------------|
| `GET /health` | Basic health check | `{"status": "ok"}` |
| `GET /readyz` | Readiness probe | `{"status": "ready"}` with dependency checks |
| `GET /livez` | Liveness probe | `{"status": "alive"}` |

### Key Metrics

Monitor these metrics:

1. **Response Time**: p95 < 1s, p99 < 2s
2. **Error Rate**: < 1%
3. **Memory Usage**: < 512MB heap
4. **Event Loop Lag**: < 100ms
5. **Queue Depth**: < 100 pending jobs

### Alerting Thresholds

| Metric | Warning | Critical |
|--------|---------|----------|
| Error Rate | > 5% | > 10% |
| Response Time p99 | > 2s | > 5s |
| Memory Usage | > 512MB | > 1GB |
| Queue Depth | > 100 | > 500 |

### Logs

Logs are structured JSON in production:

```json
{
  "timestamp": "2026-09-05T12:00:00Z",
  "level": "info",
  "message": "→ POST /api/orders 200",
  "correlationId": "req_1234567890_abc123",
  "method": "POST",
  "path": "/api/orders",
  "statusCode": 200,
  "durationMs": 150
}
```

---

## Troubleshooting

### Common Issues

#### High Response Times
1. Check database connection pool
2. Verify Redis connectivity
3. Check for slow queries in Supabase dashboard
4. Review event loop lag

#### Job Failures
1. Check dead-letter queue: `JobQueueManager.getDeadLetterStats()`
2. Review failed job details
3. Retry manually if transient: `JobQueueManager.retryDeadLetterJob(jobId)`

#### Authentication Errors
1. Verify JWT_SECRET is set
2. Check Supabase service role key
3. Review auth middleware logs

### Debug Mode
```bash
# Enable debug logging
LOG_LEVEL=debug npm start

# Trace specific requests
X-Correlation-Id: debug-123 curl -H "X-Correlation-Id: debug-123" http://localhost:4000/api/products
```

---

## Security

### Security Controls

1. **Authentication**: JWT + Session cookies
2. **Authorization**: RBAC (BUYER, SELLER, ADMIN, SUPPORT)
3. **Rate Limiting**: Per-endpoint limits with Redis backend
4. **Input Validation**: Zod schemas + XSS sanitization
5. **SQL Injection**: RLS policies + parameterized queries
6. **CSRF**: Token-based protection
7. **Headers**: Helmet security headers

### Security Audit
```bash
# Run RBAC verification
bash scripts/test-rbac.sh

# Run input validation audit
bash scripts/test-input-validation.sh

# Verify auth.uid() enforcement
psql -f scripts/verify-auth-uid.sql
```

### Incident Response
1. **Detect**: Monitor Sentry alerts
2. **Contain**: Disable affected endpoints if needed
3. **Eradicate**: Fix vulnerability
4. **Recover**: Deploy fix
5. **Review**: Post-incident analysis

---

## Performance

### Core Web Vitals Targets

| Metric | Target | Good |
|--------|--------|------|
| LCP | < 2.5s | < 1.8s |
| FID | < 100ms | < 50ms |
| CLS | < 0.1 | < 0.05 |
| TTFB | < 800ms | < 400ms |

### Load Testing
```bash
# Smoke test
bash scripts/load-test.sh smoke

# Load test (10 VUs, 5 min)
bash scripts/load-test.sh load

# Stress test (50 VUs, 10 min)
bash scripts/load-test.sh stress
```

### Performance Budget
```bash
# Check API response times
bash scripts/api-performance-budget.sh

# Audit web vitals
bash scripts/audit-web-vitals.sh http://localhost:3000
```

---

## Appendix

### Useful Commands

```bash
# Check API health
curl http://localhost:4000/health

# Check detailed readiness
curl http://localhost:4000/readyz

# View dead-letter queue
# (via API or Redis CLI)
redis-cli LLEN bull:waw-dead-letter-queue:wait

# Check Supabase status
npx supabase status
```

### Contacts

- **DevOps**: ops@waw.com.pk
- **Security**: security@waw.com.pk
- **On-Call**: oncall@waw.com.pk

---

*Last updated: September 5, 2026*
