# Domain Documentation

## Overview

Link-in-bio SaaS platform. Users create **Pages** (public profiles with a unique slug), add **Links** to them, and track **Clicks**. Two subscription tiers control resource limits via Stripe.

---

## Data Model

```
User (id, email, password, name, plan, stripeCustomerId)
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

## API Endpoints

### Auth

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| POST | `/auth/register` | No | Create account (email + password min 8 chars) |
| POST | `/auth/login` | No | Authenticate, sets JWT cookie (7 days) |
| POST | `/auth/logout` | No | Clears auth cookie |
| GET | `/auth/me` | JWT | Returns current user profile |

### Pages

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| GET | `/pages` | JWT | List user's pages with link counts |
| POST | `/pages` | JWT | Create page (plan limit enforced) |
| GET | `/pages/:id` | JWT | Page detail + links (ownership check) |
| PATCH | `/pages/:id` | JWT | Update page (slug uniqueness re-checked) |
| DELETE | `/pages/:id` | JWT | Delete page (cascades) |
| GET | `/pages/slug/:slug` | No | **Public** — published page + visible links only |

### Links

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| GET | `/pages/:pageId/links` | JWT | List links ordered by position |
| POST | `/pages/:pageId/links` | JWT | Create link (plan limit enforced) |
| PATCH | `/pages/:pageId/links/:linkId` | JWT | Update link properties |
| DELETE | `/pages/:pageId/links/:linkId` | JWT | Delete link (cascades clicks) |
| POST | `/pages/:pageId/links/:linkId/click` | No | **Public** — track click |

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
| POST | `/webhooks/stripe` | Stripe signature | Handles checkout + subscription lifecycle |

---

## Subscription Flow

```
User clicks upgrade
  → POST /subscription/checkout
  → Redirect to Stripe Checkout
  → Stripe sends checkout.session.completed webhook
  → Create Subscription record + upgrade user plan to STARTER

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

| Exception | When |
|-----------|------|
| `ConflictException` | Duplicate email, duplicate slug |
| `ForbiddenException` | Plan limit exceeded (pages or links) |
| `NotFoundException` | Entity not found or not owned by user |
| `UnauthorizedException` | Invalid credentials, missing/invalid JWT |
| `BadRequestException` | Invalid Stripe webhook signature |

---

## Access Control

- All CRUD operations validate `req.user.id === entity.userId`
- Public routes: page by slug, link click tracking, plan listing
- JWT delivered via HTTP-only cookie (7-day expiry)
