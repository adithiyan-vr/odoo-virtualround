# Brightloop — Product Requirements Document (PRD)

| | |
|---|---|
| **Product** | Brightloop — Subscription Management System |
| **Event** | Odoo Hackathon 2026 — Virtual Round |
| **Version** | 1.0 (baseline) |
| **Date** | 31 Oct 2026 |
| **Status** | Ready for build |
| **Team** | 4 first-year CSE undergraduates, one shared GitHub repo |
| **Companion docs** | [DESIGN](DESIGN.md) · [ARCHITECTURE](ARCHITECTURE.md) · [DATABASE](DATABASE.md) · [API](API.md) · [MEMBERS](MEMBERS.md) · [TODO](TODO.md) · [LOG](LOG.md) |

**Source inputs:** Problem statement PDF, *Complete First-Year CSE Blueprint* (`summary`), *Tech Stack & Architecture Guide*, and two UI references (landing page "Active", dashboard "Quantro").

---

## 1. Product Overview

**Brightloop** is one unified platform that runs the full life of a subscription business: **set up products and plans → quote → subscribe → bill automatically → collect payments → report revenue.**

It replaces Brightloop Software's spreadsheet-and-email process with a single system that three kinds of people use daily:

| Pillar | What it means |
|---|---|
| **Setup** | Products, variants, plans, taxes, payment terms, discounts, quotation templates |
| **Sell** | Quotation → Confirmed → Active subscription with a visible status ribbon |
| **Bill** | One-click *Billing Day* creates every due invoice — never twice, never skipped |
| **Collect** | Payments recorded per invoice; paid / outstanding / overdue always visible |
| **Report** | Finance Lead dashboard: active subscriptions, MRR, revenue, outstanding, overdue — under 2 s |

**Tagline:** *Recurring revenue, on autopilot.*

---

## 2. Problem Statement

| How things run today | Pain | Brightloop answer |
|---|---|---|
| Subscriptions tracked in a spreadsheet | No single source of truth | Relational subscription ledger with a strict state machine |
| Renewals remembered by whoever notices first | Missed renewals, lost revenue | Plan lifecycle policies (auto-close / pause / renew) + upcoming-renewals widget |
| Invoices typed by hand | Wrong amounts, wrong tax | Automated, idempotent Billing Day engine with automatic tax and discounts |
| Payments matched by scrolling bank statements | Slow, error-prone reconciliation | Payments recorded against invoices; invoices auto-flip to *Paid* |
| Revenue reports built manually each quarter | Nobody knows real MRR | Live finance dashboard with SQL aggregations and filters |

---

## 3. Goals, Non-Goals, Success Metrics

### 3.1 Goals
1. **G1** — Deliver all 7 evaluation modules end-to-end in one deployed web app.
2. **G2** — Make Billing Day trustworthy: *no duplicate invoices, no skipped cycles*, safe to click repeatedly.
3. **G3** — Enforce roles (Admin / Staff / Customer) on every page **and** every API call.
4. **G4** — Keep every page under **2 seconds** with 5,000+ subscriptions and 20,000+ invoices.
5. **G5** — One consistent, polished UI (see DESIGN.md) across landing, auth, back-office and portal.
6. **G6** — Be demo-ready: seeded data, one-click billing simulation, three demo accounts.

### 3.2 Non-Goals (v1)
Real payment-gateway integration (a **mock** "Pay now" is provided), multi-currency, multi-company/tenant, proration and usage-based billing, GL/accounting export, native mobile apps, multi-language UI.

### 3.3 Success Metrics

| Metric | Target | How verified |
|---|---|---|
| Modules demonstrable end-to-end | 7 / 7 | Demo script §14 |
| Duplicate invoices after running Billing Day 10× | 0 | `T6.04` stress script |
| Dashboard load with 5,000 subs / 20,000 invoices | < 2 s (goal < 500 ms API) | Perf log in LOG.md |
| Paginated list endpoints | < 300 ms | Perf log |
| Unauthorised access attempts blocked | 100 % | RBAC test suite `T3.01`, `T5.01` |
| Password-policy cases passing | 100 % | Unit tests (§7.1) |

---

## 4. Users & Personas

