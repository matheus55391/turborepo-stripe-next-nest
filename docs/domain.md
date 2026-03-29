# Domain Documentation

## Overview

Link-in-bio SaaS platform. Users create **Pages** (public profiles with a unique slug), add **Links** to them, and track **Clicks**. Two subscription tiers control resource limits via Stripe. Avatar uploads via MinIO/S3. Async processing via RabbitMQ. Redis caching for public pages.

Full observability via structured logging (Pino), Prometheus metrics, Grafana dashboards, and Loki log aggregation.

---

## Data Model

```
User (id, email, password, name, plan, stripeCustomerId, avatarUrl)
├── Subscription (stripeSubscriptionId, status, periodDates, cancelAtPeriodEnd)
└── Page (slug*, title, bio, avatarUrl, published)
    └── Link (title, url, position, visible)
        └── Click (createdAt)
```

- `Page.slug` is globally unique — serves as the public URL identifier
- Cascade delete: Page → Links → Clicks
- Links ordered by `position ASC`

---

## Plans & Limits

| | FREE | STARTER |
|---|---|---|
| Max pages | 1 | 5 |
| Max links per page | 3 | 10 |

Enforced at creation time. Exceeding limits → `ForbiddenException`.

---

## Infrastructure

### Caching (Redis)

- **Cache-aside** on `GET /pages/slug/:slug` — key `page:{slug}`, TTL 5 minutes
- On cache miss → query Postgres → write to Redis
- Cache invalidated on page update or delete (`redis.del()`)
- Also used as **rate limiter storage** for `@nestjs/throttler`

### Message Queue (RabbitMQ)

| Queue | DLQ | Purpose |
|-------|-----|---------|
| `click-tracking` | `click-tracking.dlq` | Async click analytics |
| `revalidation` | `revalidation.dlq` | ISR on-demand revalidation |
| `storage-cleanup` | `storage-cleanup.dlq` | Old avatar file deletion |
| `webhook-processing` | `webhook-processing.dlq` | Stripe event processing |

- All messages are **persistent** (durable queues)
- Failed messages retry up to **3 times** (via `x-retry-count` header)
- After max retries → message goes to Dead Letter Queue (`.dlq`)
- Connection auto-reconnects on failure (5s delay)

### Object Storage (MinIO / S3)

- Avatar uploads stored in `avatars` bucket
- Files named `{uuid}{ext}` (flat structure)
- Old avatars cleaned up asynchronously via `storage-cleanup` queue
- Public access via Nginx proxy at `/storage/`

### Reverse Proxy (Nginx)

- Load balances to API (`:4000`) and Web (`:3000`) upstream pools
- **Rate limiting zones:**
  - `api_global`: 30 requests/second
  - `auth_strict`: 5 requests/minute (login/register)
  - `click`: 10 requests/second
- Security headers: `X-Frame-Options`, `X-Content-Type-Options`, `X-XSS-Protection`, `Referrer-Policy`
- Gzip compression, 5 MB body limit
- `/storage/` proxied to MinIO with 1-hour cache headers
- WebSocket support for Next.js HMR

### ISR Revalidation

- When a page is updated/deleted, the API publishes to the `revalidation` queue
- Consumer calls `GET /api/revalidate?secret=...&slug=...` on Next.js
- Next.js revalidates the static page via `revalidateTag()`

### Observability

**Structured Logging (Pino):**
- `nestjs-pino` produces JSON logs with request ID, method, URL, status code, and duration
- Sensitive headers (cookies, authorization) are redacted
- `/metrics` endpoint excluded from access logs

**Metrics (Prometheus):**
- `GET /metrics` exposes Prometheus-format metrics via `prom-client`
- HTTP RED metrics: request rate, error rate, duration histogram (buckets: 5ms–10s) by method/route/status
- Cache metrics: `cache_hits_total` / `cache_misses_total` by key prefix
- Queue metrics: `queue_processed_total` / `queue_failed_total` by queue name
- Auth metrics: `auth_attempts_total` by action (register/login) and result (success/failure)
- Default Node.js metrics: CPU, heap, RSS, event loop lag, GC
- Route normalization: UUIDs and numeric IDs replaced with `:id` in labels

**Grafana Dashboard:**
- Pre-provisioned with 10 panels: Request Rate, Latency Percentiles (p50/p95/p99), Error Rate, Cache Hit Ratio, Cache Hits vs Misses, Queue Processed vs Failed, Auth Attempts, Requests by Route, Node.js Memory, Application Logs
- Datasources: Prometheus (metrics) + Loki (logs)

**Log Aggregation (Loki + Promtail):**
- Promtail discovers Docker containers via Docker socket, filters to project containers
- Logs shipped to Loki with container name and compose service labels
- 7-day retention, searchable in Grafana

---

## API Endpoints

