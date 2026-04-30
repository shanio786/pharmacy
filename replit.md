# PharmaCare — Pharmacy Management System

## Overview

Full-stack pharmacy management web app for Pakistani pharmacies. Built as a pnpm monorepo.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **Frontend**: React + Vite + Tailwind CSS + shadcn/ui (artifact: `artifacts/pharmacy`, preview path: `/`)
- **API framework**: Express 5 (artifact: `artifacts/api-server`, preview path: `/api`)
- **Database**: PostgreSQL + Drizzle ORM (`lib/db`)
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval — generates React Query hooks from OpenAPI spec into `lib/api-client-react`
- **Routing**: wouter (frontend), Express 5 (backend)
- **Auth**: JWT tokens stored in localStorage key `pharma_token`, passed via Bearer header using `setAuthTokenGetter`

## Architecture

```
artifacts/
  api-server/     — Express 5 API server (port from $PORT, all routes under /api)
  pharmacy/       — React + Vite frontend
lib/
  api-client-react/  — Orval-generated React Query hooks (DO NOT edit generated files)
  api-spec/          — OpenAPI spec (openapi.yaml) + codegen config
  api-zod/           — Zod schemas generated from API spec
  db/                — Drizzle ORM schema + db client exported as { db, pool }
```

## Critical Notes

- **API base URL**: The generated hooks already include `/api` in all URL paths (from the OpenAPI server URL). Do NOT call `setBaseUrl("/api")` — that would double the prefix. Do NOT add any proxy in vite.config.ts.
- **Auth token**: `setAuthTokenGetter` from `@workspace/api-client-react` is called in auth-context.tsx to attach JWT to all requests.
- **API server db**: Uses `export { db } from "@workspace/db"` (not pg directly) to avoid esbuild native module issues.

## Seeded Data

- 87 medicines across 5+ categories and 10+ companies
- 40 stock batches with expiry dates
- Admin user: `admin` / `admin123`
- Pharmacist user: `pharmacist` / `pharma123`

## Frontend Pages (all complete)

- `/` — Dashboard (KPI cards, sales chart, expiry/low-stock alerts)
- `/pos` — POS / Billing (medicine search, cart, invoice, FEFO batch selection)
- `/sale-returns` — Sale returns list + create return
- `/missed-sales` — Missed sales log
- `/deliveries` — Home delivery management
- `/purchases` — GRN / Purchase with mandatory batch + expiry entry
- `/purchase-returns` — Purchase returns
- `/sale-po` — Sale-based PO generation
- `/medicines` — Medicine master with batches, stock adjustment
- `/stock-audit` — Stock audit (physical vs system count)
- `/expiry-alerts` — Expiry alerts with configurable days ahead
- `/suppliers` — Supplier CRUD + ledger + payment recording
- `/customers` — Customer CRUD + ledger + payment receiving
- `/reports/sales` — Sales report with date range + grouping
- `/reports/stock` — Stock report with category/company filters
- `/reports/purchases` — Purchase report with supplier filter
- `/reports/expiry` — Expiry report
- `/reports/controlled` — Controlled drugs report
- `/reports/profit-loss` — P&L report with chart
- `/settings` — General settings (pharmacy info, NTN, tax %)
- `/settings/users` — User management (CRUD + roles)
- `/settings/masters` — Master data (Categories, Companies, Units, Racks, Generic Names)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