| Persona | System role | Goals | Primary screens |
|---|---|---|---|
| **Admin** (ops owner) | `ADMIN` | Configure catalog, plans, taxes, discounts; add staff; run billing; govern the system | Everything |
| **Staff** (sales / support rep) | `STAFF` | Handle customers daily: quotes, subscriptions, invoices, payments | Dashboard (read), Customers, Subscriptions, Invoices, Payments |
| **Customer** (small-shop owner) | `CUSTOMER` | See own subscriptions and invoices, print/download, pay, pause/close/renew where allowed | Customer portal |
| **Finance Lead** | `ADMIN` (persona) | One place to see active subs, revenue, payments, overdue | Finance dashboard |

> The Finance Lead is a *persona* served by the Admin role. Staff can view the dashboard read-only. (Decision D-010 in LOG.md.)

---

## 5. Roles & Permission Matrix

`✔` allowed · `—` denied · `own` only own records · `R` read-only

| Capability | Public | Customer | Staff | Admin |
|---|:--:|:--:|:--:|:--:|
| Landing page, sign up, log in, reset password | ✔ | ✔ | ✔ | ✔ |
| Create staff accounts | — | — | — | ✔ |
| Activate / deactivate users | — | — | — | ✔ |
| Products, variants, plans (create / edit / archive) | — | — | R | ✔ |
| Taxes, payment terms, settings | — | — | R | ✔ |
| Discount rules (create / edit / archive) | — | — | R | ✔ |
| Quotation templates (create / edit) | — | — | R | ✔ |
| Customers (create / edit) | — | own profile | ✔ | ✔ |
| Subscriptions: create, edit lines, send quotation, confirm, activate | — | — | ✔ | ✔ |
| Subscriptions: pause / resume / close / renew (subject to plan flags) | — | own | ✔ | ✔ (override close) |
| Run Billing Day / generate invoice | — | — | ✔ | ✔ |
| Invoices: confirm, cancel, send, print | — | print own | ✔ | ✔ |
| Record payment | — | mock pay own | ✔ | ✔ |
| Void payment | — | — | — | ✔ |
| Finance dashboard & CSV reports | — | — | R | ✔ |
| Audit log, dev mailbox | — | — | — | ✔ |

---

## 6. Scope & Priorities

| Priority | Meaning | Items |
|---|---|---|
| **P0 — Must** | Needed to pass the 7 modules | Auth/RBAC, catalog, plans, templates, subscriptions + state machine, discounts, Billing Day engine, invoices, payments, overdue detection, finance dashboard, seed data, print invoice |
| **P1 — Should** | Raises polish and judging score | Landing page, customer portal self-service, billing history, audit log, CSV export, email sending (mock transport), upcoming-renewals widget |
| **P2 — Could** | Only if time remains | Online quotation acceptance, overdue reminder emails, server-side PDF, dark mode, real gateway (test mode), dunning schedule |

---

## 7. Functional Requirements

### 7.1 Module 1 — Authentication & RBAC

| ID | Requirement | Pri | Acceptance criteria |
|---|---|:--:|---|
| AUTH-01 | Visitor signs up with name, email, password. Creates a `CUSTOMER` user and a linked customer profile (links to an existing staff-created customer with the same email). | P0 | Success redirects to `/portal`. Duplicate email (case-insensitive) → `409 EMAIL_TAKEN` + inline error. |
| AUTH-02 | Password policy: **more than 8 characters (min 9)**, ≥1 uppercase, ≥1 lowercase, ≥1 special character. One shared regex `^(?=.*[a-z])(?=.*[A-Z])(?=.*[^A-Za-z0-9]).{9,}$` used client + server. | P0 | Accept `Strong@Pass1`. Reject `Ab@12345` (8 chars), `abcdefg@1` (no upper), `ABCDEFG@1` (no lower), `Abcdefgh1` (no special). Live checklist in UI. |
| AUTH-03 | Log in with email + password; session in httpOnly cookie; redirect by role (`ADMIN`/`STAFF` → `/dashboard`, `CUSTOMER` → `/portal`). | P0 | Wrong credentials → generic `401 INVALID_CREDENTIALS`. Disabled account → `403 ACCOUNT_DISABLED`. |
| AUTH-04 | Forgot password: reset link emailed to the registered address. Token is single-use, expires in 30 min, stored hashed. Response is identical whether or not the email exists. | P0 | Email (or dev-mailbox entry) contains `/reset-password?token=…`. Reused/expired token → `400 INVALID_OR_EXPIRED_TOKEN`. |
| AUTH-05 | Reset password with a valid token; policy re-validated; all old tokens invalidated. | P0 | After reset the user can log in with the new password only. |
| AUTH-06 | RBAC enforced in route middleware **and** in every API handler. | P0 | A customer calling an admin API gets `403`; a staff user opening `/taxes` is redirected. |
| AUTH-07 | Only Admin can create staff; public signup can never create `STAFF`/`ADMIN`. | P0 | `POST /users/staff` as non-admin → `403`. |
| AUTH-08 | Customers only ever see records where `customer_id` equals their own. | P0 | Changing an ID in the URL to another customer's record → `404`. |
| AUTH-09 | Logout, change password, admin activate/deactivate users. | P1 | Deactivated user's next request is rejected. |
| AUTH-10 | Login rate limit: 5 attempts / minute per IP + email. | P1 | 6th attempt → `429 RATE_LIMITED`. |

