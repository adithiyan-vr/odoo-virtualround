# Odoo Hackathon 2026: Tech Stack & Architecture Guide
**Problem Statement:** Brightloop Subscription Management System  
**Target Team Profile:** First-Year CSE Undergraduates (Fast learning curve, rapid UI prototyping, strong relational database needs, $< 2\text{s}$ query performance requirement)

---

## 1. Golden Rule for This Problem Statement: **Use a Relational (SQL) Database**
Before picking a language or framework, you must lock in **PostgreSQL** (or **MySQL/SQLite**). 
* **Why NOT MongoDB (NoSQL)?** A Subscription Management System is basically a mini-ERP and accounting ledger. You have strict relationships (`Customer` $\rightarrow$ `Subscription` $\rightarrow$ `Subscription Lines` $\rightarrow$ `Invoices` $\rightarrow$ `Payments`), atomic transactions (generating hundreds of invoices on Billing Day without double-billing), and fast financial aggregations (`SUM`, `COUNT` across $5,000+$ rows in $< 2\text{ seconds}$). PostgreSQL handles all of this natively.

---

## 2. Top 3 Recommended Tech Stacks (Pick ONE Based on Your Team's Strengths)

### Option A: The "Hackathon Speedrunner" Stack (TypeScript / JavaScript) — **HIGHLY RECOMMENDED**
Best if your team knows basic HTML/CSS/JS or React and wants the fastest path to a polished, modern ERP interface with minimal backend boilerplate.

* **Frontend & Backend Framework:** **Next.js (App Router)** OR **React (Vite) + Node.js (Express)**
* **Styling & UI Components:** **Tailwind CSS + shadcn/ui** (Gives you pre-built Data Tables, Badges, Modals, Tabs, and Charts out of the box)
* **Database & ORM:** **PostgreSQL** (hosted free on **Supabase** or **Neon**) + **Prisma ORM**
* **Authentication:** **Supabase Auth** or **NextAuth / JWT + bcrypt**
* **PDF Invoice Generation:** `@react-pdf/renderer` or standard CSS `@media print` styling

**Why this wins for 1st-Years:**
1. **Prisma ORM** lets you write your database tables in a super readable `schema.prisma` file and auto-generates type-safe database queries (no raw SQL syntax errors at 3 AM).
2. **shadcn/ui** makes your dashboard look like a million-dollar SaaS product in 15 minutes.

---

### Option B: The "Python Powerhouse" Stack (Python + React)
Best if your first-year curriculum taught you **Python** (or C/Python) and you feel much safer writing complex billing, tax, and discount algorithms in Python.

