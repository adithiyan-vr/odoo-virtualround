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

### System & Diagnostics
- `GET /api/v1/health` — Database and system health check
- `GET /api/v1/dev/mailbox` — In-browser mailbox showing mocked emails
