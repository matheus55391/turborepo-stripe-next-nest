# Fullstack Auth — Next.js + NestJS + Stripe

Fullstack monorepo built with **Turborepo**, featuring a **Next.js 16** frontend, a **NestJS 11** REST API, secure authentication via **JWT in HTTP-only cookies**, **Stripe** subscription billing, and a **PostgreSQL** database managed with **Prisma ORM**.

> Link-in-bio SaaS — create custom pages with links, track clicks, and manage subscriptions with FREE and STARTER plans.

---

## Table of Contents

- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Monorepo Structure](#monorepo-structure)
- [Data Model](#data-model)
- [API — Endpoints](#api--endpoints)
- [Getting Started](#getting-started)
- [Available Scripts](#available-scripts)
- [Testing](#testing)
- [Environment Variables](#environment-variables)
- [License](#license)

---

## Tech Stack

| Layer        | Technologies                                                                             |
| ------------ | ---------------------------------------------------------------------------------------- |
| **Frontend** | Next.js 16 · React 19 · TailwindCSS 4 · React Query 5 · React Hook Form 7 · Zod        |
| **Backend**  | NestJS 11 · Passport (JWT) · Swagger / OpenAPI · class-validator · class-transformer     |
| **Database** | PostgreSQL 16 · Prisma ORM 6                                                             |
| **Payments** | Stripe (Checkout, Billing Portal, Webhooks)                                              |
| **Infra**    | Docker Compose · Turborepo · pnpm Workspaces                                            |
| **Testing**  | Jest 30 · Testing Library · ts-jest · next/jest                                          |

---

## Architecture

```
┌─────────────┐       cookie HTTP-only       ┌─────────────┐
│             │  ◄──────────────────────────► │             │
│   Next.js   │        JSON / REST           │   NestJS    │
│   (web)     │  ────────────────────────►   │   (api)     │
│  :3000      │                              │  :4000      │
└─────────────┘                              └──────┬──────┘
                                                    │
                                          ┌─────────┴─────────┐
                                          │                   │
                                    ┌─────▼─────┐     ┌──────▼──────┐
                                    │ PostgreSQL │     │   Stripe    │
                                    │  (Docker)  │     │  (webhooks) │
                                    └───────────┘     └─────────────┘
```

**Authentication flow:**

1. User signs up or logs in via the frontend.
2. API validates credentials, generates a JWT, and returns it via `Set-Cookie` (`httpOnly`, `secure`, `sameSite: lax`).
3. All subsequent requests send the cookie automatically — no token stored in `localStorage`.
4. Next.js middleware (`proxy.ts`) guards private routes and redirects guest routes.

---

## Monorepo Structure

```
├── apps/
│   ├── api/                  # NestJS — REST API
│   │   ├── prisma/           #   Schema + migrations
│   │   └── src/
│   │       ├── auth/         #   Register, Login, Logout, Me
│   │       ├── page/         #   Page CRUD (link-in-bio)
│   │       ├── link/         #   Link CRUD + click tracking
│   │       ├── subscription/ #   Plans, Checkout, Portal, Cancel
│   │       ├── webhook/      #   Stripe webhooks
│   │       ├── stripe/       #   Stripe SDK wrapper
│   │       └── prisma/       #   PrismaService (singleton)
│   │
│   └── web/                  # Next.js — Frontend
│       └── src/
│           ├── app/          #   Pages (/, /login, /register, /dashboard)
│           ├── components/   #   ProfileCard, BillingCard
│           ├── contexts/     #   React Query Provider
│           ├── hooks/        #   Custom hooks
│           ├── queries/      #   React Query hooks (useMe, usePlans, etc.)
│           ├── schemas/      #   Zod schemas (via @repo/shared)
│           └── services/     #   API client functions
│
├── packages/
│   ├── shared/               # Shared types & Zod schemas
│   ├── ui/                   # Reusable UI components
│   ├── eslint-config/        # Shared ESLint configuration
│   └── typescript-config/    # Base TSConfigs
│
├── envs/                     # Centralized environment variables
├── scripts/                  # Helper scripts (coverage report)
├── docker-compose.yml        # PostgreSQL 16
└── turbo.json                # Turborepo pipeline
```

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

| Model          | Highlights                                                              |
| -------------- | ----------------------------------------------------------------------- |
| **User**       | `email` unique · `password` (bcrypt) · `plan` enum · `stripeCustomerId` |
| **Subscription** | `stripeSubscriptionId` · `status` enum · period & `cancelAtPeriodEnd` |
| **Page**       | `slug` unique · `title` · `bio` · `avatarUrl` · `published`            |
| **Link**       | `url` · `title` · `position` · `visible` · belongs to a `Page`         |
| **Click**      | Click record linked to a `Link`                                         |

### Plan Limits

| Plan      | Pages   | Links per Page   |
| --------- | ------- | ---------------- |
| **FREE**    | 1       | 3                |
| **STARTER** | 5       | 10               |

---

## API — Endpoints

Interactive Swagger documentation is available at **`/docs`** when the API is running.

### Auth (`/auth`)

| Method | Route             | Description                   | Auth  |
| ------ | ----------------- | ----------------------------- | ----- |
| POST   | `/auth/register`  | Create account + set cookie   | ✗     |
| POST   | `/auth/login`     | Login + set cookie            | ✗     |
| POST   | `/auth/logout`    | Clear cookie                  | ✗     |
| GET    | `/auth/me`        | Get authenticated user        | ✓ JWT |

### Pages (`/pages`)

| Method | Route              | Description                   | Auth  |
| ------ | ------------------ | ----------------------------- | ----- |
| GET    | `/pages/slug/:slug`| Public page by slug           | ✗     |
| GET    | `/pages`           | List user's pages             | ✓ JWT |
| POST   | `/pages`           | Create new page               | ✓ JWT |
| GET    | `/pages/:id`       | Page details with links       | ✓ JWT |
| PATCH  | `/pages/:id`       | Update page                   | ✓ JWT |
| DELETE | `/pages/:id`       | Delete page                   | ✓ JWT |

### Links (`/pages/:pageId/links`)

| Method | Route                                 | Description          | Auth  |
| ------ | ------------------------------------- | -------------------- | ----- |
| POST   | `/pages/:pageId/links/:linkId/click`  | Track click          | ✗     |
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
- **Docker** (for PostgreSQL)
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
```

### 3. Start the database

```bash
pnpm run db:up
```

### 4. Run migrations

```bash
pnpm --filter api exec prisma migrate dev
```

### 5. Start the project

```bash
pnpm run dev
```

| Service       | URL                                                         |
| ------------- | ----------------------------------------------------------- |
| **Web**       | [http://localhost:3000](http://localhost:3000)               |
| **API**       | [http://localhost:4000](http://localhost:4000)               |
| **Swagger**   | [http://localhost:4000/docs](http://localhost:4000/docs)     |

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

The project uses **Jest 30** with **147 tests** across **24 suites**:

- **API (79 testes):** auth.service, auth.controller, page.service, link.service, webhook.controller, subscription.controller, subscription.service, jwt.strategy
- **Web (68 testes):** queries (login, register, logout, me, plans, subscription, checkout, cancel, portal), proxy, providers, profile-card, billing-card, pages (dashboard, login, register)

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

| Variable                    | Description                         | Example                                |
| --------------------------- | ----------------------------------- | -------------------------------------- |
| `DATABASE_URL`              | PostgreSQL connection string        | `postgresql://app:app@localhost:5432/app` |
| `JWT_SECRET`                | Secret key for signing JWTs         | `a-long-random-string`                 |
| `PORT`                      | API port                            | `4000`                                 |
| `FRONTEND_ORIGIN`           | Allowed CORS origin                 | `http://localhost:3000`                |
| `STRIPE_SECRET_KEY`         | Stripe secret key                   | `sk_test_...`                          |
| `STRIPE_WEBHOOK_SECRET`     | Secret to validate webhooks         | `whsec_...`                            |
| `STRIPE_STARTER_PRICE_ID`   | Starter plan Price ID               | `price_...`                            |
| `NEXT_PUBLIC_API_URL`       | API URL for the frontend            | `http://localhost:4000`                |

---

## License

This is a personal/portfolio project. All rights reserved.