### 7.2 Module 2 — Products, Variants, Plans, Taxes

| ID | Requirement | Pri | Acceptance criteria |
|---|---|:--:|---|
| CAT-01 | Admin manages products: SKU, name, type (`SERVICE`/`STORABLE`), sales price, cost price, notes, default tax, active flag. | P0 | SKU unique; prices ≥ 0; archive instead of delete when referenced. |
| CAT-02 | Variants per product by attribute (e.g. Brand) with a price surcharge. **Brand = Odoo adds 560.** | P0 | Product 1,200 + Odoo variant 560 → effective price 1,760.00 everywhere (line editor, invoice). |
| CAT-03 | Effective unit price = `salesPrice + variant.priceSurcharge`; editable per quotation line by staff. | P0 | Changing the variant on a line instantly updates unit price and totals. |
| CAT-04 | Admin manages plans: name, price (plan fee per period, may be 0), billing interval (`DAILY`/`WEEKLY`/`MONTHLY`/`YEARLY`), minimum quantity, `validFrom`, `validTo`. | P0 | `validTo ≥ validFrom`; min quantity ≥ 1. |
| CAT-05 | Plan lifecycle flags, set plan by plan: `autoClose`, `canCloseEarly`, `canPause`, `canRenew`. Enforced at runtime for every actor. | P0 | Pausing a subscription whose plan has `canPause=false` → `409 PLAN_POLICY_VIOLATION`; the button is hidden. |
| CAT-06 | Admin manages taxes (name, rate %, active, default). Used automatically on lines and invoices. | P0 | 18 % tax on taxable 7,920.00 = 1,425.60. |
| CAT-07 | Admin manages payment terms (Immediate, Net 15, Net 30, Net 60). | P0 | Due date = invoice date + term days. |
| CAT-08 | Plans are available for new subscriptions only when `validFrom ≤ start date ≤ validTo`. | P1 | Selecting an expired plan is blocked with a clear message. |

### 7.3 Module 3 — Templates, Subscriptions, State Machine

| ID | Requirement | Pri | Acceptance criteria |
|---|---|:--:|---|
| TPL-01 | Admin builds quotation templates: plan + product/variant lines + `validityDays`. Staff start a quotation from a template. | P0 | New subscription from template pre-fills plan and lines at current prices; `validUntil = today + validityDays`. |
| SUB-01 | Create subscription from scratch or from template. | P0 | Required: customer, plan, start date, expiry date, payment terms, ≥1 line. |
| SUB-02 | Unique readable number per subscription: `SUB-YYYY-00001`. | P0 | Atomic sequence; no gaps under concurrent creates. |
| SUB-03 | Lines show product, variant, quantity, unit price, tax, amount; totals recalculated live. | P0 | Amount = qty × unit price; tax per line; subtotal / tax / total shown. |
| SUB-04 | State machine **Draft → Quotation → Confirmed → Active → Closed**, plus **Paused** (from Active). Illegal jumps are rejected. | P0 | Draft → Active directly → `409 INVALID_TRANSITION`. |
| SUB-05 | **Status ribbon** visible to Admin, Staff and Customer on every subscription. | P0 | Done steps muted, current step dark, future steps light. |
| SUB-06 | Pause / resume / close early / renew gated by plan flags. | P0 | See §8.4. |
| SUB-07 | Quotation expires after `validUntil`; expired quotations cannot be confirmed. | P1 | "Expired" badge; confirm → `409 QUOTATION_EXPIRED`. |
| SUB-08 | Activity timeline per subscription (who did what, when). | P1 | Every transition appears with actor + timestamp. |
| SUB-09 | Plans with `autoClose` close their subscriptions automatically when the end date passes. | P0 | Lifecycle sweep closes with reason `EXPIRED` or `PLAN_ENDED`. |
| SUB-10 | Product-line quantity must be ≥ plan minimum quantity. | P0 | Saving below minimum → `422` with the minimum shown. |

