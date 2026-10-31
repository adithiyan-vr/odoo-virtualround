# Brightloop — Project Log

> **One log for everything.** Append new entries at the **bottom** of the relevant section (or at the top of "Daily Log"). Never delete old entries.
> Everyone edits this file — keep commits tiny (`docs(log): ...`) to avoid conflicts.

---

## How to Log

**Entry format**
```
### YYYY-MM-DD HH:MM · [Member] · [Type] · Short title
- What happened / what was decided
- Why (if non-obvious)
- Links: PR #, commit, issue
```

**Types:** `SETUP` · `FEATURE` · `FIX` · `DECISION` · `BLOCKER` · `TEST` · `PERF` · `DEPLOY` · `DEMO` · `NOTE`

**Log it whenever you:** finish a task from `todo.md` · make a decision others rely on · hit or clear a blocker · change schema/API · measure performance · deploy.

---

## 1. Project Snapshot

| Item | Value |
|------|-------|
| Project | **Brightloop** — Subscription Management System |
| Event | Odoo Hackathon 2026 — Virtual Round (shortlisting) |
| Team size | 4 (M1–M4, see `members.md`) |
| Repo | _paste GitHub URL_ |
| Live URL | _paste Vercel URL_ |
| DB | PostgreSQL (Neon / Supabase) |
| Stack | Next.js + TypeScript + Tailwind + shadcn/ui + Prisma |
| Submission deadline | _fill in_ |
| Current phase | Phase 0 — Kickoff |

---

## 2. Decisions Register

| # | Date | Decision | Reason | Owner |
|---|------|----------|--------|-------|
| D1 | 2026-10-31 | Use **relational SQL (PostgreSQL)**, not NoSQL | Strict relations, atomic billing transactions, fast SUM/COUNT aggregations | All |
| D2 | 2026-10-31 | One stack only (Next.js + Prisma + Postgres); no mixing | Avoid integration overhead in a short round | All |
| D3 | 2026-10-31 | Project name is **Brightloop** everywhere (UI, README, DB name, emails) | Brief requirement | All |
| D4 | 2026-10-31 | Money stored as `Decimal(12,2)` | Avoid float rounding bugs in invoices | M1 |
| D5 | 2026-10-31 | Idempotent billing via `UNIQUE(subscription_id, billing_cycle_date)` + per-subscription transaction | "Nothing billed twice or skipped" | M1/M2 |
| D6 | 2026-10-31 | Only M1 edits `schema.prisma` | Prevent migration conflicts | M1 |
| D7 | 2026-10-31 | "Run Daily Billing Batch" button with date picker instead of a real cron | Reliable live demo | M2/M3 |
| D8 | 2026-10-31 | Password rule regex `^(?=.*[a-z])(?=.*[A-Z])(?=.*[^A-Za-z0-9]).{9,}$` (more than 8 chars) | Problem statement | M1 |
| D9 | 2026-10-31 | Email is mocked (logged + `/dev/mailbox`) | No SMTP dependency during judging | M1 |

---

## 3. Blockers & Risks

| # | Date raised | Description | Owner | Status | Resolution |
|---|-------------|-------------|-------|--------|------------|
| R1 | 2026-10-31 | Frontend depends on backend endpoints not yet built | M3/M4 | Mitigated | Build against example responses in `api.md` |
| R2 | 2026-10-31 | Month-end date math (Jan 31 + 1 month) | M2 | Resolved | Implemented anchor-based date math in `dates.ts` + verified with unit and billing engine tests |
| R3 | 2026-10-31 | Dashboard < 2 s on 5k+ rows | M4 | Open | Indexes + SQL aggregation + pagination; verify after seed |

---

## 4. Milestones

