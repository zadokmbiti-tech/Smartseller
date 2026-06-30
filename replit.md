# SmartStock AI

A mobile POS + inventory management + AI forecasting app for Kenyan retailers (kibanda, mini-mart, pharmacy).

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string
- Required env: `SESSION_SECRET` — Express session secret

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5 (artifacts/api-server, serves at /api)
- DB: PostgreSQL + Drizzle ORM (lib/db)
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec at lib/api-spec/openapi.yaml)
- Build: esbuild (CJS bundle)
- Mobile: Expo SDK 54 + Expo Router (artifacts/mobile, serves at /)
- Data fetching: TanStack React Query (hooks from @workspace/api-client-react)

## Where things live

- `lib/db/src/schema/` — all Drizzle table definitions (categories, products, suppliers, purchase-orders, sales, inventory)
- `lib/api-spec/openapi.yaml` — OpenAPI spec (source of truth for API contract)
- `lib/api-client-react/src/generated/` — auto-generated React Query hooks + Zod schemas (run codegen to update)
- `artifacts/api-server/src/routes/` — Express route handlers (categories, products, suppliers, purchase-orders, inventory, sales, analytics, forecasting)
- `artifacts/mobile/app/` — Expo Router screens
- `artifacts/mobile/constants/colors.ts` — brand color tokens (primary: #0D7A5F teal)

## Architecture decisions

- OpenAPI-first: all API contracts defined in openapi.yaml, hooks generated via Orval; never manually write fetch calls on the client
- Numeric DB columns use Drizzle `numeric()` — Postgres returns them as strings in JS; always `Number()` cast before arithmetic
- `ANY(ARRAY[])` fails in Postgres — always guard with `sales.length > 0` before building saleId filter arrays
- After adding new schema files to lib/db, run `pnpm run typecheck:libs` before running api-server typecheck (stale declarations cause false "no exported member" errors)
- Route handlers use `{ res.status(X).json(Y); return; }` pattern for early exits to satisfy TypeScript's "not all code paths return a value" strict check

## Product

SmartStock AI lets small Kenyan shop owners:
- **POS**: ring up sales (Cash/M-Pesa/Bank), manage cart, checkout with haptic feedback
- **Inventory**: browse products with stock levels, view movements, add products, record adjustments
- **Dashboard**: see today's revenue, low-stock alerts, reorder recommendations
- **Reports**: sales trend, payment breakdown, top products by period

## User preferences

_None yet_

## Gotchas

- Always run `pnpm run typecheck:libs` after changing lib/db schema files, before api-server typecheck
- After adding new Expo Router screen files, restart the mobile workflow (Metro route map is built at startup)
- Expo Router hooks: params go as first arg, `{ query: {...} }` as second arg — NOT `{ query: {...} }` as first arg
- `GetTopProductsPeriod` and `GetPaymentBreakdownPeriod` don't include "today" — only "week" | "month" | "year"

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