### 7.4 Module 4 — Billing Day & Invoices

| ID | Requirement | Pri | Acceptance criteria |
|---|---|:--:|---|
| BIL-01 | **Run Billing Day** button with a date picker (simulated "as of" date). Processes every `ACTIVE` subscription with `next_billing_date ≤ asOfDate`. | P0 | Toast: *"Processed 42 subscriptions · 42 invoices created · 240 ms"*. |
| BIL-02 | Each invoice is auto-built from its subscription: customer snapshot, lines, discounts, taxes, totals, due date. | P0 | No manual typing needed to produce a correct invoice. |
| BIL-03 | **Idempotent & gap-free.** DB unique key `(subscription_id, billing_cycle_date)`, row locks, and catch-up loop for missed cycles. | P0 | Clicking Run 10× creates 0 extra invoices. Skipping a month then running creates the missed invoices. |
| BIL-04 | After invoicing, `next_billing_date` advances by one plan interval (anchor-based, no month-end drift). | P0 | Jan 31 monthly → Feb 28 → Mar 31. |
| BIL-05 | Invoice actions: **Confirm, Cancel, Send (email), Print**. | P0 | Buttons shown only when allowed by invoice status. |
| BIL-06 | Invoice status: `DRAFT → CONFIRMED → PAID` (+ terminal `CANCELLED`). | P0 | See §8.7. |
| BIL-07 | Billing run history (who, when, as-of date, counts, duration, errors). | P1 | `/billing` table with drill-down. |
| BIL-08 | "Generate invoice now" for a single subscription. | P1 | Respects the same idempotency rules. |
| BIL-09 | Taxes calculated automatically from admin tax rules; per-line rounding half-up to 2 decimals. | P0 | Matches worked example §8.11. |
| BIL-10 | Unique readable invoice number `INV-YYYY-000001`. | P0 | Atomic sequence. |
| BIL-11 | Optional *Auto-confirm* toggle in the Billing modal. | P1 | Created invoices land directly in `CONFIRMED`. |

### 7.5 Module 5 — Discount Rules

| ID | Requirement | Pri | Acceptance criteria |
|---|---|:--:|---|
| DSC-01 | Only Admin creates/edits discount rules. | P0 | Staff sees read-only list; `POST` → `403`. |
| DSC-02 | Type: **fixed amount** or **percentage**. | P0 | Percent ≤ 100; fixed > 0. |
| DSC-03 | Thresholds: minimum purchase amount and/or minimum quantity. | P0 | Below threshold → discount not applied. |
| DSC-04 | Validity window: start date and optional end date. | P0 | Outside window → not applied. |
| DSC-05 | Usage limit (`maxUses`, blank = unlimited) with a live `currentUses` counter. | P0 | Counter increments atomically per invoice. |
| DSC-06 | Scope: **specific products** or **whole subscription**. | P0 | Product scope only discounts matching lines. |
| DSC-07 | Applied **automatically** on the next invoice once eligible — attached to the subscription, or flagged *auto-apply*. | P0 | Next Billing Day shows the discount line with no manual step. |
| DSC-08 | Stops when expired or when uses run out. | P0 | Invoice after the last allowed use has no discount. |
| DSC-09 | Stacking rule: max 1 product discount per line (best wins) + max 1 subscription discount on the remainder (best wins). | P0 | Deterministic totals (§8.3). |

### 7.6 Module 6 — Payments & Reconciliation

