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
| R2 | 2026-10-31 | Month-end date math (Jan 31 + 1 month) | M2 | Open | Use `date-fns addMonths`; add unit test |
| R3 | 2026-10-31 | Dashboard < 2 s on 5k+ rows | M4 | Open | Indexes + SQL aggregation + pagination; verify after seed |

---

## 4. Milestones

| Milestone | Target | Status | Date done |
|-----------|--------|--------|-----------|
| Repo + schema ready | Hour 2 | ⬜ | |
| Auth + RBAC working | Hour 4 | ⬜ | |
| Catalog (products/variants/plans) | Hour 10 | ⬜ | |
| Subscription state machine | Hour 16 | ⬜ | |
| Billing Day engine (idempotent) | Hour 22 | ⬜ | |
| Payments + Finance dashboard | Hour 26 | ⬜ | |
| 5k seed + < 2 s verified | Hour 28 | ⬜ | |
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
| _—_ | Signup with existing email | 409 | | |
| _—_ | Password `Abcdefg1!` (9 chars, rules met) | accepted | | |
| _—_ | Password `Abcdef1!` (8 chars) | rejected | | |
| _—_ | Customer opens another customer's invoice | 404 | | |
| _—_ | Staff creates another staff | 403 | | |
| _—_ | Draft → Active jump | 409 | | |
| _—_ | Run billing twice for same date | 2nd run: created 0, skipped N | | |
| _—_ | Discount `max_uses` reached | Not applied on next invoice | | |
| _—_ | Expired discount | Not applied | | |
| _—_ | Partial payment | Invoice stays CONFIRMED | | |
| _—_ | Full payment | Invoice → PAID | | |
| _—_ | Overpayment | 422 | | |
| _—_ | Paused plan not allowed (`can_pause=false`) | 422 | | |

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

<!-- Append new entries below this line -->

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
