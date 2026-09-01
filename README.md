# Plasti Matic — Internal Dashboard & E-commerce Platform

Full-stack platform built for **EURL Plasti Matic** (Bordj Bou Arreridj, Algeria — manufacturer of
professional workwear, safety equipment and industrial safety shoes), covering the M1 MIAGE
internship brief: a front-end platform with a stock/production **dashboard** (KPIs, advanced KPIs,
data visualization) plus a public **e-commerce storefront**, both backed by a shared NestJS API.

## Stack

- **Backend**: NestJS · Prisma · PostgreSQL · JWT auth (roles: `ADMIN`, `STAFF`, `CUSTOMER`) · Zod validation (`nestjs-zod`) · Swagger
- **Frontends** (`dashboard` = internal staff app, `shop` = public storefront): React · TypeScript · Vite · TanStack Query · shadcn/ui · Tailwind · Recharts
- **Shared**: `packages/shared` — hand-written Zod schemas are the single source of truth for types & validation, consumed by the API (as DTOs) and both frontends (as TS types + form validation)
- **Monorepo**: npm workspaces

## Repository layout

```
apps/
  api/         NestJS backend (REST API, /api/docs for Swagger)
  dashboard/   Internal staff dashboard — KPIs, catalog/inventory/production/orders admin
  shop/        Public storefront — catalog browsing, cart, checkout, order history
packages/
  shared/      Zod schemas + shared formatting utils, built to CJS (Node) + ESM (bundlers)
```

Each feature (`auth`, `catalog`, `inventory`, `production`, `cart`, `orders`, `analytics`) is a
self-contained NestJS module on the backend, and a `features/<name>/{api,pages,components}` folder
on each frontend.

## Prerequisites

- Node.js 20+
- Docker (for PostgreSQL) — or point `DATABASE_URL` at your own Postgres instance

## Setup

```bash
# 1. Install all workspace dependencies
npm install

# 2. Start Postgres (maps to host port 5433 to avoid clashing with a local Postgres on 5432)
npm run db:up

# 3. Configure environment
cp apps/api/.env.example apps/api/.env
cp apps/dashboard/.env.example apps/dashboard/.env
cp apps/shop/.env.example apps/shop/.env

# 4. Build the shared package (both frontends and the API import it)
npm run build:shared

# 5. Run migrations and seed realistic demo data
cd apps/api && npx prisma migrate dev --name init && cd ../..
npm run prisma:seed

# 6. Run everything (in separate terminals)
npm run dev:api          # http://localhost:3001/api  (docs at /api/docs)
npm run dev:dashboard    # http://localhost:5173
npm run dev:shop         # http://localhost:5174
```

### Demo credentials (created by the seed script)

| Role  | Email                     | Password      | Use it on   |
|-------|---------------------------|---------------|-------------|
| Admin | admin@plastimatic.dz      | password123   | `dashboard` |
| Staff | staff@plastimatic.dz      | password123   | `dashboard` |
| Customer | client1@example.com … client6@example.com | password123 | `shop` |

The shop also supports self-registration and guest checkout (no account needed).

## Data model highlights

- **`ProductVariant`** carries both `price` and `costPrice` — stock valuation and margin-based KPIs
  are computed on cost, not sale price.
- **`StockMovement`** is an append-only ledger (`IN` / `OUT` / `ADJUSTMENT`). It's the only source of
  truth used to reconstruct point-in-time inventory value for the turnover KPI — every place stock
  changes (production completion, order checkout, manual adjustment, initial product creation)
  writes a movement in the same transaction as the quantity change.
- **`ProductionBatch`** completion automatically pushes `producedQty` into stock as an `IN` movement —
  this is the link between manufacturing tracking and inventory the internship brief asks for.
- **`Order.confirmedAt/shippedAt/deliveredAt`** timestamps back the fulfillment-time KPI.
- Checkout uses a **real Stripe integration** (test mode) — `POST /orders/checkout` creates a
  `PENDING`/unpaid `Order`, starts a Stripe Checkout Session for it, and redirects the browser to
  Stripe's hosted payment page. Stock is deliberately **not** touched at this point. Only once
  Stripe actually confirms the charge — via a `checkout.session.completed` webhook — does
  `OrdersService.confirmPayment()` decrement stock, write the `StockMovement`, and flip
  `paymentStatus` to `PAID`; an abandoned/expired session (`checkout.session.expired`) sets it to
  `FAILED` instead, having never touched stock. The webhook handler is idempotent (Stripe
  redelivers at-least-once) — gated on the order still being `PENDING`, a repeat delivery is a
  no-op. See `apps/api/src/orders/stripe.service.ts` and `orders.service.ts`.
  - **Local setup**: get test-mode keys from `dashboard.stripe.com/test/apikeys`, set
    `STRIPE_SECRET_KEY` in `apps/api/.env`. For the webhook, either run
    `stripe listen --forward-to localhost:3001/api/orders/webhook/stripe` (prints a `whsec_...`
    value to put in `STRIPE_WEBHOOK_SECRET`), or configure a webhook endpoint in the Stripe
    dashboard pointing at that URL. Test a full payment with card `4242 4242 4242 4242`, any
    future expiry, any CVC.
  - **Known simplification**: an abandoned Stripe session leaves its `Order` permanently
    `PENDING`/un-paid — there's no cleanup job (same spirit as the "no cart-expiry cron"
    simplification below).
