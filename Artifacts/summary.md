# **Odoo Hackathon 2026: Brightloop Subscription Management System \- Complete First-Year CSE Blueprint**

Engineering execution guide and technical specification for rapid prototyping, robust database architecture, and evaluation compliance.

# **1\. Executive Summary & Problem Breakdown**

Brightloop Software's existing business processes rely on disconnected spreadsheets, manual renewal tracking, hand-typed PDF invoices, and offline bank reconciliation. This operational approach introduces critical failure points: uncollected revenue from expired accounts, human errors during tax and surcharge calculation, and delayed financial reporting.

The core objective is to architect and deliver an enterprise-grade subscription management engine capable of orchestrating the end-to-end lifecycle:

* Setup of configurable products, attribute variants, and recurring billing plans.  
* Quotation creation and strict state-driven subscription tracking.  
* Automated idempotent billing runs applying progressive discounts and regional taxes.  
* Manual and reconciled payment accounting with instant ledger updates.  
* Sub-2-second finance KPI dashboards aggregating over 5,000 active records.

# **2\. Seven Core Functional Modules (Evaluation Checklist)**

## **Module 1: Authentication & Role-Based Access Control (RBAC)**

* **Account Uniqueness:** System-enforced unique email per registered user entity.  
* **Password Complexity Validation:** Strict regular expression validation (`^(?=.*[a-z])(?=.*[A-Z])(?=.*[^A-Za-z0-9]).{9,}$`) mandating more than 8 characters, at least 1 uppercase letter, 1 lowercase letter, and 1 special character.  
* **Recovery Mechanism:** Secure forgot-password pipeline issuing single-use, time-expiring cryptographic reset tokens delivered via transactional email mockups.  
* **Role Partitioning:**  
  * **Admin:** Full governance over master catalogs, billing plans, tax/discount configurations, user creation, and internal staff provisioning.  
  * **Internal Staff:** Day-to-day administrative authority to draft quotations, confirm subscriptions, register payments, and manage invoices. No access to global platform configurations.  
  * **Customer:** Restricted self-service portal access scoped strictly to records matching their authenticated `customer_id`. Can view their active subscriptions and download invoices.

## **Module 2: Products, Variants & Subscription Plans**

* **Product Catalog:** Support for base item definitions including SKU, name, product type (Service vs. Storable), sales price, cost price, and internal accounting notes.  
* **Attribute-Based Variants:** Dynamic surcharge computation linked to item options (e.g., Brand attribute "Odoo" adds an automatic \+560.00 surcharge to the base catalog price).  
* **Billing Plans:** Declarative recurring frequencies (Daily, Weekly, Monthly, Yearly) accompanied by minimum subscription quantities and system availability dates (`valid_from`, `valid_to`).  
* **Plan Lifecycle Policies:** Admin-configurable policy flags enforced at runtime:  
  * `auto_close`: Automatically moves the subscription to Closed upon passing `valid_to`.  
  * `can_close_early`: Permits customer- or staff-initiated early termination.  
  * `can_pause`: Enables temporary suspension of recurring billing runs.  
  * `can_renew`: Exposes manual and automatic renewal pipelines prior to expiration.

## **Module 3: Quotation Templates & Subscription State Machine**

* **Quotation Templates:** Pre-configured templates linking default plans, line item items, and validity windows (`validity_days`) to accelerate quotation generation.  
* **Subscription Records:** Centralized business entity tracking `sub_number`, assigned customer, associated plan, explicit start/end dates, payment terms, and active lifecycle states.  
* **Order Line Items:** Granular lines computing variant surcharges, line item tax rates, dynamic quantity tiers, and computed line subtotals.  
* **State Machine:** Deterministic, unidirectional state transitions:

```
[Draft] ---> [Quotation] ---> [Confirmed] ---> [Active] ---> [Closed]
                                  |
                                  v
                              [Paused]
```

## **Module 4: Automated Recurring Billing & Invoicing Engine**

