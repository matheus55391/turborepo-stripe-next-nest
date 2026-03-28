---
description: "Use when editing, creating, or modifying any source file (.ts, .tsx). Enforces test-driven development: always find and run the related test file after changes."
applyTo: "apps/api/src/**/*.ts, apps/web/src/**/*.ts, apps/web/src/**/*.tsx"
---
# TDD Workflow — Mandatory Test Validation

When editing any source file, you MUST follow this workflow:

## 1. Identify the Test File

- For `src/foo/bar.ts` → look for `src/foo/bar.spec.ts` or `src/foo/bar.spec.tsx`
- For `src/foo/bar.tsx` → look for `src/foo/bar.spec.tsx`

## 2. Before Making Changes

- Read the existing test file to understand current coverage
- If no test file exists, **tell the user** and ask if you should create one

## 3. After Making Changes

- **Always run the relevant tests** to validate the change:
  - API: `cd apps/api && pnpm test -- --testPathPattern=<filename>`
  - Web: `cd apps/web && pnpm test -- --testPathPattern=<filename>`
- If tests fail, fix the issue before considering the task complete
- If you added new functionality, add or update tests to cover it

## 4. Never Skip Tests

- Do NOT mark a task as complete without running the related tests
- Do NOT say "you can run the tests to verify" — run them yourself
- If multiple files were edited, run tests for each one