- **Deleting a product is blocked once it has any stock/order/production history** (a clean 400, not
  a raw foreign-key error) — history-bearing products must be deactivated (`isActive: false`,
  already wired to the "Désactiver" action) instead of deleted, so the audit trail (stock ledger,
  past orders, production batches) is never silently orphaned.

## How Catalogue, Stock and Production relate

These three dashboard sections look independent but share one join key — **`ProductVariant.id`**
(a SKU: one size/color combination of a product) — and one shared number — **`ProductVariant.quantity`**,
the live stock balance for that SKU. Nothing in Production or Orders keeps its own copy of "how much is
in stock"; they all read and write that single field.

Catalogue defines the SKU (`ProductVariant`); Production, Orders and the Stock page are the three
things allowed to change its stock — and each one does so by writing to the same two places at once:

```
Catalogue
  Product ──< ProductVariant >── variantId FK ──┬── ProductionBatch   (Production)
              sku, size, color,                 ├── OrderItem         (Orders)
              price, costPrice,                 └── StockMovement     (Stock — manual entries)
              quantity, lowStockThreshold

  batch COMPLETED  ───► +producedQty  ─┐
  order checked out ──► −quantity     ─┼──►  ProductVariant.quantity  (always kept in step with)
  manual movement   ──► ±quantity     ─┘             │
                                                      └──►  a new StockMovement row (IN/OUT/ADJUSTMENT)
```

Every arrow into `quantity` on the right is transactional with a `StockMovement` insert — there is no
code path that updates one without the other.

- **Catalogue owns the SKU.** `Product` → `ProductVariant` is where size, color, price, `costPrice`
  and `lowStockThreshold` live. A `ProductVariant` is the thing every other module points at via a
  `variantId` foreign key — Production, Stock movements, cart items and order items all reference it,
  never the parent `Product`.
- **Production is one way stock goes *up*.** A `ProductionBatch` is a manufacturing run for exactly
  one `ProductVariant` (`plannedQty` vs. `producedQty`/`defectQty` is the yield/defect-rate KPI pair).
  It does **not** touch stock while it's `PLANNED`/`IN_PROGRESS` — only the transition to `COMPLETED`
  does anything, and when it does, one transaction ([`production.service.ts`](apps/api/src/production/production.service.ts))
  both adds `producedQty` to `ProductVariant.quantity` and writes an `IN` `StockMovement` referencing
  the batch number. Editing `producedQty` later or re-completing a batch doesn't double-apply this —
  it only fires on the `false → true` edge of "is this batch completed."
- **Orders are the other way stock goes *down*.** Checkout decrements each line item's
  `ProductVariant.quantity` and writes an `OUT` `StockMovement` in the same transaction as the order
  itself ([`orders.service.ts`](apps/api/src/orders/orders.service.ts)) — a customer buying a product is,
  from stock's point of view, exactly the same kind of event as a batch finishing.
- **Stock (the "Nouveau mouvement" form) is the manual/audit layer**, for everything that isn't a
  batch or an order: a supplier delivery not tied to a formal production run, breakage/loss, or a
  physical recount correction. It's the same `recordMovement` path
  ([`inventory.service.ts`](apps/api/src/inventory/inventory.service.ts)) production-completion and
  checkout use internally — `quantity` and the `StockMovement` ledger change together, atomically,
  no matter which of the three triggers it.
- **Why this matters for the KPIs**: because *every* quantity change is required to also write a
  ledger row, `StockMovement` is a complete, replayable history of stock over time — that's what the
  advanced turnover / days-inventory-outstanding KPIs reconstruct point-in-time inventory value from,
  and it's also why `ProductVariant.quantity` is never directly editable from a Catalogue edit form
  (see below).

## User accounts: blocking & soft delete

