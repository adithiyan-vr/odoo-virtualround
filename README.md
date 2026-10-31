# Brightloop — Subscription Management System

> Odoo Hackathon 2026 · Virtual Round · Team Brightloop  
> Stack: **Next.js (App Router, TypeScript) + Tailwind CSS + Prisma ORM + PostgreSQL**

---

## 🚀 Overview

**Brightloop** is a full-featured subscription management system designed to automate recurring revenue operations:
- **Master Data & Catalog**: Products, variants (with Odoo brand surcharge), subscription plans, quotation templates, tax rules, payment terms.
- **Identity & RBAC**: Custom JWT (`jose`) in `HttpOnly` cookies, bcrypt password hashing, 3-role authorization (`ADMIN`, `STAFF`, `CUSTOMER`), row-level customer scoping.
- **Subscription Lifecycle**: State machine transitions (`DRAFT` → `QUOTATION` → `CONFIRMED` → `ACTIVE` → `CLOSED` / `PAUSED`).
- **Billing Day Engine**: Idempotent batch billing runs protected by `UNIQUE(subscription_id, billing_cycle_date)` and database transactions.
- **Payment Collection & Finance Dashboard**: Invoice settlements, overdue tracking, high-performance SQL analytics.

---

## 👥 Team & Ownership Split

| Member | Role | Owned Modules | Responsibilities |
|---|---|---|---|
| **M1** | **Backend & Database Architect** | **Module 1, Module 2 (API)** | Schema, migrations, auth, RBAC, catalog APIs, platform utilities, deployment |
| **M2** | Core Business Logic Engineer | Module 3, 4, 5 | Subscription state machine, billing engine, tax, discounts |
| **M3** | Frontend ERP Builder | Module 2 (UI), 3 (UI), 4 (UI), 5 (UI) | Design system, status ribbons, admin/staff dashboards |
| **M4** | Customer Portal, Payments & Seed | Module 6, 7 | Payments, customer portal, 5k volume seed, performance tests |

---

## 🔑 Demo Credentials

| Role | Email | Password |
|---|---|---|
| **Admin** | `admin@brightloop.io` | `Admin@12345` |
| **Staff** | `staff@brightloop.io` | `Staff@12345` |
| **Customer** | `customer@brightloop.io` | `Customer@12345` |

*Password Policy:* Minimum 9 characters, at least 1 lowercase letter, 1 uppercase letter, and 1 special character (`^(?=.*[a-z])(?=.*[A-Z])(?=.*[^A-Za-z0-9]).{9,}$`).

---

## 🛠️ Getting Started

### 1. Prerequisites
- Node.js `v20+` or `v26+`
- PostgreSQL instance (Neon, Supabase, or local)

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Ensure `DATABASE_URL` and `DIRECT_URL` point to your PostgreSQL database.

### 4. Database Setup & Seed
```bash
# Generate Prisma Client
npm run db:generate

# Apply migrations
npm run db:migrate

# Seed demo users and catalog master data
npm run db:seed
```

### 5. Start Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 6. Run Automated Tests
```bash
npm test
```

---

## 📡 API Reference Summary (`/api/v1`)

### Auth & Users (M1)
- `POST /api/v1/auth/signup` — Register customer account (sets `bl_session` cookie)
- `POST /api/v1/auth/login` — Login with rate limiting (5 attempts/min)
- `POST /api/v1/auth/logout` — Clear session cookie
- `GET  /api/v1/auth/me` — Return authenticated user profile
- `POST /api/v1/auth/forgot-password` — Single-use hashed reset token, mock email
- `POST /api/v1/auth/reset-password` — Verify reset token and update password
- `POST /api/v1/users/staff` — Create staff account (`ADMIN` only)
- `GET  /api/v1/users` — List users (`ADMIN` only)
- `GET  /api/v1/customers` — List customers for dropdowns (`ADMIN`, `STAFF`)
- `POST /api/v1/customers` — Create customer profile (`ADMIN`, `STAFF`)

### Catalog & Master Data (M1)
- `GET, POST /api/v1/products` — Product catalog CRUD (`ADMIN` writes, `STAFF` reads)
- `GET, PATCH, DELETE /api/v1/products/:id` — Product detail, edit, soft archive
- `GET, POST /api/v1/products/:id/variants` — Product variants (+560 Odoo surcharge)
- `PATCH, DELETE /api/v1/variants/:id` — Variant update and archive
- `GET, POST /api/v1/plans` — Plans with lifecycle flags (`autoClose`, `canPause`, etc.)
- `GET, PATCH, DELETE /api/v1/plans/:id` — Plan detail, edit, archive
- `GET, POST /api/v1/templates` — Quotation templates
- `GET, PATCH, DELETE /api/v1/templates/:id` — Template detail, edit, archive
- `GET, POST /api/v1/taxes` — Tax rules (GST 5%, 12%, 18% default, 28%)
- `GET, PATCH, DELETE /api/v1/taxes/:id` — Tax rule edit and archive
- `GET, POST /api/v1/payment-terms` — Payment terms (Immediate, Net 15, Net 30, Net 60)
- `GET, PATCH, DELETE /api/v1/payment-terms/:id` — Payment term edit and archive

### Subscriptions & State Machine (M2)
- `GET, POST /api/v1/subscriptions` — List subscriptions (filtered, paginated) / Create from template or blank
- `GET, PATCH /api/v1/subscriptions/:id` — Detail view with `allowedTransitions` / Edit lines in DRAFT
- `POST /api/v1/subscriptions/:id/transition` — State machine transition (`DRAFT` → `QUOTATION` → `CONFIRMED` → `ACTIVE` → `CLOSED`, plus `PAUSED`)
- `POST /api/v1/subscriptions/:id/renew` — Contract renewal extending expiry by billing interval