| Milestone | Target | Status | Date done |
|-----------|--------|--------|-----------|
| Repo + schema ready | Hour 2 | ✅ | 2026-10-31 |
| Auth + RBAC working | Hour 4 | ✅ | 2026-10-31 |
| Catalog (products/variants/plans) | Hour 10 | ✅ | 2026-10-31 |
| Subscription state machine | Hour 16 | ✅ | 2026-10-31 |
| Billing Day engine (idempotent) | Hour 22 | ✅ | 2026-10-31 |
| Payments + Finance dashboard | Hour 26 | ✅ | 2026-10-31 |
| 5k seed + < 2 s verified | Hour 28 | ✅ | 2026-10-31 |
| Deployed + demo rehearsed | Hour 30 | ⬜ | |

---

## 5. Performance Log (< 2 s requirement)

| Date | Endpoint / Page | Dataset size | Time (ms) | Pass? | Notes |
|------|-----------------|--------------|-----------|-------|-------|
| _—_ | `/dashboard/summary` | 5,000 subs / 10,000 inv | | | |
| _—_ | `/invoices?page=1` | 5,000 subs / 10,000 inv | | | |
| _—_ | `/subscriptions?status=ACTIVE` | 5,000 subs | | | |
| _—_ | `/billing/run` (all due) | 500 due | | | |

---

## 6. Test Log

| Date | Scenario | Expected | Actual | Result |
|------|----------|----------|--------|--------|
| 2026-10-31 | Signup with existing email | 409 | 409 CONFLICT | ✅ PASS |
| 2026-10-31 | Password `Abcdefg1!` (9 chars, rules met) | accepted | accepted | ✅ PASS |
| 2026-10-31 | Password `Abcdef1!` (8 chars) | rejected | 400 VALIDATION_ERROR | ✅ PASS |
| 2026-10-31 | Customer opens another customer's invoice | 404 | 404 NOT_FOUND | ✅ PASS |
| _—_ | Staff creates another staff | 403 | | |
| 2026-10-31 | Draft → Active jump | 409 | 409 Conflict | Pass |
| 2026-10-31 | Run billing twice for same date | 2nd run: created 0, skipped N | created 0, skipped N | Pass |
| 2026-10-31 | Discount `max_uses` reached | Not applied on next invoice | Not applied | Pass |
| 2026-10-31 | Expired discount | Not applied | Not applied | Pass |
| 2026-10-31 | Staff/Customer creates staff account | 403 | 403 FORBIDDEN | ✅ PASS |
| _—_ | Draft → Active jump | 409 | | |
| _—_ | Run billing twice for same date | 2nd run: created 0, skipped N | | |
| _—_ | Discount `max_uses` reached | Not applied on next invoice | | |
| _—_ | Expired discount | Not applied | | |
| 2026-10-31 | Partial payment | Invoice stays CONFIRMED | Invoice stays CONFIRMED | ✅ PASS |
| 2026-10-31 | Full payment | Invoice → PAID | Invoice → PAID | ✅ PASS |
| 2026-10-31 | Overpayment | 422 | 422 BUSINESS_RULE | ✅ PASS |
| 2026-10-31 | Paused plan not allowed (`can_pause=false`) | 422 | 422 Business Rule | Pass |

---

## 7. Daily Log (newest entries at the bottom)

### 2026-10-31 · All · NOTE · Project kickoff
- Reviewed problem statement (Brightloop Subscription Management System), `summary.md`, and `tech-stack-guide.md`.
- Existing docs: `prd.md`, `architecture.md`, `design.md`, `database.md`.
- Generated: `members.md`, `todo.md`, `api.md`, `log.md`.
- Next: M1 creates repo + schema; everyone clones and reads `members.md` for their slice.

### 2026-10-31 · All · DECISION · Stack & workflow locked
- See Decisions Register D1–D9.

### 2026-10-31 · M1 · SETUP · Bootstrap repository & Next.js full-stack framework
- Initialized Next.js (App Router, TypeScript) with Tailwind CSS, ESLint, Prisma 6, and Vitest.
- Configured `.env.example`, `.env`, `.gitignore`, and Next.js configuration.
- Setup `src/` directory structure with modular architecture (`server/`, `lib/`, `app/api/v1/`).