Admins manage customer accounts from the dashboard's **Utilisateurs** page (admin-only — hidden from
the nav and route-guarded for `STAFF`, and enforced server-side regardless):

- **Bloquer**: sets `status = BLOCKED`. The account cannot log in (clear "contact the administrator"
  message), and if it's already logged in somewhere, its *next* request anywhere — dashboard or shop
  — is rejected the same way, logging it out immediately. This works because the JWT strategy
  re-checks the user's status from the DB on every authenticated request, not just at login.
- **Supprimer**: sets `status = DELETED` — a **soft** delete, not a row removal. A hard delete would
  nullify `userId` on that customer's past orders, breaking the "who placed this order" traceability
  shown in Commandes. A deleted account can't log in (generic "invalid credentials," so it doesn't
  reveal the account ever existed) and is logged out immediately if it had an active session.
- An admin can't block or delete their own account (guarded server-side).
- The shop's `AuthProvider` listens for a 401/403 on any request made *with* a token and treats it as
  "your session just got invalidated": clears the token, shows the server's message, and returns to a
  logged-out state. A 401/403 on a token-less request (e.g. a wrong-password login attempt) does not
  trigger this — that's just a normal failed login, already handled by the login form itself.

## Detail & edit modals

Catalogue, Stock, Production and Commandes each have a **Voir** (read-only detail) and, where
editing makes sense, a **Modifier** action — both are modals, not separate pages:

- **Catalogue**: detail shows all variants + images; edit covers product fields and per-variant
  price/cost/threshold/sku/size/color (never `quantity` — see below), plus adding new variants.
- **Stock**: clicking a row opens its full movement history and an inline low-stock-threshold editor.
- **Production**: detail shows computed yield/defect rates; editing (producedQty/defectQty/status)
  was already in place and is unchanged.
- **Commandes**: detail shows the customer (or guest email), shipping address, and line items with
  product names — the status editor from the table is also available inside the modal.

Variant `quantity` is never directly editable from any edit form — it only ever changes through a
`StockMovement` (via the Stock page's "Nouveau mouvement", or automatically on checkout/production
completion), so the audit ledger and the live balance can never drift apart.

## Product images

Staff upload real image files from the dashboard's "Nouveau produit" form (`POST
/api/uploads/image`, multipart, JPG/PNG/WEBP/GIF, 5MB max, `ADMIN`/`STAFF` only). Files are stored on
local disk (`apps/api/uploads/`, gitignored) and served statically at
`{PUBLIC_API_URL}/uploads/<file>` — the URL is what actually gets saved on `Product.images`, not the
file itself. For a production deployment beyond this demo, swap the disk storage for S3/Cloudinary
(only `uploads.controller.ts`'s `diskStorage` config would need to change).

## KPIs implemented (`/analytics/*`)

**Basic**: total stock value, total units in stock, low-stock count, orders & revenue in period,
average order value, product/SKU counts, production output in period, order-status breakdown,
stock value by category, revenue trend.

**Advanced**: stock turnover ratio & days-inventory-outstanding (reconstructed from the stock
ledger), ABC analysis (cumulative-revenue classification via a SQL window function), production
yield & defect rate per batch, a stockout-risk heuristic (current stock ÷ trailing 30-day sales
velocity — explicitly labeled a heuristic, not a forecast), a 7-day moving-average sales trend
(labeled "trend," not "forecast" — no statistical forecasting is implemented), top/bottom products,
fulfillment time.

Basic KPIs use Prisma's `aggregate`/`groupBy`; advanced KPIs that need window functions or
multi-step ratios use parameterized `$queryRaw` in `AnalyticsService` — see
[`analytics.service.ts`](apps/api/src/analytics/analytics.service.ts).

## Known simplifications (intentional, MVP-scoped)

- Single warehouse/location (no multi-location stock).
- No coupons/discounts, product reviews, or wishlists.
- Real Stripe payment (test mode) — no cleanup job for abandoned/unpaid Checkout Sessions (see above).
- No password-reset flow.
- Frontend chunk sizes aren't code-split (fine at this app's size; would matter at a larger scale).
- Delete confirmations use `window.confirm` rather than a custom dialog, for time's sake.

## Verification performed

- `npm run build` succeeds across `packages/shared`, `apps/api`, `apps/dashboard`, `apps/shop`.
- `prisma migrate dev` + seed run cleanly against the Dockerized Postgres.
- Manually exercised: admin login → `/auth/me`; full guest flow (add to cart via session cookie →
  checkout → stock decremented + order created); every `/analytics/*` endpoint returns sane numbers
  against seeded data.