### Discounts & Pricing (M2)
- `GET, POST /api/v1/discounts` — List discounts / Create percent or fixed discounts with thresholds and caps
- `GET, PATCH, DELETE /api/v1/discounts/:id` — Discount details, field updates, archive

### Billing Day & Invoicing (M2)
- `POST /api/v1/billing/run` — Idempotent batch billing run for active subscriptions up to `asOfDate`
- `POST /api/v1/billing/auto-close` — Sweep and auto-close expired contracts based on plan policy
- `GET  /api/v1/invoices` — List generated invoices (status, overdue badge, balance due)
- `GET  /api/v1/invoices/:id` — Invoice detail view with line totals, tax breakdown, and payments
- `POST /api/v1/invoices/:id/confirm` — Move invoice from `DRAFT` to `CONFIRMED`
- `POST /api/v1/invoices/:id/cancel` — Cancel confirmed invoice (guarded against paid invoices)
- `POST /api/v1/invoices/:id/send` — Mark invoice sent and dispatch mock customer email
- `GET  /api/v1/invoices/:id/print` — Formatted printable invoice structure

### Payments & Dashboard (M4)
- `POST /api/v1/payments` — Record payment on confirmed invoice; auto-flips to `PAID` when balance is 0
- `GET  /api/v1/dashboard/summary` — Fast SQL analytics (`COUNT/SUM ... FILTER`): active subs, revenue, outstanding, overdue, and charts

### System & Diagnostics
- `GET /api/v1/health` — Database and system health check
- `GET /api/v1/dev/mailbox` — In-browser mailbox showing mocked emails

---

## 🏛️ Architecture Summary

```
src/
├── app/
│   ├── (auth)/                  # Auth UI: Login, Signup, Forgot, Reset
│   ├── (app)/                   # ERP UI: Dashboard, Subscriptions, Invoices, Admin
│   ├── api/v1/                  # Next.js App Router REST API endpoints
│   └── print/invoice/[id]       # Print-to-PDF invoice template
├── components/
│   ├── shared/                  # AppShell, DataTable, StatusRibbon, BillingModal, PricePreview
│   └── ui/                      # shadcn/ui primitives (Button, Card, Input, Modal, Toast)
├── features/                    # Rich feature forms (Products, Plans, Discounts, Payments)
├── lib/
│   ├── state-machine.ts         # Pure domain state machine (zero I/O, strict transitions)
│   ├── db.ts                    # Prisma Client singleton
│   ├── dates.ts                 # Anchor date math (prevents month-end drift)
│   ├── money.ts                 # Decimal(12,2) half-up rounders
│   └── sequences.ts             # Atomic row-locked SUB-xxxxx and INV-xxxxx generators
└── server/
    ├── billing/                 # BillingService (batch runs, idempotency, locks) & InvoiceService
    ├── discounts/               # DiscountEngine (winner selection, thresholds, exhaustion)
    ├── pricing/                 # PricingEngine (line totals, tax aggregation)
    └── subscriptions/           # SubscriptionService (lifecycle orchestration)
```

---

## 🚀 Deployment to Vercel

Brightloop is fully configured for continuous deployment on **Vercel**:
1. Connect your GitHub repository to Vercel.
2. Select **Next.js** framework preset.
3. Configure Environment Variables in Project Settings:
   - `DATABASE_URL`: Your pooled PostgreSQL connection string (Supabase/Neon, Port 6543/5432).
   - `DIRECT_URL`: Direct database connection string (Port 5432) for migrations.
   - `JWT_SECRET`: Random 32+ character hex or base64 secret string.
   - `APP_URL`: Your deployed production URL (e.g., `https://brightloop.vercel.app`).
   - `MAIL_MOCK`: `true`
4. Build command: `npm run build`
5. Output directory: `.next`

---

## 🎬 5-Minute Demo Script

1. **Sign Up (`/signup`)**: Register a customer with email and password (observe live policy checklist: 9+ chars, upper, lower, special).
2. **Admin Catalog (`/products`, `/plans`)**: Create a product with `Brand = Odoo` variant (+₹560 surcharge). Notice the live **Price Preview** widget!
3. **Quotation & Subscription (`/subscriptions`)**: Create a subscription quote from a template. Move: `DRAFT` → `QUOTATION` → `CONFIRMED` → `ACTIVE`. Observe the **Status Ribbon** progress.
4. **Billing Day Batch (`/invoices`)**: Click **Run Daily Billing Batch**, pick next month's date, and run. Notice invoice created! **Click it again** for the exact same date: the engine skips it gracefully (`created: 0, skipped: N`) demonstrating total idempotency.
5. **Invoice Inspection & Print (`/invoices/:id`)**: Confirm the invoice, view discount + GST 18% calculation, and click **Print / PDF**.
6. **Payment Recording**: Click **Record Payment**, record a partial payment (status remains `CONFIRMED`), then pay remainder (status flips to `PAID`).
7. **Finance Dashboard (`/dashboard`)**: View real-time KPI cards, monthly revenue chart, and filter overdue invoices.
8. **Customer Portal**: Sign in as `customer@brightloop.io` — sidebar restricts administrative tabs and displays only customer-owned subscriptions and invoices.