| ID | Requirement | Pri | Acceptance criteria |
|---|---|:--:|---|
| PAY-01 | Record payment against a **confirmed** invoice: method, amount, date, reference, note. Methods: Bank Transfer, Card, Cash, UPI, Cheque, Other. | P0 | Payment appears on the invoice and in the payments list. |
| PAY-02 | Partial payments allowed; invoice becomes `PAID` when total payments = total. | P0 | `amount_paid`, `amount_due` always correct. |
| PAY-03 | Overpayment blocked. | P0 | Amount > amount due → `422 OVERPAYMENT`. |
| PAY-04 | Paid / partially paid / outstanding visible at any moment, filterable. | P0 | Invoice list filters + status pills. |
| PAY-05 | **Overdue** = `CONFIRMED`, amount due > 0, `due_date < today`. | P0 | Overdue chip, days overdue, dedicated filter and dashboard table. |
| PAY-06 | Admin can void a payment; invoice status/balances revert. | P1 | Voided payment excluded from revenue. |

### 7.7 Module 7 — Finance Dashboard & Performance

| ID | Requirement | Pri | Acceptance criteria |
|---|---|:--:|---|
| DSH-01 | KPI cards: Active subscriptions, MRR, Revenue collected, Outstanding, Overdue (count + amount). | P0 | Values match SQL ground truth. |
| DSH-02 | Filters: date range, plan, customer, invoice status — reflected in the URL. | P0 | Filter changes update all widgets. |
| DSH-03 | Charts: revenue trend (area/bar), subscription status (donut). | P0 | Rendered from aggregate endpoints. |
| DSH-04 | Tables: overdue invoices, upcoming renewals, recent payments, top plans. | P1 | Each paginated, "View all" links. |
| DSH-05 | **Every page responds in < 2 s** with 5,000+ subscriptions and 20,000+ invoices. | P0 | Verified and logged in LOG.md §9. |
| DSH-06 | CSV export of invoices and payments (filtered). | P1 | Opens in Excel. |

### 7.8 Customer Portal & Marketing Site

| ID | Requirement | Pri |
|---|---|:--:|
| POR-01 | "My subscriptions" list + detail with status ribbon (own records only). | P0 |
| POR-02 | "My invoices" list + detail + print/download. | P0 |
| POR-03 | Self-service pause / close / renew where the plan allows. | P1 |
| POR-04 | Profile (billing details, GSTIN) editable. | P1 |
| POR-05 | Mock "Pay now" records a payment (method Card/UPI). | P2 |
| LAND-01 | Landing page: hero, features, benefits, live pricing from active plans, CTA, footer. | P1 |

---

## 8. Business Rules

### 8.1 Pricing & line math
- `unitPrice = product.salesPrice + variant.priceSurcharge` (default; staff may override per line).
- `amount = quantity × unitPrice`.
- A plan with `price > 0` adds an automatic **Plan fee** line (qty 1) when the subscription is created. Plan fee lines are never eligible for product-scope discounts.
- Money is stored as `DECIMAL(12,2)`; never `float`. Rounding mode: **half-up**, applied per line.

### 8.2 Tax
- Each line has one tax (default from product, else the default tax).
- `taxableAmount = amount − lineDiscount`; `taxAmount = round(taxableAmount × rate / 100, 2)`.
- Tax rate and name are **snapshotted** onto invoice lines so later tax edits never change issued invoices.

### 8.3 Discounts
1. **Eligible** when: active · `startDate ≤ invoiceDate ≤ endDate` (blank = open) · `currentUses < maxUses` (blank = unlimited) · thresholds met.
2. **Attached** = `subscription.discountId`; **Auto-apply** = rules flagged `autoApply`.
3. **Scope `PRODUCT`** → eligible lines are those whose product is in the rule's product list; thresholds use those lines' gross amount and quantity.
   **Scope `SUBSCRIPTION`** → all lines; thresholds use the invoice gross subtotal and total product quantity.
4. **Value:** percent → `gross × %`; fixed → `min(value, eligible gross)`, spread proportionally across eligible lines (remainder to last line).
5. **Stacking:** per line, the single best `PRODUCT` discount wins; then the single best `SUBSCRIPTION` discount applies to the *remaining* amount.
6. **Usage:** `currentUses += 1` per discount **per invoice**, via an atomic conditional update inside the invoice transaction; if exhausted by a race, the discount is dropped from that invoice.
7. A line can never go below 0.