* **Batch Scheduling Execution:** An automated routine processing all subscriptions marked `ACTIVE` whose `next_billing_date <= CURRENT_DATE`.  
* **Invoice Auto-Population:** Automatic propagation of customer billing metadata, line item structures, active discounts, and system tax rules into newly created ledger records.  
* **Idempotency Guarantee:** Cryptographic or database-level constraints prohibiting duplicate invoices for the same subscription within identical billing cycles.  
* **Operational Actions:** Interactive staff triggers to Confirm, Cancel, Send via email, or generate standard PDF print layouts.  
* **Invoice State Hierarchy:** Deterministic ledger states: `Draft` \-\> `Confirmed` \-\> `Paid` (with support for terminal `Cancelled` states).

## **Module 5: Dynamic Discount Rules Engine**

* **Access Control:** Restricted strictly to Admin maintenance views.  
* **Computation Modes:** Fixed amount deduction (e.g., \$50 off invoice) or percentage reductions (e.g., 15% off qualified lines).  
* **Activation Rules:** Threshold gates including minimum total transaction purchase values, minimum aggregate line item quantities, validity windows, and absolute usage counters (`max_uses`).  
* **Scoping Logic:** Granular application restricted to specific product IDs or universally deducted from the entire subscription invoice total.  
* **Depletion Handling:** Automatic deduction on generation; immediate disqualification and state change once `current_uses >= max_uses` or date boundaries expire.

## **Module 6: Payment Recording & Reconciliation**

* **Payment Entry:** Direct capture against confirmed outstanding invoices, tracking payment mode (Bank Transfer, Credit Card, Cash), transaction amounts, payment dates, and reference notes.  
* **Real-Time Settlement:** Automatic transitions to `PAID` once cumulative successful payments equal the invoice `total_amount`.  
* **Arrears Detection:** Real-time query flagging invoices where `due_date < CURRENT_DATE` and `status != 'PAID'`.

## **Module 7: Finance Lead Dashboard & Performance (\< 2s SLA)**

* **Real-Time KPI Cards:** Active subscription totals, Gross Revenue Collected, Total Outstanding Balances, and Aggregate Overdue Accounts.  
* **Dynamic Filtering:** Live faceted filtering across date boundaries, active plans, customer segments, and invoice statuses.  
* **SLA Performance Constraints:** Sub-2-second page response times under enterprise volumes (5,000+ records) achieved via B-Tree indexing, aggregate SQL views, and strict server-side cursor/offset pagination.

# **3\. Recommended Tech Stack for a First-Year CSE Team**

Select **one** of the two paths below based on your team's familiarity. Do not attempt to mix stacks during the competition.

## **Path A: Modern Full-Stack Web App (Recommended for UI Control & Agility)**

* **Frontend:** Next.js (React) or Vite \+ React paired with Tailwind CSS and shadcn/ui. Provides pre-built components for data tables, modal dialogs, status badges, and responsive dashboards.  
* **Backend:** Node.js (Express/NestJS) or Python (FastAPI). FastAPI provides out-of-the-box Swagger documentation and type checking via Pydantic.  
* **Database & ORM:** PostgreSQL managed via Neon or Supabase. Use Prisma ORM (Node.js) or SQLAlchemy (Python) for schema migrations, relational joins, and transaction isolation.

## **Path B: Native Odoo Module Development (If targeting Odoo Framework native scoring)**

* **Core Platform:** Odoo 17 or 18 Community Edition.  
* **Programming Environment:** Python core business models (`models.Model`), XML-defined views (Form, Tree, Kanban, Search), and native QWeb engines for PDF invoice report rendering.  
* **Underlying Database:** Native Odoo PostgreSQL object-relational mapping.

# **4\. Database Schema Blueprint (Core Tables)**

