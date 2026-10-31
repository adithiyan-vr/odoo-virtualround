# Brightloop — Database, Data & Integrations Guide

| | |
|---|---|
| **Version** | 1.0 · 31 Oct 2026 |
| **Engine** | PostgreSQL (Neon or Supabase) |
| **ORM** | Prisma (+ raw SQL for aggregates) |
| **Schema owner** | **Member 1** — nobody else edits `prisma/schema.prisma` (open a PR request instead) |
| **Related** | [ARCHITECTURE](ARCHITECTURE.md) · [API](API.md) · [PRD](PRD.md) · [MEMBERS](MEMBERS.md) |

This file covers three things: **(A)** the data model, **(B)** data operations (queries, seed, migrations), and **(C)** where passwords, secrets and integrations live and how to handle them.

---

# Part A — Data Model

## 1. Conventions

| Topic | Rule |
|---|---|
| Primary keys | `UUID` (`@default(uuid())`, `@db.Uuid`) |
| Table / column names | Prisma models are `PascalCase`/`camelCase`; DB uses **snake_case** via `@@map` / `@map` so raw SQL is readable |
| Money | `DECIMAL(12,2)`; tax rate `DECIMAL(5,2)`; never `FLOAT` |
| Business dates | `DATE` (`@db.Date`) — start/expiry/invoice/due/payment dates |
| Timestamps | `created_at`, `updated_at` (`TIMESTAMPTZ`) on mutable tables |
| Deletion | Referenced master data is **archived** (`is_active = false`), not deleted. Transactional data is never deleted (cancel/void instead) |
| Emails | Stored lower-case; also guarded by a `lower(email)` unique index |
| Enums | Native Postgres enums via Prisma |
| Actors | `created_by` / `recorded_by` store the acting user for traceability |

## 2. Entity-Relationship Diagram

```mermaid
erDiagram
  USERS ||--o| CUSTOMERS : "login profile"
  USERS ||--o{ PASSWORD_RESET_TOKENS : has
  CUSTOMERS ||--o{ SUBSCRIPTIONS : holds
  CUSTOMERS ||--o{ INVOICES : billed
  PLANS ||--o{ SUBSCRIPTIONS : "billed by"
  PLANS ||--o{ QUOTATION_TEMPLATES : "default plan"
  QUOTATION_TEMPLATES ||--o{ QUOTATION_TEMPLATE_LINES : contains
  QUOTATION_TEMPLATES ||--o{ SUBSCRIPTIONS : "started from"
  PAYMENT_TERMS ||--o{ SUBSCRIPTIONS : governs
  DISCOUNTS ||--o{ SUBSCRIPTIONS : "attached to"
  DISCOUNTS ||--o{ DISCOUNT_PRODUCTS : scopes
  PRODUCTS ||--o{ DISCOUNT_PRODUCTS : "target of"
  PRODUCTS ||--o{ PRODUCT_VARIANTS : "offered as"
  PRODUCTS ||--o{ SUBSCRIPTION_LINES : "sold in"
  PRODUCT_VARIANTS ||--o{ SUBSCRIPTION_LINES : "selected as"
  TAXES ||--o{ PRODUCTS : "default for"
  TAXES ||--o{ SUBSCRIPTION_LINES : "applied to"
  SUBSCRIPTIONS ||--|{ SUBSCRIPTION_LINES : has
  SUBSCRIPTIONS ||--o{ INVOICES : generates
  BILLING_RUNS ||--o{ INVOICES : produced
  INVOICES ||--|{ INVOICE_LINES : has
  INVOICES ||--o{ INVOICE_DISCOUNTS : "applied"
  DISCOUNTS ||--o{ INVOICE_DISCOUNTS : "used in"
  INVOICES ||--o{ PAYMENTS : "settled by"
  USERS ||--o{ AUDIT_LOGS : performs
```

## 3. Prisma Schema (`prisma/schema.prisma`)

> Generator/datasource lines depend on the Prisma major version you install (`npx prisma init` shows the right form). Keep everything from `enum` downward as is.

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")   // pooled connection (runtime)
  directUrl = env("DIRECT_URL")     // direct connection (migrations)
}

// ───────────────────────── Enums ─────────────────────────
enum Role               { ADMIN STAFF CUSTOMER }
enum ProductType        { SERVICE STORABLE }
enum BillingInterval    { DAILY WEEKLY MONTHLY YEARLY }
enum SubscriptionStatus { DRAFT QUOTATION CONFIRMED ACTIVE PAUSED CLOSED }
enum CloseReason        { MANUAL CUSTOMER_REQUEST EXPIRED PLAN_ENDED CANCELLED }
enum InvoiceStatus      { DRAFT CONFIRMED PAID CANCELLED }
enum DiscountType       { FIXED PERCENT }
enum DiscountScope      { PRODUCT SUBSCRIPTION }
enum PaymentMethod      { BANK_TRANSFER CARD CASH UPI CHEQUE OTHER }
enum BillingRunStatus   { RUNNING COMPLETED PARTIAL FAILED }
enum EmailStatus        { SENT FAILED }

// ───────────────────── Identity & access ─────────────────────
model User {
  id           String    @id @default(uuid()) @db.Uuid
  email        String    @unique
  passwordHash String    @map("password_hash")        // bcrypt, cost 12 — NEVER plaintext
  name         String
  role         Role      @default(CUSTOMER)
  isActive     Boolean   @default(true) @map("is_active")
  lastLoginAt  DateTime? @map("last_login_at")
  createdAt    DateTime  @default(now()) @map("created_at")
  updatedAt    DateTime  @updatedAt @map("updated_at")

  customer             Customer?
  resetTokens          PasswordResetToken[]
  subscriptionsCreated Subscription[] @relation("SubscriptionCreatedBy")
  paymentsRecorded     Payment[]      @relation("PaymentRecordedBy")
  billingRuns          BillingRun[]
  auditLogs            AuditLog[]

  @@index([role])
  @@map("users")
}