### 8.4 Subscription lifecycle

| From | To | Action | Who | Guard | Side effects |
|---|---|---|---|---|---|
| Draft | Quotation | `send_quotation` | Staff, Admin | ≥1 line; qty ≥ plan min; plan available on start date | `quotationDate = today`; `validUntil = today + validityDays` (default 30) |
| Quotation | Confirmed | `confirm` | Staff, Admin | not expired | lines/prices locked |
| Confirmed | Active | `activate` (manual, or auto on start date by sweeper) | Staff, Admin, system | — | `billingAnchorDate = startDate`; `billedCycles = 0`; `nextBillingDate = startDate` |
| Active | Paused | `pause` | Staff, Admin, Customer (own) | `plan.canPause` | `pausedAt = now`; skipped by Billing Day |
| Paused | Active | `resume` | same | — | **Pause freezes the clock:** anchor and expiry shift by days paused; `nextBillingDate` recomputed |
| Active / Paused | Closed | `close` | Staff, Customer (own): `plan.canCloseEarly`; Admin: always (audited) | — | `closedAt`, reason `MANUAL`/`CUSTOMER_REQUEST`; `nextBillingDate = null` |
| Active | Closed | auto-close | system | `plan.autoClose` and (expiry ≤ today **or** plan `validTo` < today) | reason `EXPIRED` / `PLAN_ENDED` |
| Active | Active | `renew` | Staff, Admin, Customer (own) | `plan.canRenew`; plan covers new end date | `expiryDate` extended by the current term length |
| Closed | new Draft | `create_renewal` | Staff, Admin | `plan.canRenew` | clone with `renewedFromId` |
| Draft / Quotation / Confirmed | Closed | `cancel` | Staff, Admin | — | reason `CANCELLED` |

If `autoClose = false`, the subscription stays `ACTIVE` after expiry (flagged "Expired — action needed" in the renewals widget) but **no further invoices** are generated for periods starting on/after `expiryDate`.

### 8.5 Billing schedule & idempotency
- **Bill in advance:** invoice for a cycle is dated the cycle start.
- `cycleStart(n) = addInterval(billingAnchorDate, n × interval)` — computed from the anchor, never by repeatedly adding to the previous date (prevents month-end drift).
- Eligible when `status = ACTIVE`, `nextBillingDate ≤ asOfDate`, and cycle start `< expiryDate`.
- **Catch-up:** loop until caught up (safety cap `BILLING_MAX_CATCHUP_CYCLES = 24`) so missed cycles are never skipped.
- **Never twice:** unique `(subscription_id, billing_cycle_date)` + `SELECT … FOR UPDATE` on the subscription + pre-check; unique violation ⇒ roll back that subscription and count as *skipped*.
- A *Cancelled* invoice keeps its cycle slot (the cycle is not silently re-billed); staff can use manual correction.

### 8.6 Numbering
`SUB-2026-00001`, `INV-2026-000001` — year + zero-padded atomic sequence (table `number_sequences`).

### 8.7 Invoice lifecycle

| Status | Meaning | Allowed actions |
|---|---|---|
| `DRAFT` | Created by Billing Day / manual | Confirm, Cancel, Send*, Print |
| `CONFIRMED` | Issued receivable | Record payment, Send, Print, Cancel (only if no payments) |
| `PAID` | Fully settled | Print, Send |
| `CANCELLED` | Voided before payment | Print |

*Derived badges:* **Partially paid** (`amount_paid > 0` and `< total`), **Overdue** (§8.8). A zero-total invoice becomes `PAID` on confirm.

### 8.8 Payments & overdue
- Payment amount must be `> 0` and `≤ amount_due`.
- On payment (single transaction): `amount_paid += amount`; `amount_due = total − amount_paid`; if `amount_due = 0` ⇒ `status = PAID`, `paidAt = payment date`.
- **Overdue:** `status = CONFIRMED AND amount_due > 0 AND due_date < today`.
- Due date = invoice date + payment-term days.

### 8.9 KPI definitions