| Table Name | Primary Key | Foreign Keys | Key Attributes & Enums | Purpose |
| :---- | :---- | :---- | :---- | :---- |
| `users` | `id (UUID)` | None | `email` (UNIQUE), `password_hash`, `role` (ADMIN, STAFF, CUSTOMER), `reset_token`, `created_at` | RBAC and authentication management |
| `products` | `id (UUID)` | None | `name`, `type` (SERVICE, STORABLE), `sales_price`, `cost_price`, `notes` | Master item definitions |
| `product_variants` | `id (UUID)` | `product_id` | `attribute_name`, `attribute_value`, `price_surcharge` | Attribute add-on pricing modifiers |
| `plans` | `id (UUID)` | None | `name`, `billing_interval` (DAILY, WEEKLY, MONTHLY, YEARLY), `price`, `min_qty`, `valid_from`, `valid_to`, `auto_close`, `can_close_early`, `can_pause`, `can_renew` | Recurring logic, frequency, and lifecycle policies |
| `quotation_templates` | `id (UUID)` | `plan_id` | `name`, `validity_days`, `template_lines_json` | Pre-packaged quotes for rapid drafting |
| `discounts` | `id (UUID)` | `target_product_id` | `name`, `type` (FIXED, PERCENT), `value`, `min_purchase`, `min_qty`, `start_date`, `end_date`, `max_uses`, `current_uses`, `scope` (PRODUCT, SUBSCRIPTION) | Configurable dynamic discounting engine |
| `subscriptions` | `id (UUID)` | `customer_id, plan_id, discount_id` | `sub_number` (UNIQUE), `status` (DRAFT, QUOTATION, CONFIRMED, ACTIVE, PAUSED, CLOSED), `start_date`, `expiry_date`, `next_billing_date`, `payment_terms` | Central contract state engine |
| `subscription_lines` | `id (UUID)` | `subscription_id, product_id, variant_id` | `quantity`, `unit_price`, `tax_rate`, `subtotal` | Granular quote and recurring line items |
| `invoices` | `id (UUID)` | `subscription_id, customer_id` | `invoice_number` (UNIQUE), `billing_cycle_date`, `status` (DRAFT, CONFIRMED, PAID, CANCELLED), `subtotal`, `discount_amount`, `tax_amount`, `total_amount`, `due_date` | Receivable ledger and accounting records |
| `payments` | `id (UUID)` | `invoice_id` | `amount`, `method` (BANK, CARD, CASH), `payment_date`, `note` | Real-time cash collections and reconciliation |

# **5\. Step-by-Step Hackathon Execution Roadmap (24–36 Hours)**

```
[Hours 00-04] Setup, Auth & RBAC
      │
[Hours 04-10] Master Data, Variants & Plans
      │
[Hours 10-16] Quotation & State Machine
      │
[Hours 16-22] Hero Engine: Recurring Billing & Invoices
      │
[Hours 22-26] Payments & Executive Dashboard (<2s)
      │
[Hours 26-30] High-Volume Seeding & Pitch Preparation
```

## **Phase 1: Schema Lock, Repo Setup & Auth/RBAC (Hours 00–04)**

* Initialize Git repository, configure environment variables, setup linting, and deploy the base PostgreSQL instance.  
* Implement user migration with strict schema constraints.  
* Build password registration pipeline enforcing the 8+ character and character-class regular expression.  
* Build login endpoint returning JWT or session state containing the user's role.  
* Construct the front-end layout with route guards routing users to Admin, Staff, or Customer views.

## **Phase 2: Admin Master Data Management (Hours 04–10)**

* Construct CRUD forms for Products and Product Variants.  
* Implement surcharge calculation logic: modifying base sales price when variants (e.g., Brand \= Odoo) are selected.  
* Build Plan Management screen exposing billing frequencies and lifecycle flag toggles (`can_pause`, `auto_close`, etc.).  
* Build Discount Rule configuration panel with support for percentage/fixed logic, expiration boundaries, and maximum usage counters.

## **Phase 3: Quotation Templates & Subscription Lifecycle (Hours 10–16)**

* Implement Quotation Templates interface to auto-populate multi-line items with standard pricing.  
* Implement the core Subscription entity tracking customer associations, applied plans, and billing schedules.  
* Model the lifecycle state machine on the frontend using visual state indicators (`Draft` \-\> `Quotation` \-\> `Confirmed` \-\> `Active` \-\> `Closed`).  
* Implement state transition validation guards (e.g., prevent moving from Draft to Active without first transitioning through Confirmed).

## **Phase 4: The Hero Feature \- Billing Day Engine & Invoicing (Hours 16–22)**

