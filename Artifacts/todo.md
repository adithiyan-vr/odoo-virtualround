# Brightloop — To-Do

> Legend: `[ ]` open · `[~]` in progress · `[x]` done · Owner = M1/M2/M3/M4 (see `members.md`)
> Update this file via PR. When an item completes, also add a line in `log.md`.
> Priority: 🔴 must-have (judged) · 🟡 should-have · 🟢 nice-to-have

---

## Phase 0 — Kickoff (Hour 0–2)

- [x] 🔴 **All** Read problem statement, `summary.md`, `tech-stack-guide.md`; agree on Stack (Next.js + Prisma + Postgres)
- [x] 🔴 **M1** Create GitHub repo, protect `main`, add teammates
- [x] 🔴 **M1** Scaffold Next.js (TS), Tailwind, shadcn/ui, ESLint, Prettier, Husky (optional)
- [x] 🔴 **M1** Create Neon/Supabase Postgres, share `DATABASE_URL` via private channel (never commit)
- [x] 🔴 **M1** Write `.env.example` (`DATABASE_URL`, `JWT_SECRET`, `APP_URL`, `SMTP_*` or `MAIL_MOCK=true`)
- [x] 🔴 **M1** Finalize `schema.prisma` and run first migration
- [x] 🟡 **All** Put `prd.md`, `architecture.md`, `design.md`, `database.md`, `api.md`, `members.md`, `todo.md`, `log.md` in `/docs`

---

## Phase 1 — Auth & RBAC (Hour 2–4) · Module 1

- [x] 🔴 **M1** `POST /auth/signup` — unique email, password regex `^(?=.*[a-z])(?=.*[A-Z])(?=.*[^A-Za-z0-9]).{9,}$`
- [x] 🔴 **M1** `POST /auth/login` → JWT httpOnly cookie with `role`, `userId`
- [x] 🔴 **M1** `POST /auth/forgot-password` → single-use token (hashed in DB, 30 min expiry) → email mock/log link
- [x] 🔴 **M1** `POST /auth/reset-password` — validates token + same password regex
- [x] 🔴 **M1** `requireRole()` middleware + customer row-scope helper
- [x] 🔴 **M1** `POST /users/staff` (ADMIN only)
- [ ] 🔴 **M3** Login, Signup (live rule checklist), Forgot/Reset pages
- [ ] 🔴 **M3** Layout shell + role-based sidebar + route guards
- [x] 🟡 **M1** Rate-limit login (5/min/IP)

---

## Phase 2 — Master Data (Hour 4–10) · Module 2 & 5 (config)

- [x] 🔴 **M1** Products CRUD (name, type, sales price, cost price, notes)
- [x] 🔴 **M1** Variants CRUD (attribute, value, surcharge) — seed Brand=Odoo → +560
- [x] 🔴 **M1** Plans CRUD (interval, price, min qty, valid_from/to, 4 lifecycle flags)
- [x] 🔴 **M1** Tax rules CRUD (admin-defined, % rate, applicable scope)
- [ ] 🔴 **M2** Discounts CRUD + evaluator function (see Phase 4)
- [ ] 🔴 **M3** Admin UI: Products/Variants, Plans, Taxes, Discounts, Staff
- [ ] 🔴 **M3** Price preview widget (base + variant surcharge) on product form
- [ ] 🟡 **M3** Table search, sort, pagination component reused everywhere

---

## Phase 3 — Quotation & Subscription Lifecycle (Hour 10–16) · Module 3

- [x] 🔴 **M1** Quotation Templates CRUD (plan, lines, `validity_days`)
- [ ] 🔴 **M2** `createSubscriptionFromTemplate()` with auto `SUB-xxxxx` numbering
- [ ] 🔴 **M2** Subscription line calc: unit price + variant surcharge, tax, subtotal
- [ ] 🔴 **M2** State machine: `DRAFT→QUOTATION→CONFIRMED→ACTIVE→CLOSED` + `PAUSED` branch; illegal jump → `409`
- [ ] 🔴 **M2** Enforce plan policy flags (pause / early close / renew / auto-close)
- [ ] 🔴 **M2** Quotation expiry check using `validity_days`
- [ ] 🔴 **M3** Subscription list + detail + create-from-template UI
- [ ] 🔴 **M3** `StatusRibbon` component (muted past, dark-blue current, light-grey future)
- [ ] 🟡 **M2** Renewal action creating next-term dates
- [ ] 🟢 **M2** Daily auto-close job endpoint (`POST /billing/auto-close`)

---

## Phase 4 — Billing Day & Invoicing (Hour 16–22) · Module 4 & 5 (hero)

