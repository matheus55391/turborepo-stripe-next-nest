# Fullstack Auth — Next.js + NestJS + Stripe

Fullstack monorepo built with **Turborepo**, featuring a **Next.js 16** frontend, a **NestJS 11** REST API, secure authentication via **JWT in HTTP-only cookies**, **Stripe** subscription billing, and a **PostgreSQL** database managed with **Prisma ORM**.

> Link-in-bio SaaS — create custom pages with links, track clicks, upload avatars, and manage subscriptions with FREE and STARTER plans.

---

## Table of Contents

- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Monorepo Structure](#monorepo-structure)
- [Infrastructure](#infrastructure)
- [Data Model](#data-model)
- [API — Endpoints](#api--endpoints)
- [Getting Started](#getting-started)
- [Available Scripts](#available-scripts)
- [Testing](#testing)
- [Environment Variables](#environment-variables)
- [License](#license)

---

## Tech Stack

| Layer          | Technologies                                                                             |
| -------------- | ---------------------------------------------------------------------------------------- |
| **Frontend**   | Next.js 16 · React 19 · TailwindCSS 4 · shadcn/ui v4 · React Query 5 · Zustand 5 · Zod |
| **Backend**    | NestJS 11 · Passport (JWT) · Swagger / OpenAPI · Helmet · class-validator                |
| **Database**   | PostgreSQL 16 · Prisma ORM 6                                                             |
| **Cache**      | Redis 7 (cache-aside + rate limit storage)                                               |
| **Queue**      | RabbitMQ 3 (async processing, DLQ, retry with backoff)                                   |
| **Storage**    | MinIO / S3 (avatar uploads)                                                              |
| **Payments**   | Stripe (Checkout, Billing Portal, Webhooks)                                              |
| **Infra**      | Docker Compose · Nginx (reverse proxy + rate limiting) · Turborepo · pnpm Workspaces     |
| **Testing**    | Jest 30 · Testing Library · ts-jest · next/jest · 210 tests                              |

---

## Architecture

```
                            ┌──────────────┐
                            │    Nginx     │ :80
                            │ Rate Limit   │
                            │ Reverse Proxy│
                            └──────┬───────┘
                       ┌───────────┴───────────┐
                       ▼                       ▼
               ┌──────────────┐        ┌──────────────┐
               │   Next.js    │        │   NestJS     │
               │    (web)     │        │    (api)     │
               │   :3000      │        │   :4000      │
               └──────────────┘        └──────┬───────┘
                                              │
                    ┌─────────────┬────────────┼────────────┬──────────────┐
                    ▼             ▼            ▼            ▼              ▼
            ┌────────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
            │ PostgreSQL │ │  Redis   │ │ RabbitMQ │ │  MinIO   │ │  Stripe  │
            │   :5432    │ │  :6379   │ │  :5672   │ │  :9000   │ │ (extern) │
            └────────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘
```

### Key Flows

**Authentication:**
1. User signs up or logs in via the frontend.
2. API validates credentials, generates a JWT, and returns it via `Set-Cookie` (`httpOnly`, `secure`, `sameSite: lax`).
3. All subsequent requests send the cookie automatically — no token stored in `localStorage`.
4. Next.js middleware (`proxy.ts`) guards private routes and redirects guests.

**Caching (cache-aside):**
1. `GET /pages/slug/:slug` checks Redis first (`page:{slug}`, TTL 5min).
2. On miss → query Postgres → cache the result in Redis.
3. On page update/delete → invalidate cache + trigger ISR revalidation.

**Async Processing (RabbitMQ):**
- **Click tracking** — fire-and-forget analytics (no blocking on page load)
- **ISR revalidation** — HTTP call to Next.js with retry
- **Avatar cleanup** — old file deletion from MinIO
- **Webhook processing** — Stripe event handling

All queues have: persistent messages, dead-letter queues (`.dlq`), and retry with max 3 attempts.

**Rate Limiting (dual-layer):**
- **Nginx layer:** `30r/s` global, `5r/m` auth, `10r/s` clicks
- **NestJS layer:** `@nestjs/throttler` with Redis-backed storage

---

## Monorepo Structure

```
├── apps/
│   ├── api/                  # NestJS — REST API
│   │   ├── prisma/           #   Schema + migrations
│   │   └── src/
│   │       ├── auth/         #   Register, Login, Logout, Me, Avatar upload
│   │       ├── page/         #   Page CRUD (link-in-bio) + Redis cache
│   │       ├── link/         #   Link CRUD + click tracking
│   │       ├── subscription/ #   Plans, Checkout, Portal, Cancel
│   │       ├── webhook/      #   Stripe webhooks
│   │       ├── stripe/       #   Stripe SDK wrapper
│   │       ├── prisma/       #   PrismaService (singleton)
│   │       ├── redis/        #   RedisService + ThrottlerStorage
│   │       ├── storage/      #   MinIO/S3 upload service
│   │       ├── rabbitmq/     #   RabbitMQ service + 4 consumers
│   │       ├── health/       #   Health check endpoint
│   │       └── common/       #   RevalidationService, AllExceptionsFilter
│   │
│   └── web/                  # Next.js — Frontend
│       └── src/
│           ├── app/          #   Pages + API routes (revalidation)
│           ├── components/   #   ProfileCard, BillingCard, PublicPageView
│           ├── contexts/     #   React Query + Theme Providers
│           ├── hooks/        #   Custom hooks
│           ├── queries/      #   React Query hooks (useMe, usePlans, etc.)
│           ├── stores/       #   Zustand stores (user state)
│           └── services/     #   API client functions
│
├── packages/
│   ├── shared/               # Shared types, Zod schemas, route constants
│   ├── ui/                   # Reusable UI components (shadcn/ui v4)
│   ├── eslint-config/        # Shared ESLint configuration
│   └── typescript-config/    # Base TSConfigs
│
├── envs/                     # Centralized environment variables
├── nginx/                    # Nginx reverse proxy config
├── scripts/                  # Helper scripts (coverage report)
├── docker-compose.yml        # PostgreSQL + Redis + MinIO + RabbitMQ + Nginx
└── turbo.json                # Turborepo pipeline
```

---

## Infrastructure

### Docker Compose Services

| Service        | Image                        | Port(s)       | Purpose                        |
| -------------- | ---------------------------- | ------------- | ------------------------------ |
| **Nginx**      | `nginx:alpine`               | `80`          | Reverse proxy, rate limiting   |
| **PostgreSQL** | `postgres:16-alpine`         | `5432`        | Primary database               |
| **Redis**      | `redis:7-alpine`             | `6379`        | Cache + rate limit storage     |
| **MinIO**      | `minio/minio:latest`         | `9000` `9001` | Object storage (avatars)       |
| **RabbitMQ**   | `rabbitmq:3-management-alpine` | `5672` `15672` | Message queue + management UI |

All services have health checks configured.

### RabbitMQ Queues

| Queue                | DLQ                       | Purpose                     |
| -------------------- | ------------------------- | --------------------------- |
| `click-tracking`     | `click-tracking.dlq`      | Async click analytics       |
| `revalidation`       | `revalidation.dlq`        | ISR cache revalidation      |
| `storage-cleanup`    | `storage-cleanup.dlq`     | Old avatar deletion         |
| `webhook-processing` | `webhook-processing.dlq`  | Stripe event processing     |

- Messages are persistent and durable
- Failed messages retry up to **3 times** before going to DLQ
- Connection auto-reconnects on failure

### Security

- **Helmet** — Security headers on API responses
- **HTTP-only cookies** — JWT never exposed to JavaScript
- **Dual-layer rate limiting** — Nginx + NestJS Throttler with Redis storage
- **Graceful shutdown** — `enableShutdownHooks()` ensures clean disconnection
- **Global exception filter** — Consistent error format: `{ statusCode, message, timestamp }`
- **Nginx headers** — `X-Frame-Options`, `X-Content-Type-Options`, `X-XSS-Protection`, `Referrer-Policy`

---

## Data Model

```prisma
enum Plan { FREE  STARTER }
enum SubscriptionStatus { ACTIVE  CANCELED  PAST_DUE  INCOMPLETE }

User 1──1 Subscription       (Stripe subscription)
User 1──N Page                (link-in-bio pages)
Page 1──N Link                (links within a page)
Link 1──N Click               (click tracking)
```

| Model            | Highlights                                                              |
| ---------------- | ----------------------------------------------------------------------- |
| **User**         | `email` unique · `password` (bcrypt) · `plan` enum · `stripeCustomerId` · `avatarUrl` |
| **Subscription** | `stripeSubscriptionId` · `status` enum · period dates · `cancelAtPeriodEnd` |
| **Page**         | `slug` unique · `title` · `bio` · `avatarUrl` · `published`            |
| **Link**         | `url` · `title` · `position` · `visible` · belongs to a `Page`         |
| **Click**        | Click record linked to a `Link`                                         |

### Plan Limits

| Plan        | Pages | Links per Page |
| ----------- | ----- | -------------- |
| **FREE**    | 1     | 3              |
| **STARTER** | 5     | 10             |

---

## API — Endpoints

Interactive Swagger documentation is available at **`/docs`** when the API is running.

### Health (`/health`)

| Method | Route     | Description                              | Auth |
| ------ | --------- | ---------------------------------------- | ---- |
| GET    | `/health` | Health check (database + Redis status)   | ✗    |

### Auth (`/auth`)

| Method | Route             | Description                   | Auth  |
| ------ | ----------------- | ----------------------------- | ----- |
| POST   | `/auth/register`  | Create account + set cookie   | ✗     |
| POST   | `/auth/login`     | Login + set cookie            | ✗     |
| POST   | `/auth/logout`    | Clear cookie                  | ✗     |
| GET    | `/auth/me`        | Get authenticated user        | ✓ JWT |
| PATCH  | `/auth/avatar`    | Upload avatar (max 2 MB)      | ✓ JWT |

### Pages (`/pages`)

| Method | Route              | Description                   | Auth  |
| ------ | ------------------ | ----------------------------- | ----- |
| GET    | `/pages/slug/:slug`| Public page by slug (cached)  | ✗     |
| GET    | `/pages`           | List user's pages             | ✓ JWT |
| POST   | `/pages`           | Create new page               | ✓ JWT |
| GET    | `/pages/:id`       | Page details with links       | ✓ JWT |
| PATCH  | `/pages/:id`       | Update page                   | ✓ JWT |
| DELETE | `/pages/:id`       | Delete page                   | ✓ JWT |

### Links (`/pages/:pageId/links`)

| Method | Route                                 | Description          | Auth  |
| ------ | ------------------------------------- | -------------------- | ----- |
| POST   | `/pages/:pageId/links/:linkId/click`  | Track click (async)  | ✗     |
| GET    | `/pages/:pageId/links`                | List links           | ✓ JWT |
| POST   | `/pages/:pageId/links`                | Create link          | ✓ JWT |
| PATCH  | `/pages/:pageId/links/:linkId`        | Update link          | ✓ JWT |
| DELETE | `/pages/:pageId/links/:linkId`        | Delete link          | ✓ JWT |

### Subscription (`/subscription`)

| Method | Route                    | Description                      | Auth  |
| ------ | ------------------------ | -------------------------------- | ----- |
| GET    | `/subscription/plans`    | List available plans             | ✗     |
| GET    | `/subscription`          | Current plan + details           | ✓ JWT |
| POST   | `/subscription/checkout` | Create Stripe Checkout session   | ✓ JWT |
| POST   | `/subscription/portal`   | Create Billing Portal session    | ✓ JWT |
| POST   | `/subscription/cancel`   | Cancel subscription              | ✓ JWT |

### Webhooks (`/webhooks/stripe`)

| Method | Route               | Events                                                                  |
| ------ | ------------------- | ----------------------------------------------------------------------- |
| POST   | `/webhooks/stripe`  | `checkout.session.completed` · `customer.subscription.updated` · `customer.subscription.deleted` |

---

## Getting Started

### Prerequisites

- **Node.js** ≥ 18
- **pnpm** 10+ (`corepack enable`)
- **Docker** (for PostgreSQL, Redis, MinIO, RabbitMQ, Nginx)
- **Stripe** account (test keys)

### 1. Install dependencies

```bash
corepack enable
pnpm install
```

### 2. Configure environment variables

```bash
cp envs/.env.example envs/.env.development
```

Edit `envs/.env.development` with your keys:

```env
DATABASE_URL="postgresql://app:app@localhost:5432/app?schema=public"
JWT_SECRET="your-long-random-secret"
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
STRIPE_STARTER_PRICE_ID="price_..."
NEXT_PUBLIC_API_URL="http://localhost:4000"
REVALIDATION_SECRET="your-revalidation-secret"
REDIS_URL="redis://localhost:6379"
RABBITMQ_URL="amqp://guest:guest@localhost:5672"
S3_ENDPOINT="http://localhost:9000"
S3_ACCESS_KEY="minioadmin"
S3_SECRET_KEY="minioadmin"
```

### 3. Start infrastructure

```bash
docker-compose up -d
```

This starts PostgreSQL, Redis, MinIO, RabbitMQ, and Nginx.

### 4. Run migrations

```bash
pnpm --filter api exec prisma migrate dev
```

### 5. Start the project

```bash
pnpm run dev
```

| Service             | URL                                                              |
| ------------------- | ---------------------------------------------------------------- |
| **Web**             | [http://localhost:3000](http://localhost:3000)                    |
| **API**             | [http://localhost:4000](http://localhost:4000)                    |
| **Swagger**         | [http://localhost:4000/docs](http://localhost:4000/docs)          |
| **Health Check**    | [http://localhost:4000/health](http://localhost:4000/health)      |
| **RabbitMQ UI**     | [http://localhost:15672](http://localhost:15672) (guest/guest)    |
| **MinIO Console**   | [http://localhost:9001](http://localhost:9001) (minioadmin/minioadmin) |
| **Nginx**           | [http://localhost](http://localhost)                              |

### 6. Stripe webhooks (development)

```bash
pnpm run stripe:listen
```

---

## Available Scripts

Run from the monorepo root with `pnpm run`:

| Script              | Description                                       |
| ------------------- | ------------------------------------------------- |
| `dev`               | Start API and Web in watch mode                   |
| `build`             | Production build (API + Web)                      |
| `lint`              | Lint all packages                                 |
| `format`            | Format code with Prettier                         |
| `check-types`       | TypeScript type checking                          |
| `test`              | Run all tests                                     |
| `test:cov`          | Tests with coverage report                        |
| `test:watch`        | Tests in watch mode                               |
| `test:cov:report`   | Formatted coverage report (backend + frontend)    |
| `db:up`             | Start PostgreSQL via Docker Compose               |
| `db:down`           | Tear down containers                              |
| `db:studio`         | Open Prisma Studio                                |
| `stripe:listen`     | Listen to Stripe webhooks locally                 |

---

## Testing

The project uses **Jest 30** with **210 tests** across **27 suites**:

**API (110 tests / 13 suites):**
- auth.service, auth.controller, page.service, link.service, webhook.controller
- subscription.controller, subscription.service, jwt.strategy
- rabbitmq.service, storage.service, throttler-storage-redis
- health.controller, all-exceptions.filter

**Web (100 tests / 14 suites):**
- queries (login, register, logout, me, plans, subscription, checkout, cancel, portal, avatar)
- proxy, providers, profile-card, billing-card, public-page-view
- pages (dashboard, login, register), stores (user-store), services (auth, pages, subscription)

```bash
# Run all tests
pnpm run test

# With coverage
pnpm run test:cov

# Watch mode
pnpm run test:watch
```

Minimum coverage threshold: **60%** (statements, branches, functions, lines) in both apps.

---

## Environment Variables

All environment variables are centralized in `envs/`. See [docs/environment-variables.md](docs/environment-variables.md) for full details.

| Variable                  | Used In | Description                             |
| ------------------------- | ------- | --------------------------------------- |
| `DATABASE_URL`            | API     | PostgreSQL connection string            |
| `JWT_SECRET`              | API     | Secret key for signing JWTs             |
| `PORT`                    | API     | API port (default: `4000`)              |
| `FRONTEND_ORIGIN`         | API     | Allowed CORS origin                     |
| `STRIPE_SECRET_KEY`       | API     | Stripe secret key                       |
| `STRIPE_WEBHOOK_SECRET`   | API     | Secret to validate webhooks             |
| `STRIPE_STARTER_PRICE_ID` | API     | Starter plan Price ID                   |
| `REVALIDATION_SECRET`     | Both    | Secret for ISR on-demand revalidation   |
| `REDIS_URL`               | API     | Redis connection string                 |
| `RABBITMQ_URL`            | API     | RabbitMQ connection string              |
| `S3_ENDPOINT`             | API     | MinIO/S3 endpoint URL                   |
| `S3_ACCESS_KEY`           | API     | MinIO/S3 access key                     |
| `S3_SECRET_KEY`           | API     | MinIO/S3 secret key                     |
| `S3_BUCKET`               | API     | Bucket name (default: `avatars`)        |
| `S3_REGION`               | API     | S3 region (default: `us-east-1`)        |
| `S3_PUBLIC_URL`           | API     | Public URL for avatars                  |
| `NEXT_PUBLIC_API_URL`     | Web     | API URL for the frontend                |

---

## License

This is a personal/portfolio project. All rights reserved.
