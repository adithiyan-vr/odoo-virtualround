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