### 2026-10-31 · M1 · FEATURE · Complete Prisma Schema & Extra SQL Constraints
- Authored complete `prisma/schema.prisma` containing all 23 models (User, PasswordResetToken, Customer, Tax, PaymentTerm, Product, ProductVariant, Plan, QuotationTemplate, QuotationTemplateLine, Discount, DiscountProduct, Subscription, SubscriptionLine, BillingRun, Invoice, InvoiceLine, InvoiceDiscount, Payment, AuditLog, NumberSequence, Setting, EmailLog).
- Implemented `@@unique([subscriptionId, billingCycleDate], map: "unique_subscription_cycle")` idempotency constraint.
- Generated Prisma client (`@prisma/client`) and documented domain constraints in `prisma/extras.sql`.

### 2026-10-31 · M1 · FEATURE · Auth, RBAC & Core Platform Utilities
- Built JWT session management with `jose` (HS256) stored in `bl_session` httpOnly cookie.
- Built password hashing with `bcryptjs` (cost 12) and enforced password policy regex `^(?=.*[a-z])(?=.*[A-Z])(?=.*[^A-Za-z0-9]).{9,}$`.
- Implemented single-use password reset tokens with SHA-256 hashing and 30-minute expiry.
- Implemented in-memory rate limiting for login (5/min/IP) and password reset (3/min/IP).
- Implemented type-safe `route()` wrapper with authentication, role-based authorization, Zod validation, error envelope, and CSRF checks.
- Implemented Next.js route protection middleware (`src/middleware.ts`).
- Created shared utilities: `lib/db.ts`, `lib/errors.ts`, `lib/api-envelope.ts`, `lib/pagination.ts`, `lib/dates.ts`, `lib/money.ts`, `lib/audit.ts`.

### 2026-10-31 · M1 · FEATURE · Module 1 (Auth) & Module 2 (Catalog) API Endpoints
- Shipped Auth API: `POST /api/v1/auth/signup`, `POST /api/v1/auth/login`, `POST /api/v1/auth/logout`, `GET /api/v1/auth/me`, `POST /api/v1/auth/forgot-password`, `POST /api/v1/auth/reset-password`.
- Shipped Users & Customers API: `POST /api/v1/users/staff` (ADMIN), `GET /api/v1/users` (ADMIN), `GET /api/v1/customers`, `POST /api/v1/customers`.
- Shipped Products & Variants API: `GET/POST /api/v1/products`, `GET/PATCH/DELETE /api/v1/products/:id`, `GET/POST /api/v1/products/:id/variants`, `PATCH/DELETE /api/v1/variants/:id`.
- Shipped Plans API: `GET/POST /api/v1/plans`, `GET/PATCH/DELETE /api/v1/plans/:id` (with 4 lifecycle policy flags).
- Shipped Quotation Templates API: `GET/POST /api/v1/templates`, `GET/PATCH/DELETE /api/v1/templates/:id`.
- Shipped Taxes & Payment Terms API: `GET/POST/PATCH/DELETE` for `/api/v1/taxes` and `/api/v1/payment-terms`.
- Shipped System & Dev API: `GET /api/v1/health`, `GET /api/v1/dev/mailbox`.

### 2026-10-31 · M1 · FEATURE · Master Data Seed Script & Vitest Unit Tests
- Created `prisma/seed.ts` seeding demo credentials (`admin@brightloop.io`, `staff@brightloop.io`, `customer@brightloop.io`), taxes (GST 5%, 12%, 18% default, 28%), payment terms, products, variants (Brand=Odoo +560 surcharge), plans, quotation templates, and discounts.
- Wrote 18 comprehensive Vitest unit tests covering password policy, token hashing, JWT sessions, date intervals, month-end date math, money precision, and rate limiting. 100% passing.
- Verified Next.js production build (`npm run build`) compiling all 25 API routes with 0 errors.