* Write the batch generation query selecting all subscriptions where `status = 'ACTIVE'` and `next_billing_date <= CURRENT_DATE`.  
* Wrap the billing routine within a database transaction:  
  * Check discount usage limits and apply valid discounts.  
  * Compute sales tax, line totals, and create the `invoice` record.  
  * Advance `next_billing_date` based on the plan's `billing_interval`.  
  * Increment the discount rule's `current_uses` counter.  
* Add manual triggers to Confirm, Cancel, and render a printable HTML/CSS PDF invoice view.

## **Phase 5: Payments, Overdue Detection & Finance Dashboard (Hours 22–26)**

* Build the Payment Modal to log settled amounts against confirmed invoices; auto-update invoice status to `PAID` when fully settled.  
* Create a database view or indexed query identifying overdue records: `WHERE due_date < CURRENT_DATE AND status != 'PAID'`.  
* Construct the Finance Lead Dashboard:  
  * Metric cards: Total Revenue, Outstanding Amount, Overdue Balances, Active Customer Count.  
  * Line/Bar charts tracking monthly recurring collections.  
* Optimize dashboard queries using SQL aggregation functions (`SUM`, `COUNT`) rather than computing sums in memory on the application tier.

## **Phase 6: Volume Seeding, Optimization & Demo Rehearsal (Hours 26–30)**

* Run a data generation script inserting 5,000+ mock subscriptions and 10,000+ invoice records.  
* Verify the Finance Lead Dashboard responds in under 2 seconds under this seeded load.  
* Create standard demo accounts for the three user personas:  
  * `admin@brightloop.io`  
  * `staff@brightloop.io`  
  * `customer@brightloop.io`  
* Freeze code, polish pitch slides, and rehearse the live evaluation demo.

# **6\. First-Year Survival Tips & Evaluation Winning Strategies**

## **1\. Build an Interactive "Simulate Billing Day" Trigger**

Do not rely on background OS cron daemons or real-time clock delays during a 5-minute judging presentation. Place a visible button labeled **"Run Daily Billing Batch"** directly on the Admin Dashboard. Include a date picker beside it allowing you to set the simulated execution date to tomorrow or next month. When clicked, it should instantly process eligible subscriptions and display a toast notification (e.g., *"Processed 42 active subscriptions; 42 invoices created in 240ms"*).

## **2\. Prevent Double Billing Using Idempotency Keys**

Judges often test edge cases by clicking the billing trigger multiple times. Protect the system by adding a database-level composite unique constraint on the invoices table:

```
ALTER TABLE invoices ADD CONSTRAINT unique_subscription_cycle 
UNIQUE (subscription_id, billing_cycle_date);
```

Wrap the generation process inside an atomic transaction. If the unique constraint is violated, gracefully skip the duplicate without crashing the engine.

## **3\. Implement Visual Status Banners**

Elevate your application's appearance by modeling standard enterprise ERP layouts. Place a breadcrumb-style state banner at the top-right of the Subscription and Invoice detail views:

```
[ Draft ]  ===>  [ Quotation ]  ===>  [ Confirmed ]  ===>  [ ACTIVE ]  ===>  [ Closed ]
```

Render completed states in muted slate, the current active state in dark blue or deep slate, and invalid future states in light grey.

## **4\. Guaranteeing the Sub-2-Second Performance SLA**

Loading 5,000 records will freeze the browser if your API returns the entire dataset in a single JSON payload. Ensure your application remains performant with these three backend optimizations:

* **Database Indexing:** Add indexes to high-frequency filter columns:

```
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_invoices_due_status ON invoices(due_date, status);
CREATE INDEX idx_subscriptions_next_bill ON subscriptions(next_billing_date);
```

* **Server-Side Aggregations:** Run calculations directly in the database engine instead of JavaScript:

```
SELECT 
    COUNT(*) FILTER (WHERE status = 'ACTIVE') as active_count,
    SUM(total_amount) FILTER (WHERE status = 'PAID') as total_revenue,
    SUM(total_amount) FILTER (WHERE status = 'CONFIRMED') as outstanding_amount
FROM invoices;
```

* **Server-Side Pagination:** Restrict line-item lists and ledger tables to `LIMIT 25 OFFSET 0` by default, fetching additional pages asynchronously. This maintains dashboard response times under 200 milliseconds regardless of dataset size.

