# Project Guidelines

## Monorepo Structure

This is a Turborepo monorepo with:
- `apps/api` — NestJS backend (REST API, Prisma, Stripe)
- `apps/web` — Next.js frontend (React, TanStack Query, Zustand)
- `packages/shared` — Shared types, schemas, and routes (subpath exports: `@repo/shared/types`, `@repo/shared/schemas`, `@repo/shared/routes`)
- `packages/ui` — Shared UI components
- Environment variables are centralized in `envs/` (not in app folders)

## Code Style

- Use enums/constants from `@repo/shared/types` instead of hardcoded strings for `Plan` (`FREE`, `STARTER`) and `SubscriptionStatus` (`ACTIVE`, `CANCELED`, `PAST_DUE`, `INCOMPLETE`)
- Backend imports enums from `@prisma/client`; frontend imports from `@repo/shared/types`

## Test-Driven Development (TDD)

**Every code change MUST be validated by running the relevant unit tests.**

1. Before editing a source file, identify its corresponding `.spec.ts` / `.spec.tsx` test file
2. After editing, run the tests for that specific file to verify nothing broke
3. If adding new functionality, write or update tests first (or alongside the change)
4. If a test file doesn't exist for the file being modified, flag it to the user

### Running Tests

- **API tests:** `cd apps/api && pnpm test -- --testPathPattern=<file>`
- **Web tests:** `cd apps/web && pnpm test -- --testPathPattern=<file>`
- **All tests:** `pnpm test` (from root)

### Test Conventions

- Follow AAA pattern (Arrange-Act-Assert)
- Mock external dependencies (Prisma, Stripe, API calls)
- Test happy path, error cases, and edge cases
- Use meaningful assertions (not just truthy/snapshot checks)

## Build and Verify

- `pnpm run build` — Build all packages
- `pnpm run check-types` — Type-check without emitting
- `pnpm test` — Run all tests