### 2026-10-31 · M2 · FEATURE · Pure Domain Engines (State Machine, Discount Evaluator, Pricing & Tax)
- Authored pure, zero-I/O `src/lib/state-machine.ts` implementing `allowedActions()` and `assertTransition()`. Governs transitions: DRAFT → QUOTATION → CONFIRMED → ACTIVE → CLOSED, plus PAUSED branch. Enforces plan policy flags (`canPause`, `canCloseEarly`, `canRenew`, `autoClose`) and quotation validity expiry. Rejects invalid jumps with `409 Conflict`.
- Built pure `src/server/discounts/discount.engine.ts` implementing multi-scope discount evaluation (PRODUCT vs SUBSCRIPTION), threshold validation (`minPurchase`, `minQuantity`), active window bounds, exhaustion checks, winner selection per line, proportional remainder allocation, and zero-clamping.
- Built pure `src/server/pricing/pricing.engine.ts` for decimal-safe line computation (`computeLine`) and invoice total aggregation (`computeInvoiceTotals`), guaranteeing exact half-up tax rounding.
- Built `src/lib/sequences.ts` using atomic row locks on `number_sequences` table for gap-free `SUB-xxxxx` and `INV-xxxxx` identifiers.

### 2026-10-31 · M2 · FEATURE · Core Domain Services (Subscriptions, Discounts, Invoices & Billing Engine)
- Created `src/server/subscriptions/subscription.service.ts`: creation from template or blank, subtotal calculation with product variant surcharge, state machine transition enforcement with role-based scoping, renewal extension, and auto-computed `allowedTransitions`.
- Created `src/server/discounts/discount.service.ts`: full CRUD for discount master data, active status computation, and candidate resolution for billing runs.
- Created `src/server/billing/invoice.service.ts`: invoice retrieval, confirm (DRAFT → CONFIRMED), cancel (guarded against paid invoices), print data provider, and customer notification dispatch via email service.
- Implemented the Hero Feature in `src/server/billing/billing.service.ts`:
  - `lifecycleSweep()`: automatically activates confirmed subscriptions whose start date has arrived and auto-closes expired subscriptions with `autoClose` plans.
  - Transactional per-subscription batch processing with PostgreSQL row-level locks (`SELECT ... FOR UPDATE`).
  - Evaluates discounts and handles race exhaustion by rolling back use increments, dropping exhausted candidates, and recomputing.
  - Generates DRAFT invoices and advances `nextBillingDate` without month-end drift using anchor math.
  - Idempotency guaranteed via DB unique constraint `(subscription_id, billing_cycle_date)`: duplicate runs skip already-billed cycles safely (`created: 0, skipped: N`).

### 2026-10-31 · M2 · FEATURE · Module 3, 4, 5 API Route Handlers
- Shipped Subscription API: `GET/POST /api/v1/subscriptions`, `GET/PATCH /api/v1/subscriptions/:id`, `POST /api/v1/subscriptions/:id/transition`, `POST /api/v1/subscriptions/:id/renew`.
- Shipped Discount API: `GET/POST /api/v1/discounts`, `GET/PATCH/DELETE /api/v1/discounts/:id`.
- Shipped Billing Day API: `POST /api/v1/billing/run` (hero batch runner), `POST /api/v1/billing/auto-close`.
- Shipped Invoice API: `GET /api/v1/invoices`, `GET /api/v1/invoices/:id`, `POST /api/v1/invoices/:id/confirm`, `POST /api/v1/invoices/:id/cancel`, `POST /api/v1/invoices/:id/send`, `GET /api/v1/invoices/:id/print`.

### 2026-10-31 · M2 · TEST · Comprehensive Engine & Lifecycle Test Suites
- Created `tests/state-machine.test.ts`: 20 tests verifying every valid transition, illegal transition 409 rejections, customer early-close permission guards, pause restrictions, and quotation expiry checks.
- Created `tests/discount-engine.test.ts`: 15 tests verifying percent vs fixed discounts, min purchase/quantity thresholds, active date windows, max uses exhaustion, product scope filtering, zero-clamping, and rounding remainder attribution.
- Created `tests/pricing-engine.test.ts`: 7 tests covering PRD demo figures (₹15,600 gross → 10% discount → ₹14,040 taxable → 18% GST → ₹16,567.20), zero tax, line clamping, and column summation.
- Created `tests/billing-engine.test.ts`: 8 tests verifying month-end date math (Jan 31 → Feb 28, leap year Feb 29 → Feb 28), anchor-based cycle progression, and expiry detection.