| KPI | Definition |
|---|---|
| Active subscriptions | Count of `ACTIVE` subscriptions (paused excluded) |
| MRR (ex-tax) | Σ `recurring_subtotal` of Active subs × monthly factor (Daily 30 · Weekly 52/12 · Monthly 1 · Yearly 1/12) |
| Revenue collected | Σ non-voided payments with `payment_date` in range |
| Outstanding | Σ `amount_due` of `CONFIRMED` invoices (current, ignores date filter) |
| Overdue | Count and Σ `amount_due` of overdue invoices (current) |
| Invoiced | Σ `total_amount` of `CONFIRMED`/`PAID` invoices with `invoice_date` in range |

### 8.10 Currency & locale
Default currency **INR (₹)**, Indian digit grouping (`₹1,23,456.00`), dates `DD MMM YYYY`. Currency code is a setting (`APP_CURRENCY`) — single currency per deployment.

### 8.11 Worked example (use as a test fixture)
Customer *Acme Traders* · Plan **Business Monthly** (fee ₹1,499.00, min qty 5, Net 30) · Product **Brightloop CRM Seat** ₹1,200.00 + Brand **Odoo** surcharge ₹560.00 · qty 5 · GST 18 % · discount **Seat Saver** 10 % (product scope, min qty 5).

| Line | Qty | Unit | Gross | Discount | Taxable | Tax 18 % | Total |
|---|--:|--:|--:|--:|--:|--:|--:|
| Plan fee — Business Monthly | 1 | 1,499.00 | 1,499.00 | 0.00 | 1,499.00 | 269.82 | 1,768.82 |
| Brightloop CRM Seat — Brand: Odoo | 5 | 1,760.00 | 8,800.00 | 880.00 | 7,920.00 | 1,425.60 | 9,345.60 |
| **Invoice** | | | **10,299.00** | **880.00** | **9,419.00** | **1,695.42** | **11,114.42** |

Invoice date 01 Nov 2026 → due 01 Dec 2026 (Net 30).

---

## 9. End-to-End Journeys (the Problem Statement's "scenes")

| Scene | Journey | Screens | Requirements |
|---|---|---|---|
| A new customer signs up | Sign up → policy checklist → portal; forgot password → email link → reset | Landing, Signup, Login, Forgot/Reset, Portal | AUTH-01…10 |
| Launching a new plan | Admin adds product + variants → plan with interval, min qty, dates, flags | Products, Plans | CAT-01…08 |
| Turning a quote into a subscription | Staff picks template → edits lines → Quotation → Confirmed → Active; everyone sees the ribbon | Templates, Subscriptions | TPL-01, SUB-01…10 |
| Billing day | Admin/Staff picks date → Run → invoices auto-created; confirm/send/print | Billing modal, Invoices, Print | BIL-01…11 |
| A customer asks for a better price | Admin creates discount rule; next invoice shows it automatically; stops at limit/expiry | Discounts, Invoice detail | DSC-01…09 |
| The money comes in | Staff records payment; invoice flips to Paid; overdue list to chase | Invoice detail, Payments | PAY-01…06 |
| Finance lead, end of month | Opens dashboard, filters, exports | Dashboard | DSH-01…06 |

---

## 10. Pages & Routes

| Area | Route | Roles |
|---|---|---|
| Public | `/`, `/login`, `/signup`, `/forgot-password`, `/reset-password` | Public |
| Back-office | `/dashboard` | Admin, Staff (R) |
| | `/customers`, `/customers/[id]` | Admin, Staff |
| | `/products`, `/products/[id]` · `/plans`, `/plans/[id]` · `/templates`, `/templates/[id]` | Admin (Staff R) |
| | `/subscriptions`, `/subscriptions/new`, `/subscriptions/[id]` | Admin, Staff |
| | `/invoices`, `/invoices/[id]` · `/payments` · `/billing` | Admin, Staff |
| | `/discounts` · `/taxes` · `/payment-terms` · `/staff` · `/settings` · `/audit-log` · `/dev/mailbox` | Admin |
| Print | `/print/invoice/[id]` | Admin, Staff, owning Customer |
| Portal | `/portal`, `/portal/subscriptions[/id]`, `/portal/invoices[/id]`, `/portal/profile` | Customer |

---

