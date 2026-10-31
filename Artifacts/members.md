# Brightloop — Members & Workflow Split

> Odoo Hackathon 2026 · Virtual Round · Team of 4 · One shared GitHub repo
> Stack assumed (matches `tech-stack-guide.md` Option A): **Next.js (App Router, TS) + Tailwind + shadcn/ui + Prisma + PostgreSQL (Neon/Supabase)**.
> If your `architecture.md` differs, keep the ownership boundaries below and just rename the folders.

---

## 1. Ownership at a Glance

| # | Role | Owns (workflow slice) | Primary Modules |
|---|------|------------------------|-----------------|
| **M1** | Backend & Database Architect | Schema, auth, RBAC, catalog APIs, deployment | Module 1, Module 2 (API) |
| **M2** | Core Business Logic Engineer | Subscription state machine, billing engine, tax, discounts | Module 3 (logic), 4, 5 |
| **M3** | Frontend ERP Builder | Design system, Admin/Staff UI, subscription & invoice screens | Module 2 (UI), 3 (UI), 4 (UI), 5 (UI) |
| **M4** | Customer Portal, Payments, Dashboard & Seeding | Payments, overdue, finance dashboard, customer portal, seed, perf | Module 6, 7, customer side of 1/3/4 |

> Replace `M1–M4` with real names in the table below.

| Member | Name | GitHub handle | Role |
|--------|------|---------------|------|
| M1 | _TBD_ | _TBD_ | Backend & DB Architect |
| M2 | _TBD_ | _TBD_ | Business Logic Engineer |
| M3 | _TBD_ | _TBD_ | Frontend ERP Builder |
| M4 | _TBD_ | _TBD_ | Portal / Dashboard / Seeding |

---

## 2. Detailed Responsibilities

### M1 — Backend & Database Architect
**Workflow slice:** *"A new customer signs up" + "Launching a new plan"*

- [ ] Repo bootstrap: Next.js project, Prisma, ESLint/Prettier, `.env.example`, Neon/Supabase DB
- [ ] `prisma/schema.prisma` for all tables (users, products, product_variants, plans, quotation_templates, discounts, tax_rules, subscriptions, subscription_lines, invoices, invoice_lines, payments, password_reset_tokens, audit_log)
- [ ] Indexes + the `UNIQUE (subscription_id, billing_cycle_date)` idempotency constraint
- [ ] Auth: signup (unique email + password regex), login (JWT in httpOnly cookie), forgot/reset password (single-use, expiring token, email mock)
- [ ] RBAC middleware: `requireRole('ADMIN' | 'STAFF' | 'CUSTOMER')` + customer row-scoping helper
- [ ] Admin-only "create staff" endpoint
- [ ] Catalog APIs: products, variants (+560 Odoo-brand surcharge), plans (with lifecycle flags), quotation templates, tax rules
- [ ] Shared utilities: `lib/db.ts`, `lib/auth.ts`, `lib/errors.ts`, `lib/pagination.ts`
- [ ] Deploy (Vercel + Neon) and keep `main` always deployable

**Deliverables others depend on:** schema (Hour 0–2), auth + RBAC middleware (Hour 4), catalog API (Hour 10).

### M2 — Core Business Logic Engineer
**Workflow slice:** *"Turning a quote into a subscription", "Billing day", "A customer asks for a better price"*

- [ ] Subscription service: create from quotation template, number generator (`SUB-00001`), line totals with variant surcharge
- [ ] State machine guard: `DRAFT → QUOTATION → CONFIRMED → ACTIVE → CLOSED` (+ `PAUSED` branch). Reject illegal jumps with `409`
- [ ] Plan policy enforcement: `can_pause`, `can_close_early`, `can_renew`, `auto_close` (on `valid_to`/expiry)
- [ ] Tax engine: apply admin-defined tax rules per line
- [ ] Discount evaluator: FIXED/PERCENT, min purchase/qty, date window, `max_uses`, scope PRODUCT vs SUBSCRIPTION, auto-apply on next invoice
- [ ] **Billing Day engine** (hero feature): transactional batch over `ACTIVE` subs with `next_billing_date <= asOfDate`; skips duplicates gracefully; advances `next_billing_date` with `date-fns`; increments `current_uses`
- [ ] Invoice transitions: confirm / cancel / send (email mock)
- [ ] Unit tests for: state transitions, discount edge cases, double-click billing, month-end date math

**Deliverables others depend on:** service functions (Hour 10), billing endpoint (Hour 16–22).

### M3 — Frontend ERP Builder
**Workflow slice:** *Everything Admin/Staff sees and clicks*

- [ ] Design system implementation per `design.md`: tokens, layout shell (sidebar + topbar), shadcn component wrappers, status badges, data table, empty/loading/error states
- [ ] `StatusRibbon` component (Draft → Quotation → Confirmed → Active → Closed) used on both subscription and invoice detail pages
- [ ] Auth screens: login, signup (live password-rule checklist), forgot/reset
- [ ] Admin screens: Products + Variants, Plans (lifecycle toggles), Quotation Templates, Discounts, Tax Rules, Staff management
- [ ] Staff screens: Subscription list/detail/create-from-template, Invoice list/detail with Confirm/Cancel/Send/Print buttons
- [ ] `BillingModal` — "Run Daily Billing Batch" + date picker + toast result
- [ ] Route guards by role; consistent toasts, forms (react-hook-form + zod)

**Deliverables others depend on:** layout shell + shared components (Hour 4) so M4 reuses them.