model PasswordResetToken {
  id        String    @id @default(uuid()) @db.Uuid
  userId    String    @map("user_id") @db.Uuid
  tokenHash String    @unique @map("token_hash")      // SHA-256 of the emailed token
  expiresAt DateTime  @map("expires_at")
  usedAt    DateTime? @map("used_at")
  ipAddress String?   @map("ip_address")
  createdAt DateTime  @default(now()) @map("created_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@map("password_reset_tokens")
}

model Customer {
  id           String   @id @default(uuid()) @db.Uuid
  userId       String?  @unique @map("user_id") @db.Uuid   // null until the customer signs up
  name         String
  company      String?
  email        String   @unique
  phone        String?
  addressLine1 String?  @map("address_line1")
  addressLine2 String?  @map("address_line2")
  city         String?
  state        String?
  postalCode   String?  @map("postal_code")
  country      String   @default("IN")
  gstin        String?
  notes        String?
  isActive     Boolean  @default(true) @map("is_active")
  createdAt    DateTime @default(now()) @map("created_at")
  updatedAt    DateTime @updatedAt @map("updated_at")

  user          User?          @relation(fields: [userId], references: [id], onDelete: SetNull)
  subscriptions Subscription[]
  invoices      Invoice[]

  @@index([name])
  @@map("customers")
}

// ───────────────────── Catalog & configuration ─────────────────────
model Tax {
  id          String   @id @default(uuid()) @db.Uuid
  name        String                                   // e.g. "GST 18%"
  ratePercent Decimal  @map("rate_percent") @db.Decimal(5, 2)
  isDefault   Boolean  @default(false) @map("is_default")
  isActive    Boolean  @default(true) @map("is_active")
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  products          Product[]
  subscriptionLines SubscriptionLine[]

  @@map("taxes")
}

model PaymentTerm {
  id        String   @id @default(uuid()) @db.Uuid
  name      String                                     // "Net 30"
  days      Int
  isDefault Boolean  @default(false) @map("is_default")
  isActive  Boolean  @default(true) @map("is_active")
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  subscriptions Subscription[]

  @@map("payment_terms")
}

model Product {
  id           String      @id @default(uuid()) @db.Uuid
  sku          String      @unique
  name         String
  type         ProductType @default(SERVICE)
  salesPrice   Decimal     @map("sales_price") @db.Decimal(12, 2)
  costPrice    Decimal     @map("cost_price") @db.Decimal(12, 2)
  notes        String?
  defaultTaxId String?     @map("default_tax_id") @db.Uuid
  isActive     Boolean     @default(true) @map("is_active")
  createdAt    DateTime    @default(now()) @map("created_at")
  updatedAt    DateTime    @updatedAt @map("updated_at")

  defaultTax        Tax?                    @relation(fields: [defaultTaxId], references: [id], onDelete: SetNull)
  variants          ProductVariant[]
  templateLines     QuotationTemplateLine[]
  subscriptionLines SubscriptionLine[]
  discountProducts  DiscountProduct[]

  @@index([name])
  @@map("products")
}

model ProductVariant {
  id             String   @id @default(uuid()) @db.Uuid
  productId      String   @map("product_id") @db.Uuid
  attributeName  String   @map("attribute_name")       // "Brand"
  attributeValue String   @map("attribute_value")      // "Odoo"
  priceSurcharge Decimal  @default(0) @map("price_surcharge") @db.Decimal(12, 2) // +560.00 for Odoo
  isActive       Boolean  @default(true) @map("is_active")
  createdAt      DateTime @default(now()) @map("created_at")

  product           Product                 @relation(fields: [productId], references: [id], onDelete: Cascade)
  templateLines     QuotationTemplateLine[]
  subscriptionLines SubscriptionLine[]

  @@unique([productId, attributeName, attributeValue])
  @@map("product_variants")
}

model Plan {
  id              String          @id @default(uuid()) @db.Uuid
  name            String
  description     String?
  price           Decimal         @default(0) @db.Decimal(12, 2)   // plan fee per billing period (can be 0)
  billingInterval BillingInterval @map("billing_interval")
  minQuantity     Int             @default(1) @map("min_quantity")
  validFrom       DateTime        @map("valid_from") @db.Date
  validTo         DateTime?       @map("valid_to") @db.Date
  autoClose       Boolean         @default(false) @map("auto_close")
  canCloseEarly   Boolean         @default(true) @map("can_close_early")
  canPause        Boolean         @default(true) @map("can_pause")
  canRenew        Boolean         @default(true) @map("can_renew")
  isActive        Boolean         @default(true) @map("is_active")
  createdAt       DateTime        @default(now()) @map("created_at")
  updatedAt       DateTime        @updatedAt @map("updated_at")

  templates     QuotationTemplate[]
  subscriptions Subscription[]

  @@map("plans")
}

model QuotationTemplate {
  id           String   @id @default(uuid()) @db.Uuid
  name         String
  planId       String   @map("plan_id") @db.Uuid
  validityDays Int      @default(30) @map("validity_days")
  notes        String?
  isActive     Boolean  @default(true) @map("is_active")
  createdAt    DateTime @default(now()) @map("created_at")
  updatedAt    DateTime @updatedAt @map("updated_at")

  plan          Plan                    @relation(fields: [planId], references: [id])
  lines         QuotationTemplateLine[]
  subscriptions Subscription[]

  @@map("quotation_templates")
}

model QuotationTemplateLine {
  id         String  @id @default(uuid()) @db.Uuid
  templateId String  @map("template_id") @db.Uuid
  productId  String  @map("product_id") @db.Uuid
  variantId  String? @map("variant_id") @db.Uuid
  quantity   Int     @default(1)
  sortOrder  Int     @default(0) @map("sort_order")

  template QuotationTemplate @relation(fields: [templateId], references: [id], onDelete: Cascade)
  product  Product           @relation(fields: [productId], references: [id])
  variant  ProductVariant?   @relation(fields: [variantId], references: [id])

  @@index([templateId])
  @@map("quotation_template_lines")
}

model Discount {
  id          String        @id @default(uuid()) @db.Uuid
  name        String
  code        String?       @unique
  type        DiscountType
  value       Decimal       @db.Decimal(12, 2)                     // amount, or percent 0–100
  scope       DiscountScope
  minPurchase Decimal?      @map("min_purchase") @db.Decimal(12, 2)
  minQuantity Int?          @map("min_quantity")
  startDate   DateTime      @map("start_date") @db.Date
  endDate     DateTime?     @map("end_date") @db.Date
  maxUses     Int?          @map("max_uses")                       // null = unlimited
  currentUses Int           @default(0) @map("current_uses")
  autoApply   Boolean       @default(false) @map("auto_apply")
  isActive    Boolean       @default(true) @map("is_active")
  createdAt   DateTime      @default(now()) @map("created_at")
  updatedAt   DateTime      @updatedAt @map("updated_at")

  products         DiscountProduct[]
  subscriptions    Subscription[]
  invoiceDiscounts InvoiceDiscount[]

  @@index([isActive, startDate, endDate])
  @@map("discounts")
}

model DiscountProduct {
  discountId String @map("discount_id") @db.Uuid
  productId  String @map("product_id") @db.Uuid

  discount Discount @relation(fields: [discountId], references: [id], onDelete: Cascade)
  product  Product  @relation(fields: [productId], references: [id], onDelete: Cascade)

  @@id([discountId, productId])
  @@map("discount_products")
}

// ───────────────────── Subscriptions ─────────────────────
model Subscription {
  id               String             @id @default(uuid()) @db.Uuid
  subNumber        String             @unique @map("sub_number")           // SUB-2026-00001
  customerId       String             @map("customer_id") @db.Uuid
  planId           String             @map("plan_id") @db.Uuid
  templateId       String?            @map("template_id") @db.Uuid
  discountId       String?            @map("discount_id") @db.Uuid        // manually attached discount
  paymentTermId    String             @map("payment_term_id") @db.Uuid
  status           SubscriptionStatus @default(DRAFT)
  quotationDate    DateTime?          @map("quotation_date") @db.Date
  validUntil       DateTime?          @map("valid_until") @db.Date
  startDate        DateTime           @map("start_date") @db.Date
  expiryDate       DateTime           @map("expiry_date") @db.Date
  billingAnchorDate DateTime?         @map("billing_anchor_date") @db.Date // cycle maths start (shifts on resume)
  billedCycles     Int                @default(0) @map("billed_cycles")
  nextBillingDate  DateTime?          @map("next_billing_date") @db.Date  // null once no more cycles
  pausedAt         DateTime?          @map("paused_at")
  closedAt         DateTime?          @map("closed_at")
  closeReason      CloseReason?       @map("close_reason")
  renewedFromId    String?            @map("renewed_from_id") @db.Uuid
  recurringSubtotal Decimal           @default(0) @map("recurring_subtotal") @db.Decimal(12, 2) // Σ line subtotals (ex-tax), used for MRR
  notes            String?
  createdById      String             @map("created_by_id") @db.Uuid
  createdAt        DateTime           @default(now()) @map("created_at")
  updatedAt        DateTime           @updatedAt @map("updated_at")

  customer    Customer           @relation(fields: [customerId], references: [id])
  plan        Plan               @relation(fields: [planId], references: [id])
  template    QuotationTemplate? @relation(fields: [templateId], references: [id], onDelete: SetNull)
  discount    Discount?          @relation(fields: [discountId], references: [id], onDelete: SetNull)
  paymentTerm PaymentTerm        @relation(fields: [paymentTermId], references: [id])
  createdBy   User               @relation("SubscriptionCreatedBy", fields: [createdById], references: [id])
  renewedFrom Subscription?      @relation("Renewal", fields: [renewedFromId], references: [id])
  renewals    Subscription[]     @relation("Renewal")
  lines       SubscriptionLine[]
  invoices    Invoice[]

  @@index([status])
  @@index([nextBillingDate])
  @@index([status, nextBillingDate])
  @@index([customerId])
  @@index([planId])
  @@index([expiryDate])
  @@index([createdAt])
  @@map("subscriptions")
}

model SubscriptionLine {
  id          String   @id @default(uuid()) @db.Uuid
  subscriptionId String @map("subscription_id") @db.Uuid
  productId   String?  @map("product_id") @db.Uuid       // null for the plan-fee line
  variantId   String?  @map("variant_id") @db.Uuid
  description String
  isPlanFee   Boolean  @default(false) @map("is_plan_fee")
  quantity    Int      @default(1)
  unitPrice   Decimal  @map("unit_price") @db.Decimal(12, 2)
  taxId       String?  @map("tax_id") @db.Uuid
  subtotal    Decimal  @db.Decimal(12, 2)                // quantity × unitPrice (ex-tax)
  sortOrder   Int      @default(0) @map("sort_order")

  subscription Subscription    @relation(fields: [subscriptionId], references: [id], onDelete: Cascade)
  product      Product?        @relation(fields: [productId], references: [id])
  variant      ProductVariant? @relation(fields: [variantId], references: [id])
  tax          Tax?            @relation(fields: [taxId], references: [id])

  @@index([subscriptionId])
  @@map("subscription_lines")
}

// ───────────────────── Billing, invoices, payments ─────────────────────
model BillingRun {
  id              String           @id @default(uuid()) @db.Uuid
  asOfDate        DateTime         @map("as_of_date") @db.Date
  autoConfirm     Boolean          @default(false) @map("auto_confirm")
  triggeredById   String           @map("triggered_by_id") @db.Uuid
  status          BillingRunStatus @default(RUNNING)
  dueCount        Int              @default(0) @map("due_count")
  invoicesCreated Int              @default(0) @map("invoices_created")
  skippedCount    Int              @default(0) @map("skipped_count")
  failedCount     Int              @default(0) @map("failed_count")
  durationMs      Int?             @map("duration_ms")
  errors          Json?
  startedAt       DateTime         @default(now()) @map("started_at")
  finishedAt      DateTime?        @map("finished_at")

  triggeredBy User      @relation(fields: [triggeredById], references: [id])
  invoices    Invoice[]

  @@index([startedAt])
  @@map("billing_runs")
}

model Invoice {
  id               String        @id @default(uuid()) @db.Uuid
  invoiceNumber    String        @unique @map("invoice_number")        // INV-2026-000001
  subscriptionId   String        @map("subscription_id") @db.Uuid
  customerId       String        @map("customer_id") @db.Uuid
  billingRunId     String?       @map("billing_run_id") @db.Uuid
  billingCycleDate DateTime      @map("billing_cycle_date") @db.Date  // start of the period covered (idempotency key)
  periodEnd        DateTime      @map("period_end") @db.Date
  status           InvoiceStatus @default(DRAFT)
  invoiceDate      DateTime      @map("invoice_date") @db.Date
  dueDate          DateTime      @map("due_date") @db.Date
  currency         String        @default("INR")
  // snapshots of customer details at invoicing time
  billToName       String        @map("bill_to_name")
  billToEmail      String        @map("bill_to_email")
  billToAddress    String?       @map("bill_to_address")
  billToGstin      String?       @map("bill_to_gstin")
  paymentTermName  String        @map("payment_term_name")
  // totals
  subtotal         Decimal       @db.Decimal(12, 2)                    // Σ gross line amounts
  discountAmount   Decimal       @default(0) @map("discount_amount") @db.Decimal(12, 2)
  taxAmount        Decimal       @map("tax_amount") @db.Decimal(12, 2)
  totalAmount      Decimal       @map("total_amount") @db.Decimal(12, 2)
  amountPaid       Decimal       @default(0) @map("amount_paid") @db.Decimal(12, 2)
  amountDue        Decimal       @map("amount_due") @db.Decimal(12, 2)
  confirmedAt      DateTime?     @map("confirmed_at")
  sentAt           DateTime?     @map("sent_at")
  paidAt           DateTime?     @map("paid_at") @db.Date
  cancelledAt      DateTime?     @map("cancelled_at")
  notes            String?
  createdAt        DateTime      @default(now()) @map("created_at")
  updatedAt        DateTime      @updatedAt @map("updated_at")

  subscription Subscription      @relation(fields: [subscriptionId], references: [id])
  customer     Customer          @relation(fields: [customerId], references: [id])
  billingRun   BillingRun?       @relation(fields: [billingRunId], references: [id])
  lines        InvoiceLine[]
  discounts    InvoiceDiscount[]
  payments     Payment[]

  // ★ NEVER TWICE: one invoice per subscription per billing cycle
  @@unique([subscriptionId, billingCycleDate], map: "unique_subscription_cycle")
  @@index([status])
  @@index([dueDate, status])
  @@index([customerId])
  @@index([subscriptionId])
  @@index([invoiceDate])
  @@index([status, invoiceDate])
  @@index([billingRunId])
  @@map("invoices")
}

model InvoiceLine {
  id                 String   @id @default(uuid()) @db.Uuid
  invoiceId          String   @map("invoice_id") @db.Uuid
  subscriptionLineId String?  @map("subscription_line_id") @db.Uuid   // reference only (no FK)
  productId          String?  @map("product_id") @db.Uuid              // reference only (no FK)
  description        String
  quantity           Int
  unitPrice          Decimal  @map("unit_price") @db.Decimal(12, 2)
  amount             Decimal  @db.Decimal(12, 2)                       // qty × unit (gross)
  discountAmount     Decimal  @default(0) @map("discount_amount") @db.Decimal(12, 2)
  taxableAmount      Decimal  @map("taxable_amount") @db.Decimal(12, 2)
  taxName            String?  @map("tax_name")                         // snapshot
  taxRate            Decimal  @default(0) @map("tax_rate") @db.Decimal(5, 2) // snapshot
  taxAmount          Decimal  @map("tax_amount") @db.Decimal(12, 2)
  lineTotal          Decimal  @map("line_total") @db.Decimal(12, 2)
  sortOrder          Int      @default(0) @map("sort_order")

  invoice Invoice @relation(fields: [invoiceId], references: [id], onDelete: Cascade)

  @@index([invoiceId])
  @@map("invoice_lines")
}

model InvoiceDiscount {
  id         String  @id @default(uuid()) @db.Uuid
  invoiceId  String  @map("invoice_id") @db.Uuid
  discountId String  @map("discount_id") @db.Uuid
  amount     Decimal @db.Decimal(12, 2)

  invoice  Invoice  @relation(fields: [invoiceId], references: [id], onDelete: Cascade)
  discount Discount @relation(fields: [discountId], references: [id])

  @@unique([invoiceId, discountId])
  @@map("invoice_discounts")
}

model Payment {
  id           String        @id @default(uuid()) @db.Uuid
  invoiceId    String        @map("invoice_id") @db.Uuid
  amount       Decimal       @db.Decimal(12, 2)
  method       PaymentMethod
  paymentDate  DateTime      @map("payment_date") @db.Date
  reference    String?
  note         String?
  isVoided     Boolean       @default(false) @map("is_voided")
  voidedAt     DateTime?     @map("voided_at")
  voidedById   String?       @map("voided_by_id") @db.Uuid
  recordedById String        @map("recorded_by_id") @db.Uuid
  createdAt    DateTime      @default(now()) @map("created_at")

  invoice    Invoice @relation(fields: [invoiceId], references: [id])
  recordedBy User    @relation("PaymentRecordedBy", fields: [recordedById], references: [id])

  @@index([invoiceId])
  @@index([paymentDate])
  @@index([isVoided, paymentDate])
  @@map("payments")
}

// ───────────────────── Platform tables ─────────────────────
model AuditLog {
  id        String   @id @default(uuid()) @db.Uuid
  actorId   String?  @map("actor_id") @db.Uuid
  entity    String                                   // "subscription" | "invoice" | "payment" | …
  entityId  String   @map("entity_id")
  action    String                                   // "confirm" | "void" | …
  meta      Json?
  createdAt DateTime @default(now()) @map("created_at")

  actor User? @relation(fields: [actorId], references: [id], onDelete: SetNull)

  @@index([entity, entityId])
  @@index([createdAt])
  @@map("audit_logs")
}

model NumberSequence {
  key       String @id                               // e.g. "SUB-2026", "INV-2026"
  nextValue Int    @default(1) @map("next_value")

  @@map("number_sequences")
}

model Setting {
  key       String   @id                             // "company", "invoice", "billing"
  value     Json
  updatedAt DateTime @updatedAt @map("updated_at")

  @@map("settings")
}

model EmailLog {
  id          String      @id @default(uuid()) @db.Uuid
  toEmail     String      @map("to_email")
  subject     String
  template    String                                  // "reset_password" | "invoice" | "quotation"
  html        String                                  // rendered body (shown in /dev/mailbox)
  status      EmailStatus
  transport   String                                  // "db" | "console" | "smtp"
  error       String?
  createdAt   DateTime    @default(now()) @map("created_at")

  @@index([createdAt])
  @@index([toEmail])
  @@map("email_logs")
}
```

## 4. Table Catalogue

| Table | Purpose | Owner (API) | Expected volume (demo) |
|---|---|---|---|
| `users` | Logins and roles | M1 | ~600 |
| `password_reset_tokens` | Single-use hashed reset tokens | M1 | tens |
| `customers` | Billing parties (with or without login) | M1 | ~600 |
| `taxes`, `payment_terms` | Admin rules | M1 | < 10 each |
| `products`, `product_variants` | Catalog and surcharges | M1 | ~10 / ~30 |
| `plans` | Billing cadence and lifecycle policy | M1 | ~6 |
| `quotation_templates`, `_lines` | Pre-packaged quotes | M2 | ~5 |
| `discounts`, `discount_products` | Rules engine data | M2 | ~6 |
| `subscriptions`, `subscription_lines` | Contracts and lines | M2 | **5,000 / ~15,000** |
| `billing_runs` | History of each Billing Day | M2 | tens |
| `invoices`, `invoice_lines`, `invoice_discounts` | Receivables ledger | M2 | **≈ 24,000 / ≈ 60,000 / thousands** |
| `payments` | Cash collected | M2 | ≈ 22,000 |
| `audit_logs` | Traceability | M2 / M1 | grows |
| `number_sequences`, `settings`, `email_logs` | Platform | M1 | small |

## 5. Constraints & Indexes beyond Prisma (`prisma/migrations/<timestamp>_extras/migration.sql`)

Create an empty migration (`prisma migrate dev --create-only --name extras`) and paste:

```sql
-- Case-insensitive unique email (belt and braces; app also lower-cases)
CREATE UNIQUE INDEX users_email_lower_key ON users (lower(email));

-- Domain checks
ALTER TABLE products          ADD CONSTRAINT chk_products_prices  CHECK (sales_price >= 0 AND cost_price >= 0);
ALTER TABLE product_variants  ADD CONSTRAINT chk_variant_surcharge CHECK (price_surcharge >= 0);
ALTER TABLE taxes             ADD CONSTRAINT chk_tax_rate         CHECK (rate_percent BETWEEN 0 AND 100);
ALTER TABLE payment_terms     ADD CONSTRAINT chk_term_days        CHECK (days >= 0);
ALTER TABLE plans             ADD CONSTRAINT chk_plan_price       CHECK (price >= 0);
ALTER TABLE plans             ADD CONSTRAINT chk_plan_minqty      CHECK (min_quantity >= 1);
ALTER TABLE plans             ADD CONSTRAINT chk_plan_dates       CHECK (valid_to IS NULL OR valid_to >= valid_from);
ALTER TABLE discounts         ADD CONSTRAINT chk_discount_value   CHECK (value > 0 AND (type <> 'PERCENT' OR value <= 100));
ALTER TABLE discounts         ADD CONSTRAINT chk_discount_dates   CHECK (end_date IS NULL OR end_date >= start_date);
ALTER TABLE discounts         ADD CONSTRAINT chk_discount_uses    CHECK (current_uses >= 0 AND (max_uses IS NULL OR current_uses <= max_uses));
ALTER TABLE subscriptions     ADD CONSTRAINT chk_sub_dates        CHECK (expiry_date > start_date);
ALTER TABLE subscription_lines ADD CONSTRAINT chk_sl_amounts      CHECK (quantity >= 1 AND unit_price >= 0);
ALTER TABLE invoices          ADD CONSTRAINT chk_inv_amounts      CHECK (
  total_amount >= 0 AND amount_paid >= 0 AND amount_paid <= total_amount
  AND amount_due = total_amount - amount_paid);
ALTER TABLE payments          ADD CONSTRAINT chk_payment_amount   CHECK (amount > 0);

-- Dashboard / overdue acceleration (partial index: only open receivables)
CREATE INDEX idx_invoices_overdue ON invoices (due_date)
  WHERE status = 'CONFIRMED' AND amount_due > 0;

-- Billing Day picker (only live subscriptions)
CREATE INDEX idx_subscriptions_billable ON subscriptions (next_billing_date)
  WHERE status = 'ACTIVE';

-- Optional (stretch): fast ILIKE search on customer names
-- CREATE EXTENSION IF NOT EXISTS pg_trgm;
-- CREATE INDEX idx_customers_name_trgm ON customers USING gin (name gin_trgm_ops);
```

> The blueprint's idempotency constraint is already created by Prisma as `unique_subscription_cycle` on `(subscription_id, billing_cycle_date)`.

## 6. Key Queries (raw SQL, pass `today` from the app — do not use `CURRENT_DATE`)

```sql
-- 1. Active subscriptions + MRR  (widget: KPI cards)
SELECT COUNT(*) AS active_count,
       COALESCE(SUM(s.recurring_subtotal * CASE p.billing_interval
         WHEN 'DAILY' THEN 30 WHEN 'WEEKLY' THEN 52.0/12
         WHEN 'MONTHLY' THEN 1 WHEN 'YEARLY' THEN 1.0/12 END), 0) AS mrr
FROM subscriptions s JOIN plans p ON p.id = s.plan_id
WHERE s.status = 'ACTIVE';

-- 2. Outstanding & overdue (current — ignore the date filter)
SELECT
  COALESCE(SUM(amount_due) FILTER (WHERE status = 'CONFIRMED'), 0)                              AS outstanding,
  COALESCE(SUM(amount_due) FILTER (WHERE status = 'CONFIRMED' AND due_date < $1), 0)            AS overdue_amount,
  COUNT(*)                 FILTER (WHERE status = 'CONFIRMED' AND amount_due > 0 AND due_date < $1) AS overdue_count
FROM invoices;

-- 3. Revenue collected & invoiced in a range
SELECT COALESCE(SUM(amount), 0) AS collected
FROM payments WHERE is_voided = false AND payment_date BETWEEN $1 AND $2;

SELECT COALESCE(SUM(total_amount), 0) AS invoiced
FROM invoices WHERE status IN ('CONFIRMED','PAID') AND invoice_date BETWEEN $1 AND $2;

-- 4. Revenue trend by month
SELECT date_trunc('month', payment_date)::date AS month, SUM(amount) AS collected
FROM payments WHERE is_voided = false AND payment_date BETWEEN $1 AND $2
GROUP BY 1 ORDER BY 1;

-- 5. Subscriptions by status (donut)
SELECT status, COUNT(*) FROM subscriptions GROUP BY status;

-- 6. Overdue list (paginated)
SELECT i.id, i.invoice_number, c.name AS customer, i.due_date, i.amount_due,
       ($1::date - i.due_date) AS days_overdue
FROM invoices i JOIN customers c ON c.id = i.customer_id
WHERE i.status = 'CONFIRMED' AND i.amount_due > 0 AND i.due_date < $1
ORDER BY i.due_date ASC LIMIT $2 OFFSET $3;

-- 7. Upcoming renewals (next 30 days)
SELECT s.id, s.sub_number, c.name, s.expiry_date, (s.expiry_date - $1::date) AS days_left
FROM subscriptions s JOIN customers c ON c.id = s.customer_id
WHERE s.status = 'ACTIVE' AND s.expiry_date BETWEEN $1 AND ($1::date + 30)
ORDER BY s.expiry_date LIMIT 25;

-- 8. Billing Day candidates
SELECT id FROM subscriptions
WHERE status = 'ACTIVE' AND next_billing_date <= $1
ORDER BY next_billing_date;

-- 9. Atomic discount usage (inside invoice transaction) — 0 rows ⇒ exhausted
UPDATE discounts SET current_uses = current_uses + 1
WHERE id = $1 AND is_active AND (max_uses IS NULL OR current_uses < max_uses)
RETURNING id;

-- 10. Atomic number sequence — 'SUB-2026' / 'INV-2026'
INSERT INTO number_sequences (key, next_value) VALUES ($1, 2)
ON CONFLICT (key) DO UPDATE SET next_value = number_sequences.next_value + 1
RETURNING next_value - 1 AS value;   -- first call returns 1
```
Verify each with `EXPLAIN (ANALYZE, BUFFERS)` on the seeded dataset; every one should use an index or be a single small scan.

---

# Part B — Data Operations

## 7. Seed Specification

Run order: `npm run db:seed` (M1 users + M4 catalog) → `npm run db:seed:volume` (M4). Use `faker.seed(2026)` so every machine gets the same data.

### 7.1 Demo accounts (**demo only — never reuse these passwords anywhere real**)

| Role | Email | Password |
|---|---|---|
| Admin | `admin@brightloop.io` | `Admin@12345` |
| Staff | `staff@brightloop.io` | `Staff@12345` |
| Customer | `customer@brightloop.io` | `Customer@12345` |

All three satisfy the password policy. The customer account is linked to a customer profile named *Acme Traders* that owns a handful of subscriptions in different states.

### 7.2 Master data

| Entity | Seed |
|---|---|
| **Taxes** | GST 5 %, GST 12 %, **GST 18 % (default)**, GST 28 %, Exempt 0 % |
| **Payment terms** | Immediate (0), Net 15, **Net 30 (default)**, Net 60 |
| **Products** | `BL-CRM` Brightloop CRM Seat (SERVICE, ₹1,200 / cost 400) · `BL-BILL` Billing Automation Suite (₹3,500 / 1,200) · `BL-ANL` Analytics Add-on (₹800 / 200) · `BL-SUP` Priority Support Pack (₹1,500 / 500) · `BL-POS` Brightloop POS Terminal (**STORABLE**, ₹14,999 / 9,500) |
| **Variants** | `BL-CRM`: Brand = Brightloop (+0), **Brand = Odoo (+560)**, Brand = Custom (+900) · `BL-POS`: Colour = Black (+0), Colour = White (+300) |
| **Plans** | see table below |
| **Discounts** | **Seat Saver** 10 % · PRODUCT (`BL-CRM`) · min qty 5 · auto-apply · **Welcome ₹500** fixed · SUBSCRIPTION · min purchase ₹5,000 · max 100 uses · code `WELCOME500` · **Yearly Loyalty** 15 % · SUBSCRIPTION · min purchase ₹20,000 · **Flash 20 %** (already expired, demonstrates "stops when expired") · **Limited 3** (max 3 uses, nearly exhausted — demonstrates depletion) |
| **Templates** | *Small Shop Starter* (Starter Monthly + 2 seats) · *Business Team Pack* (Business Monthly + 5 seats + Analytics) · *Enterprise Annual* (Enterprise Yearly + 25 seats + Priority Support) — validity 15 / 30 / 45 days |

**Plans**

| Plan | Interval | Fee | Min qty | Valid | Auto-close | Close early | Pause | Renew |
|---|---|--:|--:|---|:--:|:--:|:--:|:--:|
| Starter Monthly | MONTHLY | 499 | 1 | open | ✗ | ✓ | ✓ | ✓ |
| **Business Monthly** | MONTHLY | 1,499 | 5 | open | ✗ | ✓ | ✓ | ✓ |
| Business Yearly | YEARLY | 14,999 | 5 | open | ✓ | ✗ | ✗ | ✓ |
| Enterprise Yearly | YEARLY | 49,999 | 25 | open | ✗ | ✗ | ✗ | ✓ |
| Weekly Sprint | WEEKLY | 299 | 1 | ends in ~8 weeks | ✓ | ✓ | ✓ | ✓ |
| Daily Pass | DAILY | 49 | 1 | open | ✓ | ✓ | ✗ | ✗ |

This mix lets the demo show every policy flag and every billing interval.

### 7.3 Volume dataset (`SEED_VOLUME=5000`)

| Item | Target |
|---|---|
| Customers | 600 (3 demo + generated), users for ~100 of them |
| Subscriptions | **5,000** — status mix ≈ 62 % Active · 8 % Paused · 10 % Closed · 8 % Confirmed · 7 % Quotation · 5 % Draft; start dates spread over the last 12 months; 1–4 lines each |
| Invoices | **≈ 24,000** for Active/Paused/Closed subs, one per elapsed cycle, correct `billing_cycle_date`; status ≈ 70 % Paid · 15 % Confirmed-current · 8 % Overdue · 5 % Draft · 2 % Cancelled |
| Payments | ≈ 22,000 (≈ 5 % partial payments, mix of all methods) |
| Billing Day readiness | ~120 Active subscriptions with `next_billing_date` ≤ today + 30 days so the demo run creates visible invoices |

Seed with batched `createMany` (1,000 rows per batch), compute totals with the **same** pricing engine used in production, and finish by asserting `invoices.amount_due = total − amount_paid` for every row.

## 8. Migration Workflow (four people, one schema)

1. **Only M1 edits** `prisma/schema.prisma` and `prisma/migrations/**`. Need a column? Open an issue labelled `schema-request` with table, column, type, reason.
2. Each developer uses **their own database branch** (Neon branch or local Postgres). Never run `prisma db push` or `migrate reset` on the shared DB.
3. M1 creates migrations with `prisma migrate dev --name <what>`; commit migration folders; teammates pull and run `npm run db:migrate`.
4. Two migrations created in parallel? Last one merged re-bases: delete its folder, `git pull`, re-run `migrate dev`.
5. Preview/production use `prisma migrate deploy` only.
6. After a schema change post in the team channel and add a line to LOG.md §6 (*Schema change log*).

## 9. Reset, Backup, Hygiene
- `npm run db:reset` — dev only (drops, migrates, seeds).
- Before the demo: take a Neon branch snapshot of the seeded `main` DB; after rehearsals restore it.
- Never store card/bank details — payments keep only method, amount, date, reference text.
- Customer PII (email, phone, address, GSTIN) is limited to what invoices need; exports (CSV) require Admin/Staff.

---

# Part C — Passwords, Secrets & Integrations

## 10. What Is Stored Where

| Item | Stored in | Form | Notes |
|---|---|---|---|
| User passwords | `users.password_hash` | **bcrypt hash**, cost 12 | Never plaintext, never logged, never returned by any API |
| Password-reset tokens | `password_reset_tokens.token_hash` | SHA-256 hash | Raw token exists only in the emailed link |
| Session signing key | env `JWT_SECRET` | secret string (≥ 32 bytes) | Rotating it logs everyone out |
| DB connection strings | env `DATABASE_URL`, `DIRECT_URL` | secret | Provider dashboard is the source of truth |
| SMTP credentials (optional) | env `SMTP_*` | secret | Only if `EMAIL_TRANSPORT=smtp` |
| Sent emails (demo) | `email_logs.html` | rendered HTML | Contains reset links — non-prod only; `/dev/mailbox` is Admin-only and disabled in prod |
| Company profile, invoice footer, overdue policy | `settings` table | JSON | Not secret; editable by Admin |
| Audit trail | `audit_logs` | JSON meta | **Never put passwords/tokens in `meta`** |
| Number counters | `number_sequences` | int | Atomic |

## 11. Integration Registry

Fill the **Owner** and **Status** columns when each service is created. **Do not write secret values in this file or in LOG.md.**

| Service | Purpose | Env vars / config | Where configured | Owner | Status |
|---|---|---|---|---|---|
| **GitHub** | Shared repo, PRs, CI | Repo secrets (`DATABASE_URL_TEST` if integration tests run in CI) | Repo → Settings → Secrets | M1 | ☐ |
| **Neon / Supabase (PostgreSQL)** | Primary database; one branch per dev + `main` | `DATABASE_URL`, `DIRECT_URL` | Provider dashboard | M1 | ☐ |
| **Vercel** | Hosting, preview per PR, prod | All app env vars below | Vercel project → Settings → Environment Variables | M4 | ☐ |
| **Email transport** | Reset, invoice and quotation emails | `EMAIL_TRANSPORT`, `EMAIL_FROM`, `SMTP_*` | `.env.local` / Vercel | M1 | ☐ (`db` transport needs nothing) |
| **Mock payment gateway** | "Pay now" in portal | none (in-app simulator) | `payments.service` | M2 | ☐ |
| **Real gateway (stretch)** | Razorpay/Stripe **test mode** | `PAYMENT_GATEWAY_KEY`, `PAYMENT_GATEWAY_SECRET`, `PAYMENT_WEBHOOK_SECRET` | Vercel | M2 | ☐ not planned |
| **Analytics/monitoring (stretch)** | Error tracking | `SENTRY_DSN` | Vercel | M4 | ☐ not planned |

**Secret handling rules**
1. `.env`, `.env.local` are git-ignored. Only `.env.example` (placeholders) is committed.
2. Share real secrets through a private channel or password manager — never in commits, issues, PRs, screenshots or LOG.md.
3. If a secret is ever pushed: rotate it immediately, then note *"rotated X on <date>"* (no value) in LOG.md §11.
4. Production and development use **different** `JWT_SECRET` and databases.
5. Demo passwords in §7.1 exist only in seed scripts for the demo database.

## 12. `.env.example` (commit this; copy to `.env.local`)

```bash
# ── Database (use the provider's POOLED string for runtime, DIRECT for migrations) ──
DATABASE_URL="postgresql://USER:PASSWORD@HOST/DBNAME?sslmode=require"
DIRECT_URL="postgresql://USER:PASSWORD@HOST/DBNAME?sslmode=require"

# ── App ──
NODE_ENV="development"
APP_URL="http://localhost:3000"
APP_TIMEZONE="Asia/Kolkata"
APP_CURRENCY="INR"
TZ="UTC"                                  # keep process time in UTC so date maths never shifts

# ── Auth ──
JWT_SECRET="CHANGE_ME_generate_with_openssl_rand_base64_48"
SESSION_TTL_HOURS="8"
BCRYPT_COST="12"
PASSWORD_RESET_TTL_MINUTES="30"

# ── Email ──
EMAIL_TRANSPORT="db"                      # db | console | smtp
EMAIL_FROM="Brightloop <no-reply@brightloop.io>"
SMTP_HOST=""
SMTP_PORT="587"
SMTP_USER=""
SMTP_PASS=""

# ── Billing & paging ──
BILLING_MAX_CATCHUP_CYCLES="24"
BILLING_CHUNK_SIZE="50"
DEFAULT_PAGE_SIZE="25"
MAX_PAGE_SIZE="100"

# ── Demo / seed ──
SEED_VOLUME="5000"
ENABLE_DEV_MAILBOX="true"                 # set "false" in production
```

## 13. Data-Integrity Checklist (run before the demo)

- [ ] `SELECT subscription_id, billing_cycle_date, COUNT(*) FROM invoices GROUP BY 1,2 HAVING COUNT(*) > 1;` → **0 rows**
- [ ] `SELECT COUNT(*) FROM invoices WHERE amount_due <> total_amount - amount_paid;` → **0**
- [ ] `SELECT i.id FROM invoices i LEFT JOIN (SELECT invoice_id, SUM(amount) s FROM payments WHERE NOT is_voided GROUP BY 1) p ON p.invoice_id=i.id WHERE COALESCE(p.s,0) <> i.amount_paid;` → **0 rows**
- [ ] `SELECT COUNT(*) FROM subscriptions WHERE status IN ('DRAFT','QUOTATION','CONFIRMED') AND billed_cycles > 0;` → **0** (nothing is billed before activation)
- [ ] `SELECT COUNT(*) FROM discounts WHERE max_uses IS NOT NULL AND current_uses > max_uses;` → **0**
- [ ] Every `users.password_hash` starts with `$2` (bcrypt) — none are plaintext.