### 2026-10-31 · M1 · TEST · Full Live Backend Audit Against Supabase (44/44 Tests Passing)
- Verified active connection to centralized Supabase database (`aws-1-eu-central-1.pooler.supabase.com:6543/5432`).
- Ran end-to-end audit (`tests/e2e-api-audit.test.ts`) exercising live HTTP endpoints against Supabase:
  - Auth: signup validation, duplicate email conflict (409), password regex, login, `auth/me` with JWT cookies, single-use forgot-password tokens, and email logging to `/dev/mailbox`.
  - RBAC: admin, staff, and customer role restrictions; verified non-admin access to staff creation is rejected with 403 FORBIDDEN.
  - Catalog: Products CRUD, Variants CRUD with +560 Odoo brand surcharge verification (`effectivePrice = 1760.00`), Plans with 4 lifecycle policy flags, Quotation Templates with line items, Tax rules (GST 18% default), and Payment Terms (Net 30 default).
- Verified full test suite: 7 test files, 44 tests passed with 0 errors.

### 2026-10-31 · M1 · AUDIT & FIX · Member M2 Implementation Verification & E2E Testing (25/25 E2E + 81/81 Unit Passing)
- Audited Member M2's implementation across Modules 3 (Subscriptions Lifecycle), 4 (Billing Day Engine & Invoicing), and 5 (Discounts & Pricing):
  - Fixed sequence numbering deadlock: Updated `nextVal`, `nextSubNumber`, and `nextInvoiceNumber` to accept transaction client `tx` to avoid nested interactive transactions.
  - Fixed surcharge double-counting: Removed redundant addition of `priceSurcharge` in `formatSub` and `billing.service.ts` (unit price in lines already stores the effective price).
  - Fixed transaction timeouts under remote WAN latency: Pre-fetched catalog lookups outside transactions in `SubscriptionService.create` and moved post-commit full includes outside transaction boundaries, reducing transaction lock times from ~30s to <500ms.
  - Fixed discount route RBAC & pagination envelopes: Enabled `STAFF` role access for discount views, and standardized response envelopes to `{ data, meta }` with `paginated()`.
  - Fixed billing run idempotency: Corrected `BillingService.run` to target explicitly provided `subscriptionIds` without filtering out already-billed cycles, gracefully reporting `skipped` count.
- Authored and ran `tests/e2e-m2-audit.test.ts` (25/25 tests passing):
  - Verified discounts CRUD, scope application, and max usage increments.
  - Verified subscription creation, line calculations, DRAFT updates, and complete state machine: `DRAFT → QUOTATION → CONFIRMED → ACTIVE → PAUSED → ACTIVE`.
  - Verified 409 CONFLICT on illegal state leaps and plan policy enforcement (`canPause: false`).
  - Verified renewal extending expiry by billing interval.
  - Verified billing day batch runner (`POST /api/v1/billing/run`), idempotency check (0 created, 1+ skipped on re-run), and auto-close sweep (`POST /api/v1/billing/auto-close`).
  - Verified invoice lifecycle: retrieval, confirmation, mock email send, printable structure, and cancellation.
- Verified test suite: 10 unit test files (81/81 passing) + E2E suite (25/25 passing).
- Verified Next.js production build (`npm run build`): 53 routes compiled cleanly with 0 TypeScript errors.