### Health

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| GET | `/health` | No | Health check — reports database + Redis status |
| GET | `/metrics` | No | Prometheus metrics (HTTP, cache, queue, auth, Node.js runtime) |

Returns `{ status: 'ok' | 'degraded', checks: { database, redis } }` for `/health`.

### Auth

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| POST | `/auth/register` | No | Create account (email + password min 8 chars) |
| POST | `/auth/login` | No | Authenticate, sets JWT cookie (7 days) |
| POST | `/auth/logout` | No | Clears auth cookie |
| GET | `/auth/me` | JWT | Returns current user profile |
| PATCH | `/auth/avatar` | JWT | Upload avatar image (max 2 MB, jpeg/png/webp) |

### Pages

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| GET | `/pages` | JWT | List user's pages with link counts |
| POST | `/pages` | JWT | Create page (plan limit enforced) |
| GET | `/pages/:id` | JWT | Page detail + links (ownership check) |
| PATCH | `/pages/:id` | JWT | Update page (slug uniqueness re-checked) |
| DELETE | `/pages/:id` | JWT | Delete page (cascades) |
| GET | `/pages/slug/:slug` | No | **Public** — published page + visible links (Redis cached) |

### Links

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| GET | `/pages/:pageId/links` | JWT | List links ordered by position |
| POST | `/pages/:pageId/links` | JWT | Create link (plan limit enforced) |
| PATCH | `/pages/:pageId/links/:linkId` | JWT | Update link properties |
| DELETE | `/pages/:pageId/links/:linkId` | JWT | Delete link (cascades clicks) |
| POST | `/pages/:pageId/links/:linkId/click` | No | **Public** — track click (async via RabbitMQ) |

### Subscription

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| GET | `/subscription/plans` | No | List available plans with pricing |
| GET | `/subscription` | JWT | Current user's subscription details |
| POST | `/subscription/checkout` | JWT | Create Stripe checkout session |
| POST | `/subscription/portal` | JWT | Open Stripe billing portal |
| POST | `/subscription/cancel` | JWT | Cancel (immediate or at period end) |

### Webhooks

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| POST | `/webhooks/stripe` | Stripe signature | Handles checkout + subscription lifecycle (async via RabbitMQ) |

---

## Subscription Flow

```
User clicks upgrade
  → POST /subscription/checkout
  → Redirect to Stripe Checkout
  → Stripe sends checkout.session.completed webhook
  → Webhook queued to RabbitMQ (webhook-processing)
  → Consumer creates Subscription record + upgrades user plan to STARTER

Stripe renews/updates subscription
  → customer.subscription.updated webhook
  → Sync status, period dates, cancelAtPeriodEnd

User cancels
  → immediate=true  → cancel now via Stripe API
  → immediate=false → cancel at period end (soft cancel)

Subscription status becomes "canceled"
  → Auto-downgrade user plan to FREE
```

**Stripe is source of truth** — webhooks drive all plan state changes.

---

## Validation Rules

| Entity | Field | Rule |
|--------|-------|------|
| User | email | Valid format, unique |
| User | password | Min 8 characters |
| Page | slug | 3-40 chars, `^[a-z0-9]([a-z0-9-]*[a-z0-9])?$`, unique |
| Page | title | 1-60 chars, required |
| Page | bio | Optional, max 200 chars |
| Link | title | Min 1 char, required |
| Link | url | Valid URL format |
| Link | position | Non-negative integer, defaults to link count |

---

## Error Handling

All errors follow a consistent format via `AllExceptionsFilter`:

```json
{
  "statusCode": 400,
  "message": "Error description",
  "timestamp": "2025-01-01T00:00:00.000Z"
}
```

| Exception | When |
|-----------|------|
| `ConflictException` | Duplicate email, duplicate slug |
| `ForbiddenException` | Plan limit exceeded (pages or links) |
| `NotFoundException` | Entity not found or not owned by user |
| `UnauthorizedException` | Invalid credentials, missing/invalid JWT |
| `BadRequestException` | Invalid Stripe webhook signature |

---

## Security

- **Helmet** — Sets standard security headers on all API responses
- **HTTP-only cookies** — JWT never exposed to JavaScript (7-day expiry)
- **Dual-layer rate limiting** — Nginx `limit_req_zone` + NestJS `@nestjs/throttler` with Redis storage
- **Graceful shutdown** — `enableShutdownHooks()` ensures clean DB/Redis/RabbitMQ disconnection
- **Nginx headers** — `X-Frame-Options DENY`, `X-Content-Type-Options nosniff`, `X-XSS-Protection`

---

## Access Control

- All CRUD operations validate `req.user.id === entity.userId`
- Public routes: page by slug, link click tracking, plan listing, health check
- JWT delivered via HTTP-only cookie (7-day expiry)
