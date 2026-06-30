# SmartStock AI

A mobile POS, inventory management, and AI-driven forecasting app built for small Kenyan retailers kibandas, mini-marts, pharmacies, and similar shops.

It lets a shop owner ring up sales (Cash, M-Pesa, or Bank), track stock in real time, and get automatic reorder recommendations based on actual sales velocity without needing a data scientist or a spreadsheet.

## What it does

**Point of Sale (POS)**
Ring up a sale, build a cart, checkout against Cash, M-Pesa, or Bank, and record the transaction with full receipt and payment details (M-Pesa reference, bank reference, change due, discounts).

**Inventory Management**
Every product has a SKU, barcode, cost price, selling price, stock quantity, and reorder level. Stock changes are tracked two ways:
- **Stock movements**  automatic log of every change tied to a sale, purchase, adjustment, or return
- **Stock adjustments**  manual corrections for damage, shrinkage, opening stock, or returns, with before/after quantities recorded

**Suppliers & Purchase Orders**
Maintain a supplier list and raise purchase orders (draft → ordered → received → cancelled) with per-line quantities ordered vs. received, so partial deliveries are tracked accurately.

**AI Forecasting**
Instead of a black-box ML model, the MVP uses a transparent, explainable approach built directly off real sales data:
- **Reorder recommendations**  computes each product's average daily sales (30-day window) and flags items by urgency (critical / high / medium) based on days until stockout
- **Demand forecast per product**  90 days of sales history projected forward 30 days, with a confidence rating (high/medium/low) based on how much data exists
- **Stockout risk report**  surfaces every product projected to run out within 14 days, sorted by urgency

This is intentionally a simple moving-average model rather than a complex ML pipeline  it works from day one with limited data, and is honest about its confidence level. It can be swapped for a more sophisticated model (e.g. accounting for Kenyan payday/seasonal patterns) once a few months of real transaction data accumulate.

**Analytics Dashboard & Reports**
Revenue, gross profit (margin over cost), low-stock counts, and top-selling products by period (today/week/month/year), plus payment method breakdown (Cash vs M-Pesa vs Bank).

## Tech stack

| Layer | Technology |
|---|---|
| Monorepo | pnpm workspaces, Node.js 24, TypeScript 5.9 |
| API | Express 5, serves under `/api` |
| Database | PostgreSQL + Drizzle ORM |
| Validation | Zod (`zod/v4`) + `drizzle-zod` |
| API contract | OpenAPI spec (source of truth) → Orval-generated React Query hooks + Zod schemas |
| Mobile app | Expo SDK 54 + Expo Router |
| Data fetching | TanStack React Query |
| Build | esbuild (API server bundle) |

## Project structure

```
smart-seller/
├── lib/
│   ├── db/                  # Drizzle schema + DB client (source of truth for tables)
│   │   └── src/schema/      # categories, products, suppliers, purchase-orders, sales, inventory
│   ├── api-spec/            # openapi.yaml — the API contract
│   ├── api-client-react/    # auto-generated React Query hooks (via Orval)
│   └── api-zod/             # auto-generated Zod validators
├── artifacts/
│   ├── api-server/          # Express app — route handlers per domain
│   │   └── src/routes/      # categories, products, suppliers, purchase-orders,
│   │                        # inventory, sales, analytics, forecasting
│   ├── mobile/               # Expo Router app — POS, Inventory, Dashboard, Reports tabs
│   └── mockup-sandbox/      # Vite + shadcn/ui sandbox used for UI prototyping
└── scripts/                  # workspace utility scripts
```

## Data model (high level)

- **products**  SKU, barcode, cost/selling price, stock qty, reorder level, category
- **categories**  simple product grouping
- **suppliers**  contact details for restocking
- **purchase_orders / purchase_order_items**  ordered vs. received quantities per supplier order
- **sales / sale_items**  receipt-level record (payment method, totals, M-Pesa/bank refs) and line items (qty, unit price, cost price  cost price is captured at sale time for accurate margin reporting)
- **stock_movements**  automatic audit trail of every stock change (sale, purchase, adjustment, return)
- **stock_adjustments**  manual corrections with reason codes (damage, shrinkage, correction, opening stock, return)

All money columns are stored as Postgres `numeric`  Drizzle returns these as strings in JS, so the API layer always casts with `Number()` before doing arithmetic.

## Getting started

**Requirements:** Node.js 24, pnpm, a PostgreSQL database

```bash
# install dependencies
pnpm install

# set environment variables
# DATABASE_URL   — Postgres connection string
# SESSION_SECRET — Express session secret

# push the DB schema (dev only)
pnpm --filter @workspace/db run push

# run the API server (http://localhost:5000)
pnpm --filter @workspace/api-server run dev
```

If you change anything in `lib/api-spec/openapi.yaml`, regenerate the typed client hooks:
```bash
pnpm --filter @workspace/api-spec run codegen
```

Other useful commands:
```bash
pnpm run typecheck   # full monorepo typecheck
pnpm run build       # typecheck + build all packages
```

## API endpoints

All routes are mounted under `/api` and grouped by domain:

- `GET/POST /categories`
- `GET/POST /products`
- `GET/POST /suppliers`
- `GET/POST /purchase-orders`
- `GET/POST /inventory` (stock movements & adjustments)
- `GET/POST /sales`
- `GET /analytics/overview?period=today|week|month|year`
- `GET /forecasting/reorder-recommendations`
- `GET /forecasting/demand/:productId`
- `GET /forecasting/stockout-risk`

The full contract lives in `lib/api-spec/openapi.yaml`  treat it as the single source of truth; don't hand-write fetch calls on the client, regenerate hooks instead.

## Status

This is an MVP. Core POS, inventory, supplier/purchase-order tracking, and a first-pass forecasting model are implemented end-to-end (schema → API → mobile UI). Payment integration currently captures M-Pesa and bank references on the sale record; live Daraja STK Push and bank reconciliation are the natural next additions.

## License

MIT