* **Backend Framework:** **FastAPI** (Recommended) or **Django / Flask**
* **Database & ORM:** **PostgreSQL** (or local **SQLite** for development) + **SQLAlchemy / SQLModel**
* **Frontend Framework:** **React (Vite) + Tailwind CSS** (or **Bootstrap / Jinja2 Templates** if you don't know React)
* **API Testing (Built-in):** FastAPI automatically generates an interactive **Swagger UI (`/docs`)** where you can test your "Billing Day" endpoint directly in the browser before the frontend is even finished!

**Why this wins for 1st-Years:**
1. Writing the **Billing Day Engine**, date-math (`relativedelta` in Python's `dateutil`), and discount validation rules in Python is clean, readable, and easy to debug.
2. FastAPI's automatic `/docs` page acts as a backup demo screen if a frontend button breaks during judging.

---

### Option C: The "All-in-One Monolith" Stack (Python Django + HTMX/Bootstrap)
Best if your team is **weak in React/JavaScript** and wants to avoid connecting a separate Frontend and Backend over REST APIs.

* **Full-Stack Framework:** **Django**
* **Frontend:** **Django Templates + Tailwind CSS / Bootstrap 5 + HTMX**
* **Database:** **PostgreSQL / SQLite** (via Django ORM)
* **Admin Panel Bonus:** **Django Built-in Admin** (customized with `django-unfold` for a modern look)

**Why this wins for 1st-Years:**
1. Zero CORS errors, zero state management headaches, and built-in Authentication/RBAC (`Admin`, `Staff`, `Customer` groups) out of the box.

---

## 3. Head-to-Head Comparison Matrix

| Feature / Requirement | Option A: Next.js + Prisma + Postgres | Option B: FastAPI (Python) + React | Option C: Django + Bootstrap/HTMX |
| :--- | :--- | :--- | :--- |
| **Learning Curve for 1st Years** | Medium (JS/TS everywhere) | Low-Medium (Python Backend) | Low (No separate frontend API) |
| **UI Polish & ERP Look** | $\star\star\star\star\star$ (with `shadcn/ui`) | $\star\star\star\star\star$ (with React/Tailwind) | $\star\star\star\star$ (Clean server templates) |
| **Billing & Date Math Logic** | Good (`date-fns` library) | Excellent (`datetime` + `dateutil`) | Excellent (`datetime` + `dateutil`) |
| **RBAC (Admin / Staff / Customer)** | Custom Middleware / Supabase | JWT Dependency Injection | Built-in Django Auth & Groups |
| **$< 2\text{s}$ Dashboard Performance** | Fast via Prisma/SQL Aggregations | Extremely Fast (Async Python + SQL) | Fast via Django ORM `aggregate()` |

---

## 4. Must-Have Libraries for Specific Problem Statement Features

No matter which stack you pick, do **not** code these features from scratch—use these lightweight libraries:

1. **Date Manipulation (Crucial for Daily, Weekly, Monthly, Yearly Plans):**
   * **JavaScript/TypeScript:** `date-fns` (`addDays`, `addWeeks`, `addMonths`, `addYears`, `isBefore`, `isAfter`)
   * **Python:** `python-dateutil` (`relativedelta(months=+1)`)
2. **Finance Lead Dashboard Charts:**
   * **React:** `recharts` or `chart.js` (Simple Bar Chart for Monthly Revenue & Pie Chart for Subscription Statuses)
   * **HTML/Templates:** **Chart.js** via CDN (`<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>`)
3. **Printing Invoices to PDF:**
   * **Fastest Hackathon Trick:** Build a clean HTML Invoice page and add a button that calls `window.print()`. Use Tailwind's `print:hidden` class to hide the sidebar and buttons when printing to PDF!
4. **Password Hashing & Validation:**
   * **JS:** `bcryptjs` + `zod` (for validating the $>8$ chars, uppercase, lowercase, special character regex)
   * **Python:** `passlib[bcrypt]` + `pydantic`
5. **Dummy Data Seeder (For the $<2\text{s}$ withThousands of Subscriptions test):**
   * **JS:** `@faker-js/faker`
   * **Python:** `Faker`

---

## 5. Recommended Team Role Split (Assuming a 3–4 Person Team)

* **Member 1 (Backend & Database Architect):** Sets up PostgreSQL, writes the schema (`Users`, `Products`, `Variants`, `Plans`, `Subscriptions`, `Invoices`, `Payments`, `Discounts`), and builds the **Role-Based Auth**.
* **Member 2 (Core Business Logic Engineer):** Writes the **Quotation-to-Subscription state transitions**, the **Discount Rules evaluator**, and the **Billing Day Batch Invoice Generator**.
* **Member 3 (Frontend ERP Builder):** Builds the Admin/Staff Portal UI (Product/Plan forms, Subscription status ribbon `Draft -> Quotation -> Confirmed -> Active -> Closed`, and Invoice table).
* **Member 4 (Customer Portal, Dashboard & Seeding):** Builds the Customer-only portal view, the **Finance Lead Dashboard**, the `window.print()` Invoice view, and the script to seed $5,000$ rows to prove the $<2\text{s}$ load time.

---

## 6. Suggested Folder Structure (React/Next.js or FastAPI + React)

```text
brightloop-erp/
├── backend/ (or src/app/api in Next.js)
│   ├── models/          # Database tables (User, Product, Plan, Subscription, Invoice, Payment, Discount)
│   ├── routes/
│   │   ├── auth.py      # Signup (regex check), Login, Forgot Password, Admin Create Staff
│   │   ├── catalog.py   # Products, Variants (+560 surcharge), Plans, Quotation Templates
│   │   ├── subs.py      # Subscription CRUD & State Machine transitions
│   │   ├── billing.py   # "Run Billing Day" batch engine & Invoice actions (Confirm/Cancel/Pay)
│   │   └── dashboard.py # SQL SUM/COUNT aggregations for Finance Lead (<2s response)
│   └── seed.py          # Script to generate 5,000 dummy subscriptions & invoices
├── frontend/
│   ├── components/
│   │   ├── StatusRibbon.jsx   # Odoo-style Draft -> Quotation -> Confirmed -> Active -> Closed
│   │   ├── BillingModal.jsx   # "Simulate Billing Day" trigger modal
│   │   └── InvoicePrint.jsx   # Clean printable invoice layout
│   └── pages/
│       ├── AdminDashboard.jsx
│       ├── StaffWorkspace.jsx
│       ├── CustomerPortal.jsx
│       └── FinanceAnalytics.jsx
└── README.md
```