## 11. Non-Functional Requirements

| Area | Requirement |
|---|---|
| **Performance** | Every page < 2 s with 5,000+ subs / 20,000+ invoices. Server-side pagination (default 25, max 100), SQL aggregation, indexes. |
| **Security** | bcrypt (cost 12), httpOnly + SameSite cookies, zod validation on every input, RBAC server-side, rate limiting, hashed reset tokens, no secrets in Git. |
| **Reliability** | Billing and payments in DB transactions; idempotent by constraint; no partial invoices. |
| **Usability** | One design system; loading, empty and error states on every screen; plain-language errors. |
| **Accessibility** | WCAG 2.1 AA targets: contrast, focus rings, keyboard operable, labels on inputs. |
| **Responsiveness** | Works from 360 px to wide desktop; tables collapse to cards on mobile. |
| **Maintainability** | TypeScript strict, shared zod schemas, folder ownership per member, unit tests for engines. |
| **Observability** | Audit log, billing-run history, request IDs in errors, email log. |
| **Compatibility** | Latest Chrome, Edge, Firefox, Safari. |

---

## 12. Assumptions

1. Path A (custom web app) is acceptable for the round; Path B (native Odoo module) is **not** being built.
2. Single currency (INR); dates are pure calendar dates (no time zones in business logic).
3. Quotation templates and master data are Admin-managed; Staff consume them.
4. "Send invoice" uses a mock/DB mail transport unless SMTP is configured.
5. The simulated Billing Day date is a demo feature and does not change the real "today" used for overdue checks.

(Full list with rationale: LOG.md §3–§4.)

---

## 13. Risks & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Month-end and pause date math bugs | Wrong invoice dates | Anchor-based schedule; unit tests for 29/30/31 and leap years |
| Double billing on repeated clicks | Judge-visible failure | Unique constraint + row lock + stress test |
| Slow dashboard on cold serverless/DB | > 2 s on first hit | Pooled connection, indexes, warm-up ping before demo, cache summary 30 s |
| Four people editing one schema/UI | Merge conflicts | Folder ownership, single schema owner, CODEOWNERS (MEMBERS.md) |
| Scope creep | Unfinished core | Strict P0/P1/P2; stretch only after Phase 5 |
| Demo email not configured | Reset/send looks broken | DB mail transport + `/dev/mailbox` page |

---

## 14. Demo Script (≈ 5 minutes)

1. **Landing → Sign up** with a weak password (watch the checklist), then a valid one → portal.
2. **Admin login** → Products: show *Brand = Odoo +560* → Plans: lifecycle flags.
3. **Discounts:** create "Seat Saver 10 %" (auto-apply, min qty 5).
4. **Staff:** new quotation from template → change variant → ribbon *Draft → Quotation → Confirmed → Active*.
5. **Billing Day:** pick next month's date → **Run** → toast with counts → click **Run again** → *0 created* (idempotency).
6. **Invoice:** open → discount + tax visible → **Print** → **Record payment** (partial, then rest) → *Paid*.
7. **Finance dashboard:** KPIs, filters, overdue table, 5,000-sub dataset loads < 2 s.
8. **Customer portal:** own subscriptions/invoices only; pause where allowed.

---

## 15. Evaluation Traceability Checklist

- [ ] **M1** Auth & RBAC — AUTH-01…10
- [ ] **M2** Products, variants, plans — CAT-01…08
- [ ] **M3** Templates & state machine — TPL-01, SUB-01…10
- [ ] **M4** Billing & invoices — BIL-01…11
- [ ] **M5** Discounts — DSC-01…09
- [ ] **M6** Payments — PAY-01…06
- [ ] **M7** Dashboard & performance — DSH-01…06

---

## 16. Glossary

| Term | Meaning |
|---|---|
| **MRR** | Monthly recurring revenue, normalised across billing intervals |
| **Billing Day** | The batch run that creates invoices for all due subscriptions |
| **Billing cycle date** | Start date of the period an invoice covers; part of the idempotency key |
| **Idempotent** | Running the same operation again produces no additional effect |
| **Plan fee** | Recurring base charge defined on the plan |
| **Anchor date** | Date from which all cycle dates are computed |
| **Overdue** | Confirmed invoice with money still due after its due date |