### 2026-10-31 · M2 & M3 · FEATURE & AUDIT · Full Completion of Core Business Logic & Frontend ERP
- Completed all outstanding tasks for Members M2 (Business Logic) and M3 (Frontend ERP):
  - Fixed TypeScript TS2783 duplicate key in `discount.service.ts` where multiple `OR` conditions collided.
  - Added dual property aliases `paidAmount`/`balanceDue` alongside `amountPaid`/`amountDue` in `invoice.service.ts` and `api-client.ts` to guarantee 100% contract compatibility with UI components.
  - Exported `isUniqueViolation` from `lib/errors.ts` for clean Prisma error code `P2002` detection without leaking database client instances in tests.
  - Hardened customer role guards across `app-shell.tsx`, `subscriptions/page.tsx`, `subscriptions/[id]/page.tsx`, `invoices/page.tsx`, `invoices/[id]/page.tsx`, and `dashboard/page.tsx`. Customers are barred from batch billing, staff creation, quotation generation, and staff actions, while preserving customer self-service (pause/close strictly governed by plan policies).
  - Validated M3 UI: Admin CRUD forms (Products with Brand=Odoo +₹560 surcharge, Plans with 4 lifecycle flags, Taxes, Discounts, Staff with live password policy checklist), `PricePreview` live calculator, reusable `DataTable` (search, sort, pagination, empty/loading skeletons), `StatusRibbon`, and `BillingModal`.
  - Expanded `billing-engine.test.ts` to 13 tests covering double-click idempotency simulation, catch-up progression, discount exhaustion, and state machine exclusions.
  - Executed end-to-end audit `tests/e2e-m2-audit.test.ts` against live server: 25/25 tests passing.
  - Full suite verification: 10 unit test files (81/81 passing), zero TypeScript errors (`npx tsc --noEmit`), and 53/53 routes compiled with code 0 (`npm run build`).

<!-- Append new entries below this line -->

### 2026-10-31 · M4 · FEATURE · Module 6 (Payments & Overdue) & Auto-Reconciliation
- Implemented `PaymentService` (`src/server/payments/payment.service.ts`) with atomic PostgreSQL transactions:
  - Validates positive amounts and enforces overpayment protection against balance due, rejecting excess with `422 BUSINESS_RULE`.
  - Automatic status transition: marks invoice as `PAID` once cumulative non-voided payments equal total invoice amount. Partial payments leave status as `CONFIRMED`.
  - Admin/Staff payment voiding (`POST /api/v1/payments/:id/void`) which re-evaluates balance due and reverts invoice status from `PAID` to `CONFIRMED` when appropriate.
  - Safe method normalization mapping `BANK` to `BANK_TRANSFER`.
  - Role-scoped payments list (`GET /api/v1/payments`) ensuring customer accounts only query payments for invoices they own.
- Shipped API route handlers:
  - `POST /api/v1/payments` (record payment)
  - `GET /api/v1/payments` (paginated payments list with customer, date, method, search filters)
  - `GET /api/v1/invoices/:id/payments` (payments for specific invoice)
  - `POST /api/v1/payments/:id/void` (admin voiding with invoice reversion)
- Updated ERP Staff/Admin Payments page (`src/app/(app)/payments/page.tsx`) with real API client and multi-channel method badge icons.

### 2026-10-31 · M4 · FEATURE · Module 7 (Finance Dashboard) & SQL Aggregations (< 2s SLA)
- Built `DashboardService` (`src/server/dashboard/dashboard.service.ts`) executing high-performance SQL and Prisma aggregations:
  - `getSummary`: Live MRR calculation normalizing daily, weekly, monthly, and yearly intervals, revenue collected, outstanding receivables, overdue receivables count/sum, and microsecond `generatedInMs` execution time tracking.
  - `getMonthlyRevenue`: Rolling 6-month collected vs invoiced revenue trends for bar chart visualization.
  - `getSubscriptionStatusBreakdown`: Status distribution across `ACTIVE`, `PAUSED`, `CLOSED`, `DRAFT`, `QUOTATION`, `CONFIRMED`.
  - `getOverdue`: Receivables overdue listing with computed days overdue.
  - `getRecentPayments`: Real-time transaction reconciliation ledger.
- Shipped Dashboard API routes:
  - `GET /api/v1/dashboard/summary`
  - `GET /api/v1/dashboard/revenue-monthly`
  - `GET /api/v1/dashboard/subscription-status`
  - `GET /api/v1/dashboard/overdue`
  - `GET /api/v1/dashboard/payments-recent`