- [ ] 🔴 **M1** Confirm DB constraint `UNIQUE(subscription_id, billing_cycle_date)` + indexes
- [ ] 🔴 **M2** `runBilling(asOfDate)`: select ACTIVE subs with `next_billing_date <= asOfDate`
- [ ] 🔴 **M2** In one transaction per subscription: build lines → apply discount → apply tax → create invoice `DRAFT` → advance `next_billing_date` → `current_uses++`
- [ ] 🔴 **M2** Skip (not crash) on unique-constraint violation; return `{processed, created, skipped, durationMs}`
- [ ] 🔴 **M2** Paused / closed / expired subs never billed
- [ ] 🔴 **M2** Invoice actions: confirm, cancel, send (email mock)
- [ ] 🔴 **M3** Invoice list/detail UI with action buttons + status ribbon
- [ ] 🔴 **M3** `BillingModal`: date picker + "Run Daily Billing Batch" + result toast
- [ ] 🔴 **M4** `InvoicePrint` page (`window.print()`, `print:hidden` sidebar)
- [ ] 🔴 **M2** Tests: double-click billing, month-end (Jan 31 → Feb 28), discount exhausted, expired discount

---

## Phase 5 — Payments, Overdue & Finance Dashboard (Hour 22–26) · Module 6 & 7

- [ ] 🔴 **M4** `POST /payments` (method, amount, date, note, invoice) — only on CONFIRMED invoices
- [ ] 🔴 **M4** Auto-flip invoice to `PAID` when sum(payments) ≥ total; block overpayment
- [ ] 🔴 **M4** Overdue query + red "Overdue" badge + filter
- [ ] 🔴 **M4** `GET /dashboard/summary` using SQL `COUNT/SUM ... FILTER`
- [ ] 🔴 **M4** KPI cards: Active subs, Revenue collected, Outstanding, Overdue
- [ ] 🔴 **M4** Monthly revenue bar chart + status pie chart (recharts)
- [ ] 🔴 **M4** Filters: date range, plan, customer, invoice status
- [ ] 🔴 **M4** Server-side pagination (default 25) on every list
- [ ] 🔴 **M4** Customer portal: own subscriptions + invoices + print
- [ ] 🟡 **M3** Payment modal inside invoice detail (uses M4 API)

---

## Phase 6 — Scale, Polish & Demo (Hour 26–30)

- [ ] 🔴 **M4** `seed.ts`: 5,000+ subscriptions, 10,000+ invoices, payments; demo accounts `admin@`, `staff@`, `customer@brightloop.io`
- [ ] 🔴 **M4** Measure & record dashboard + list endpoint timings (< 2s) in `log.md`
- [ ] 🔴 **M1** Verify indexes with `EXPLAIN ANALYZE` on slow queries
- [ ] 🔴 **M3** UI consistency pass (spacing, colours, empty/loading/error states) against `design.md`
- [ ] 🔴 **M3** Responsive check (laptop + mobile for portal)
- [ ] 🔴 **M1** Deploy to Vercel, verify env vars, smoke test production
- [ ] 🔴 **M1** README: setup steps, demo credentials, architecture summary
- [ ] 🔴 **All** Full end-to-end rehearsal (see Demo Script below)
- [ ] 🟡 **All** Record backup demo video
- [ ] 🟡 **All** Pitch slides (problem → solution → architecture → demo → impact)

---

## Cross-Cutting Checklist

### Security
- [ ] Passwords hashed with bcrypt (cost ≥ 10); never logged
- [ ] JWT in httpOnly, SameSite=Lax cookie; secret from env
- [ ] Every API route checks role; customers filtered by their own `customer_id`
- [ ] All input validated with zod
- [ ] Reset tokens hashed at rest, single-use, expiring
- [ ] No secrets in Git (`.env` in `.gitignore`)

### Quality
- [ ] Consistent API error shape `{ error: { code, message, details? } }`
- [ ] Money stored as `Decimal(12,2)`, never floats
- [ ] All dates stored UTC; displayed in local format
- [ ] Loading skeletons and empty states on every table
- [ ] Toasts for every mutation result

### Performance (< 2 s)
- [ ] Indexes: `subscriptions(status)`, `subscriptions(next_billing_date)`, `invoices(due_date, status)`, `invoices(customer_id)`, `payments(invoice_id)`
- [ ] Aggregations in SQL, not JS
- [ ] Pagination everywhere (no full-table JSON)

---

## Final Demo Script (5 minutes)

1. **Sign up** a new customer — show password rules + duplicate email rejection
2. **Admin**: create product with Brand=Odoo variant (+560), plan (monthly), discount (10%, min qty 5, max 3 uses)
3. **Staff**: create quotation from template → Confirm → Activate (watch status ribbon)
4. **Billing Day**: set date to next month → *Run Daily Billing Batch* → toast `Processed N, created N` → **click again** → `skipped N` (idempotency)
5. Show discount + tax auto-applied on invoice; **print** to PDF
6. **Record payment** (partial → still confirmed; full → Paid)
7. **Finance Lead dashboard** on 5k+ seed data — KPI cards, chart, overdue filter, load time shown `< 2s`
8. **Customer portal** — sees only own data

---

## Backlog / Ideas (only after all 🔴 are done)

- [ ] 🟢 CSV export of invoices
- [ ] 🟢 Dark mode toggle (follow `design.md` tokens)
- [ ] 🟢 Audit log viewer for admin
- [ ] 🟢 Email templates preview page
- [ ] 🟢 Proration on mid-cycle quantity change