### M4 — Customer Portal, Payments, Dashboard & Seeding
**Workflow slice:** *"The money comes in", "The finance lead, at the end of the month", customer self-service*

- [ ] Payment API + UI: record payment (method, amount, date, note) against invoice; auto-flip invoice to `PAID` when cumulative payments ≥ total; reject overpay
- [ ] Overdue detection: `due_date < today AND status != PAID` (indexed query + badge in invoice list)
- [ ] Finance Lead dashboard: KPI cards (Active subs, Revenue, Outstanding, Overdue), monthly revenue bar chart, subscription status pie, filters (date, plan, status, customer), paginated tables
- [ ] Customer portal: own subscriptions, own invoices, download/print invoice, request pause/close if plan allows
- [ ] `InvoicePrint` page with `window.print()` + `print:hidden` styles
- [ ] `scripts/seed.ts`: 5,000+ subscriptions, 10,000+ invoices, demo users
- [ ] Performance proof: measure every list/dashboard endpoint `< 2s` and record in `log.md`

---

## 3. Repo Layout & File Ownership (prevents merge conflicts)

```
brightloop/
├── prisma/                      # M1
├── src/
│   ├── app/
│   │   ├── (auth)/              # M3 (UI)  ← calls M1 API
│   │   ├── (admin)/             # M3
│   │   ├── (staff)/             # M3
│   │   ├── (portal)/            # M4
│   │   ├── (finance)/           # M4
│   │   └── api/v1/
│   │       ├── auth/ users/     # M1
│   │       ├── products/ plans/ templates/ taxes/   # M1
│   │       ├── subscriptions/ billing/ invoices/ discounts/  # M2
│   │       ├── payments/ dashboard/ portal/         # M4
│   ├── components/
│   │   ├── ui/ layout/ shared/  # M3 (others import only)
│   │   ├── portal/ dashboard/   # M4
│   ├── lib/
│   │   ├── auth.ts db.ts errors.ts pagination.ts    # M1
│   │   ├── services/ billing.ts discount.ts tax.ts subscription-state.ts  # M2
│   │   └── services/ payments.ts dashboard.ts       # M4
├── scripts/seed.ts              # M4
├── docs/                        # everyone appends to log.md only
└── README.md                    # M1 (final polish: all)
```

**Rule:** only edit files you own. Need a change in someone else's file? Open an issue / ping them / small PR tagged with their handle.

---

## 4. Git Workflow

- `main` — always demo-ready. Protected: PR + 1 review required.
- Branch names: `m1/auth-rbac`, `m2/billing-engine`, `m3/subscription-ui`, `m4/finance-dashboard`
- Commit style: `feat(billing): idempotent batch run` · `fix(auth): reset token expiry` · `docs(log): add perf result`
- Merge small and often (at least every 2 hours). Rebase on `main` before PR.
- Prisma schema changes: **only M1 edits `schema.prisma`**; others request changes in the group chat → M1 migrates → everyone pulls.

---

## 5. Dependency Handoffs (who waits on whom)

| When | From → To | What |
|------|-----------|------|
| H0–2 | M1 → all | Final `schema.prisma` + seed of enums + `.env.example` |
| H3–4 | M1 → M3, M4 | Auth endpoints + role middleware |
| H4 | M3 → M4 | Layout shell, DataTable, StatusBadge, KpiCard components |
| H10 | M1 → M2, M3 | Catalog API (products, variants, plans, templates) |
| H10–16 | M2 → M3 | Subscription service + state transition endpoint |
| H16–22 | M2 → M3, M4 | Billing endpoint + invoice endpoints |
| H22 | M4 → M3 | Payment modal used inside invoice detail |
| H26 | M4 → all | Seeded DB + perf numbers for demo |

**Unblock trick:** until a real endpoint ships, the consumer builds against **mock responses** defined in `api.md`.

---

## 6. Per-Member Timeline (30-hour reference; scale proportionally to your round length)

| Hours | M1 | M2 | M3 | M4 |
|-------|----|----|----|----|
| 0–4 | Repo, schema, auth, RBAC | Study spec, write service signatures, test setup | Design tokens, layout shell, login/signup UI | Seed script skeleton, portal wireframes |
| 4–10 | Catalog APIs | Tax + discount evaluators | Product/Plan/Discount admin UI | Customer portal pages (mock data) |
| 10–16 | Templates API, polish auth | Subscription service + state machine | Subscription UI + status ribbon | Payments API |
| 16–22 | Support, indexes, deploy | **Billing Day engine** + invoice transitions | Invoice UI + BillingModal + print | Payment modal, overdue logic |
| 22–26 | Perf tuning, security review | Edge-case tests | UI polish, responsive pass | Finance dashboard + filters |
| 26–30 | Seed verify, README | Bug fixing | Demo flow polish | 5k seed + perf proof, pitch deck |

---

## 7. Communication & Rituals

- **Stand-up:** 10 min at start of each work block — "done / doing / blocked".
- **Single source of truth:** `docs/todo.md` for tasks, `docs/log.md` for everything that happened.
- **Blocked > 20 min?** Post in group chat immediately.
- **Code freeze:** last 2 hours before submission — bug fixes only.

---

## 8. Demo Roles (for the final video / live pitch)

| Segment | Presenter |
|---------|-----------|
| Problem + Brightloop intro, signup & roles | M1 |
| Plan → quotation → subscription state flow | M3 |
| **Billing Day (click twice to prove idempotency) + discounts** | M2 |
| Payments, overdue, finance dashboard (<2s on 5k rows), customer portal | M4 |