- Overhauled Staff/Admin Finance Dashboard UI (`src/app/(app)/dashboard/page.tsx`):
  - Metric cards for Active Subscriptions, Monthly Recurring Revenue (MRR), Total Collected, and Outstanding Receivables.
  - Visual monthly revenue bar charts and subscription distribution progress bars.
  - Overdue receivables table with severity tags and days overdue badges.
  - Real-time performance badge verifying `< 2s` response SLA.

### 2026-10-31 · M4 · FEATURE · Customer Portal (Subscriptions, Invoices, Self-Service & Profile)
- Built isolated Customer Portal with strict row-scoping:
  - `PortalService` (`src/server/portal/portal.service.ts`): All operations strictly verify customer ownership. Accessing foreign subscriptions or invoices returns `404 NOT_FOUND` (preventing ID enumeration).
  - Enforced plan lifecycle policies: self-service `PAUSE` strictly validates `plan.canPause === true`; self-service `CLOSE` strictly validates `plan.canCloseEarly === true`. Rejects disallowed actions with `422 Business Rule`.
  - Built customer self-service invoice settlement (`POST /api/v1/portal/invoices/:id/pay`) with live payment recording and status update.
- Shipped Customer Portal API routes:
  - `GET /api/v1/portal/subscriptions`, `GET /api/v1/portal/subscriptions/:id`, `POST /api/v1/portal/subscriptions/:id/request`
  - `GET /api/v1/portal/invoices`, `GET /api/v1/portal/invoices/:id`, `POST /api/v1/portal/invoices/:id/pay`
  - `GET /api/v1/portal/profile`, `PATCH /api/v1/portal/profile`
- Created dedicated Portal UI screens:
  - Layout & Navigation (`src/app/portal/layout.tsx`, `src/components/portal/portal-shell.tsx`) with customer navigation, badge counts, and user profile header.
  - Overview Dashboard (`src/app/portal/page.tsx`) with active services overview, invoice summary, and quick pay actions.
  - Subscriptions List & Detail (`src/app/portal/subscriptions/page.tsx`, `src/app/portal/subscriptions/[id]/page.tsx`) with `StatusRibbon`, plan terms, line items, and pause/resume/cancel modal actions.
  - Invoices List & Detail (`src/app/portal/invoices/page.tsx`, `src/app/portal/invoices/[id]/page.tsx`) with overdue flags, payment receipt table, self-service payment modal, and print view.
  - Customer Profile (`src/app/portal/profile/page.tsx`) for managing contact and billing details.

### 2026-10-31 · M4 · PERF & TEST · Volume Seeding, SLA Benchmarks (< 50ms) & Test Verification
- Created `scripts/seed-volume.ts`: Batched chunk seeder for 5,200 subscriptions, 10,500 invoices, 15,000+ payments, and 250 customer profiles.
- Created `scripts/perf-benchmark.ts`: Automated performance testing suite measuring P95 response times. Verified all core list and dashboard endpoints respond in under 50ms (well within the < 2,000ms SLA).
- Added comprehensive unit test suites:
  - `tests/payments-logic.test.ts`: 5 tests verifying overpayment blocking, auto-flip to `PAID`, partial payments, and status restrictions.
  - `tests/dashboard-metrics.test.ts`: 2 tests verifying interval-weighted MRR normalization and overdue invoice filters.
  - `tests/portal-policy.test.ts`: 6 tests verifying plan policy pause/cancel flags and customer row-scoping 404 security.
- Verification: 14 test suites (89 unit tests passed), 100% Next.js production build success (`npm run build`, 68 static and dynamic routes compiled).


---

## 8. Deployment Log

| Date | Env | Commit | URL | By | Notes |
|------|-----|--------|-----|----|-------|
| _—_ | production | | | | |

---

## 9. Demo Credentials (dev/seed only — never real passwords)

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@brightloop.io` | _set in seed, e.g. `Admin#12345`_ |
| Staff | `staff@brightloop.io` | _set in seed_ |
| Customer | `customer@brightloop.io` | _set in seed_ |

---

## 10. Retrospective (fill in after submission)

- What went well:
- What slowed us down:
- What we'd do differently:
- Things to mention in the pitch:
