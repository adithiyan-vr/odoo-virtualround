# Brightloop — API Reference (v1)

> Base URL: `/api/v1` · Format: JSON · Auth: JWT in httpOnly cookie `bl_token` (or `Authorization: Bearer <jwt>` for Postman/Swagger testing)
> Frontend devs: build against the **example responses** below until the real endpoint ships.

---

## 0. Conventions

### Roles
`ADMIN` · `STAFF` · `CUSTOMER` — shown as **Access** on each endpoint. `Public` = no login.
Customers are automatically restricted to rows where `customer_id = their user id`.

### Success shape
```json
{ "data": { ... } }
{ "data": [ ... ], "meta": { "page": 1, "pageSize": 25, "total": 5000, "totalPages": 200 } }
```

### Error shape
```json
{ "error": { "code": "VALIDATION_ERROR", "message": "Password must contain an uppercase letter", "details": [{ "field": "password", "issue": "..." }] } }
```

| HTTP | Code | Meaning |
|------|------|---------|
| 400 | `VALIDATION_ERROR` | Bad input (zod failed) |
| 401 | `UNAUTHENTICATED` | Missing/invalid token |
| 403 | `FORBIDDEN` | Role not allowed |
| 404 | `NOT_FOUND` | Record missing / not yours |
| 409 | `CONFLICT` | Duplicate email, illegal state transition, duplicate billing cycle |
| 422 | `BUSINESS_RULE` | Plan doesn't allow pause, discount exhausted, overpayment, etc. |
| 429 | `RATE_LIMITED` | Too many login attempts |
| 500 | `INTERNAL` | Unexpected |

### Pagination & filtering (all list endpoints)
`?page=1&pageSize=25&sort=createdAt:desc&q=search` · `pageSize` max 100 · plus resource-specific filters.

### Enums
```
Role:            ADMIN | STAFF | CUSTOMER
ProductType:     SERVICE | STORABLE
BillingInterval: DAILY | WEEKLY | MONTHLY | YEARLY
SubStatus:       DRAFT | QUOTATION | CONFIRMED | ACTIVE | PAUSED | CLOSED
InvoiceStatus:   DRAFT | CONFIRMED | PAID | CANCELLED
DiscountType:    FIXED | PERCENT
DiscountScope:   PRODUCT | SUBSCRIPTION
PaymentMethod:   BANK | CARD | CASH
```

---

## 1. Auth & Users (M1) — Module 1

### POST `/auth/signup` · Public
Creates a `CUSTOMER` account.
```json
// Request
{ "name": "Asha K", "email": "asha@shop.com", "password": "Strong#Pass1" }
// 201
{ "data": { "id": "uuid", "email": "asha@shop.com", "role": "CUSTOMER" } }
```
Rules: email unique (`409` if taken); password regex `^(?=.*[a-z])(?=.*[A-Z])(?=.*[^A-Za-z0-9]).{9,}$`.

### POST `/auth/login` · Public
```json
{ "email": "admin@brightloop.io", "password": "..." }
// 200 (sets cookie)
{ "data": { "user": { "id": "uuid", "name": "Admin", "role": "ADMIN" } } }
```

### POST `/auth/logout` · Any logged-in
Clears cookie. `204`.

### GET `/auth/me` · Any logged-in
Returns current user `{ id, name, email, role }`.

### POST `/auth/forgot-password` · Public
```json
{ "email": "asha@shop.com" }
// 200 always (do not reveal whether email exists)
{ "data": { "message": "If the account exists, a reset link has been sent." } }
```
Server creates a random token, stores its **hash**, 30-minute expiry, single use. Email is mocked: link is printed to server log / shown on `/dev/mailbox` page.

### POST `/auth/reset-password` · Public
```json
{ "token": "raw-token-from-link", "newPassword": "NewStrong#2" }
```
`422` if token expired/used. Same password regex applies.

### POST `/users/staff` · ADMIN
Create internal staff.
```json
{ "name": "Ravi", "email": "ravi@brightloop.io", "password": "Staff#Pass1" }
```

### GET `/users` · ADMIN — list users (`?role=STAFF`)
### GET `/customers` · ADMIN, STAFF — customer list for dropdowns (`?q=`)

---

## 2. Catalog (M1) — Module 2

### Products
| Method | Path | Access |
|--------|------|--------|
| GET | `/products` | ADMIN, STAFF |
| GET | `/products/:id` | ADMIN, STAFF |
| POST | `/products` | ADMIN |
| PATCH | `/products/:id` | ADMIN |
| DELETE | `/products/:id` | ADMIN (soft delete if used) |

```json
// POST /products
{ "name": "Brightloop CRM", "type": "SERVICE", "salesPrice": 1000.00, "costPrice": 400.00, "notes": "Core CRM suite" }
```

### Variants
| Method | Path | Access |
|--------|------|--------|
| GET | `/products/:id/variants` | ADMIN, STAFF |
| POST | `/products/:id/variants` | ADMIN |
| PATCH | `/variants/:id` | ADMIN |
| DELETE | `/variants/:id` | ADMIN |

```json
{ "attributeName": "Brand", "attributeValue": "Odoo", "priceSurcharge": 560.00 }
```
Effective price = `product.salesPrice + variant.priceSurcharge` → `1560.00`.

### Plans
| Method | Path | Access |
|--------|------|--------|
| GET | `/plans` | ADMIN, STAFF (customers: only available plans) |
| POST | `/plans` | ADMIN |
| PATCH | `/plans/:id` | ADMIN |
| DELETE | `/plans/:id` | ADMIN |

```json
{
  "name": "Pro Monthly",
  "billingInterval": "MONTHLY",
  "price": 1500.00,
  "minQty": 1,
  "validFrom": "2026-11-01",
  "validTo": "2027-10-31",
  "autoClose": true,
  "canCloseEarly": true,
  "canPause": true,
  "canRenew": true
}
```

### Quotation Templates
| Method | Path | Access |
|--------|------|--------|
| GET | `/templates` | ADMIN, STAFF |
| POST | `/templates` | ADMIN |
| PATCH | `/templates/:id` | ADMIN |
| DELETE | `/templates/:id` | ADMIN |

```json
{
  "name": "Enterprise Starter",
  "planId": "uuid",
  "validityDays": 30,
  "lines": [{ "productId": "uuid", "variantId": "uuid|null", "quantity": 10 }]
}
```

### Tax Rules
`GET/POST/PATCH/DELETE /taxes` — GET: ADMIN, STAFF · writes: ADMIN
```json
{ "name": "GST 18%", "ratePercent": 18.0, "appliesTo": "ALL", "isActive": true }
```

---

## 3. Discounts (M2) — Module 5

| Method | Path | Access |
|--------|------|--------|
| GET | `/discounts` | ADMIN |
| POST | `/discounts` | ADMIN |
| PATCH | `/discounts/:id` | ADMIN |
| DELETE | `/discounts/:id` | ADMIN |

```json
{
  "name": "Bulk 10%",
  "type": "PERCENT",
  "value": 10,
  "minPurchase": 5000,
  "minQty": 5,
  "startDate": "2026-11-01",
  "endDate": "2026-12-31",
  "maxUses": 100,
  "scope": "SUBSCRIPTION",
  "targetProductId": null
}
```
Response includes `currentUses` and computed `isActive` (false once expired or `currentUses >= maxUses`).
Staff attach a discount to a subscription via `PATCH /subscriptions/:id { "discountId": "uuid" }`.

---

## 4. Subscriptions (M2) — Module 3

| Method | Path | Access |
|--------|------|--------|
| GET | `/subscriptions` | ADMIN, STAFF (all) · CUSTOMER (own) |
| GET | `/subscriptions/:id` | same scoping |
| POST | `/subscriptions` | ADMIN, STAFF |
| PATCH | `/subscriptions/:id` | ADMIN, STAFF (only in DRAFT/QUOTATION) |
| POST | `/subscriptions/:id/transition` | ADMIN, STAFF (CUSTOMER limited, see below) |

List filters: `?status=ACTIVE&planId=&customerId=&from=&to=&q=SUB-0001`

### Create (from template or blank)
```json
{
  "customerId": "uuid",
  "templateId": "uuid|null",
  "planId": "uuid",
  "startDate": "2026-11-01",
  "expiryDate": "2027-10-31",
  "paymentTerms": "NET_15",
  "lines": [{ "productId": "uuid", "variantId": "uuid|null", "quantity": 10, "taxId": "uuid|null" }]
}
```
```json
// 201
{
  "data": {
    "id": "uuid", "subNumber": "SUB-00042", "status": "DRAFT",
    "customer": { "id": "uuid", "name": "Asha K" },
    "plan": { "id": "uuid", "name": "Pro Monthly", "billingInterval": "MONTHLY" },
    "startDate": "2026-11-01", "expiryDate": "2027-10-31", "nextBillingDate": null,
    "lines": [{ "productName": "Brightloop CRM", "variant": "Brand: Odoo", "quantity": 10,
                "unitPrice": 1560.00, "taxRate": 18.0, "subtotal": 15600.00 }],
    "totals": { "subtotal": 15600.00, "tax": 2808.00, "total": 18408.00 },
    "allowedTransitions": ["QUOTATION"]
  }
}
```

### Transition
```json
POST /subscriptions/:id/transition
{ "to": "CONFIRMED" }
```
Allowed map:

| From | To |
|------|----|
| DRAFT | QUOTATION |
| QUOTATION | CONFIRMED, DRAFT |
| CONFIRMED | ACTIVE |
| ACTIVE | PAUSED*, CLOSED* |
| PAUSED | ACTIVE |

\* only if plan flag allows (`canPause` / `canCloseEarly`) → else `422 BUSINESS_RULE`.
Illegal jump (e.g. DRAFT → ACTIVE) → `409 CONFLICT` with `allowedTransitions` in details.
Activating sets `nextBillingDate = startDate`. Quotation past `validityDays` cannot be confirmed.
`CUSTOMER` may only request `PAUSED` or `CLOSED` on their own subscription when the plan allows.

### POST `/subscriptions/:id/renew` · ADMIN, STAFF (plan `canRenew`)
Extends `expiryDate` by one term.

### POST `/billing/auto-close` · ADMIN
Closes ACTIVE/PAUSED subscriptions past expiry whose plan has `autoClose = true`.

---

## 5. Billing Day & Invoices (M2) — Module 4

### POST `/billing/run` · ADMIN, STAFF
The hero endpoint — "Run Daily Billing Batch".
```json
{ "asOfDate": "2026-12-01" }       // defaults to today
```
```json
// 200
{
  "data": {
    "asOfDate": "2026-12-01",
    "eligible": 42, "created": 42, "skipped": 0, "failed": 0,
    "durationMs": 240,
    "invoices": ["INV-00101", "INV-00102"]
  }
}
```
Logic per eligible subscription (`status=ACTIVE AND nextBillingDate <= asOfDate`), in its own transaction:
1. Build lines from subscription lines · 2. Evaluate & apply discount · 3. Apply tax · 4. Insert invoice `DRAFT` with `billingCycleDate = nextBillingDate` · 5. Advance `nextBillingDate` by plan interval · 6. `discount.currentUses += 1`.

Calling it again with the same date returns `created: 0, skipped: N` thanks to `UNIQUE(subscription_id, billing_cycle_date)`.

### Invoices
| Method | Path | Access |
|--------|------|--------|
| GET | `/invoices` | ADMIN, STAFF · CUSTOMER (own) |
| GET | `/invoices/:id` | same scoping |
| POST | `/invoices/:id/confirm` | ADMIN, STAFF (DRAFT → CONFIRMED) |
| POST | `/invoices/:id/cancel` | ADMIN, STAFF (DRAFT/CONFIRMED with no payments) |
| POST | `/invoices/:id/send` | ADMIN, STAFF (emails customer — mocked) |
| GET | `/invoices/:id/print` | all scoped (returns print-ready data; UI page `/invoices/:id/print`) |

List filters: `?status=CONFIRMED&overdue=true&customerId=&subscriptionId=&from=&to=`

```json
// GET /invoices/:id
{
  "data": {
    "id": "uuid", "invoiceNumber": "INV-00101", "status": "CONFIRMED",
    "customer": { "name": "Asha K", "email": "asha@shop.com" },
    "subscription": { "subNumber": "SUB-00042" },
    "billingCycleDate": "2026-12-01", "dueDate": "2026-12-16",
    "lines": [{ "description": "Brightloop CRM (Brand: Odoo)", "quantity": 10, "unitPrice": 1560.00, "taxRate": 18, "amount": 15600.00 }],
    "subtotal": 15600.00, "discountAmount": 1560.00, "taxAmount": 2527.20, "totalAmount": 16567.20,
    "paidAmount": 0, "balanceDue": 16567.20, "isOverdue": false,
    "allowedActions": ["cancel", "send"]
  }
}
```

---

## 6. Payments (M4) — Module 6

| Method | Path | Access |
|--------|------|--------|
| POST | `/payments` | ADMIN, STAFF |
| GET | `/payments` | ADMIN, STAFF (`?invoiceId=&method=&from=&to=`) |
| GET | `/invoices/:id/payments` | scoped |

```json
// POST /payments
{ "invoiceId": "uuid", "method": "BANK", "amount": 16567.20, "paymentDate": "2026-12-10", "note": "Ref TXN-88231" }
// 201
{ "data": { "id": "uuid", "invoiceStatus": "PAID", "balanceDue": 0 } }
```
Rules: invoice must be `CONFIRMED` · `amount > 0` · `amount ≤ balanceDue` (`422` on overpay) · when sum(payments) = total → invoice becomes `PAID` automatically.

---

## 7. Finance Dashboard (M4) — Module 7

All endpoints: **ADMIN, STAFF** (finance lead = ADMIN or STAFF). Must respond in **< 2 s** on 5,000+ subscriptions.

Common filters: `?from=2026-01-01&to=2026-12-31&planId=&customerId=&status=`

### GET `/dashboard/summary`
```json
{
  "data": {
    "activeSubscriptions": 3120,
    "revenueCollected": 4820000.00,
    "outstandingAmount": 912500.00,
    "overdueCount": 87,
    "overdueAmount": 214300.00,
    "generatedInMs": 38
  }
}
```
Backed by a single SQL query using `COUNT(*) FILTER` / `SUM(...) FILTER`.

### GET `/dashboard/revenue-monthly`
```json
{ "data": [ { "month": "2026-09", "collected": 410000.00, "invoiced": 520000.00 } ] }
```
### GET `/dashboard/subscription-status`
```json
{ "data": [ { "status": "ACTIVE", "count": 3120 }, { "status": "PAUSED", "count": 210 } ] }
```
### GET `/dashboard/overdue` — paginated overdue invoices (`due_date < today AND status != PAID`)
### GET `/dashboard/payments-recent` — latest payments, paginated

---

## 8. Customer Portal (M4)

Thin wrappers that always scope to the logged-in customer.

| Method | Path | Description |
|--------|------|-------------|
| GET | `/portal/subscriptions` | Own subscriptions |
| GET | `/portal/subscriptions/:id` | Detail + plan policy flags |
| POST | `/portal/subscriptions/:id/request` | `{ "action": "PAUSE" \| "CLOSE" }` (if plan allows) |
| GET | `/portal/invoices` | Own invoices (`?status=`) |
| GET | `/portal/invoices/:id` | Detail / print data |

Access to another customer's record returns `404` (not `403`) to avoid leaking existence.

---

## 9. Dev & Utility

| Method | Path | Access | Purpose |
|--------|------|--------|---------|
| GET | `/health` | Public | `{ "status": "ok", "db": "up" }` |
| GET | `/dev/mailbox` | ADMIN (dev only) | Shows mocked emails (reset links, invoices) |

---

## 10. Quick cURL Samples

```bash
# Login
curl -i -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@brightloop.io","password":"Admin#12345"}'

# Run billing (cookie jar)
curl -b cookies.txt -X POST http://localhost:3000/api/v1/billing/run \
  -H "Content-Type: application/json" -d '{"asOfDate":"2026-12-01"}'

# Dashboard
curl -b cookies.txt "http://localhost:3000/api/v1/dashboard/summary?from=2026-01-01"
```

---

## 11. Endpoint Ownership Summary

| Area | Owner |
|------|-------|
| `/auth`, `/users`, `/customers`, `/products`, `/variants`, `/plans`, `/templates`, `/taxes` | **M1** |
| `/subscriptions`, `/billing`, `/invoices`, `/discounts` | **M2** |
| UI consuming all of the above | **M3** |
| `/payments`, `/dashboard`, `/portal`, seed | **M4** |
