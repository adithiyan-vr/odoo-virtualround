# Brightloop — Design System & UI Specification

| | |
|---|---|
| **Version** | 1.0 · 31 Oct 2026 |
| **Owner** | Member 3 (design system) — all members must follow it |
| **Inspired by** | `landing_page_ref.jpg` ("Active" marketing site) and `dashboard.jpg` ("Quantro" sales dashboard) |
| **Related** | [PRD](PRD.md) · [ARCHITECTURE](ARCHITECTURE.md) · [MEMBERS](MEMBERS.md) |

> **One rule above all:** every screen — landing, auth, back-office, portal, print — is built from the tokens and components in this document. If you need something new, add it here first.

---

## 1. What We Took From the References

| Element | Landing ref ("Active") | Dashboard ref ("Quantro") | **Brightloop decision** |
|---|---|---|---|
| Palette | White canvas, warm orange accent, near-black CTAs | Near-black frame + sidebar, orange/amber charts | **Orange `#FF6A1A` + amber accent on warm-white canvas; ink-black for primary buttons and sidebar** |
| Typography | Geometric rounded sans (Urbanist-like), large tight headings | Same family, bold numerals | **Urbanist** (display/UI) + **Inter** (data tables, numerals) |
| Shape language | Pill buttons, 24 px soft grey cards | Rounded 20 px KPI cards, pill status chips | **Pills for actions & status, 20–24 px cards, 12 px inputs** |
| Hero | Orange light rays at the top, floating stat cards | — | **Landing hero with orange glow + floating MRR / subscriptions cards** |
| Cards | Light-grey feature cards containing mini-UI mockups | KPI cards; first card inverted (black) with orange sparkline | **Soft-grey feature cards with mini mockups; first KPI card dark** |
| App frame | — | Dark outer frame, white rounded content panel, dark sidebar with orange active icon | **Same frame for Admin, Staff and Customer portal** |
| Charts | — | Orange gradient area chart, dark tooltip, donut with orange/amber/black/grey | **Same chart styling (Recharts)** |
| Lists | Orange left-border benefit list | Tables with avatar, status pills, "View All →" | **Same** |

---

## 2. Brand

- **Name:** Brightloop · **Tagline:** *Recurring revenue, on autopilot.*
- **Voice:** clear, calm, confident; short sentences; no jargon where a plain word works.
- **Logo:** orange rounded-square tile with a white "loop" (two arcs with arrowheads) + wordmark in Urbanist 700. Placeholder mark (refine in Figma if time allows):

```svg
<svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="32" height="32" rx="10" fill="#FF6A1A"/>
  <path d="M9.5 16a6.5 6.5 0 0 1 11-4.7M22.5 16a6.5 6.5 0 0 1-11 4.7"
        stroke="#fff" stroke-width="2.6" stroke-linecap="round"/>
  <path d="M21 7.8v4h-4M11 24.2v-4h4" stroke="#fff" stroke-width="2.6"
        stroke-linecap="round" stroke-linejoin="round"/>
</svg>
```

---

## 3. Design Tokens

### 3.1 Colour

**Brand — Orange**

| Token | Hex | Use |
|---|---|---|
| `orange-50` | `#FFF4EC` | Tinted backgrounds, empty-state icon tiles |
| `orange-100` | `#FFE6D2` | Hover tint, chart fill start |
| `orange-300` | `#FFA96D` | Chart secondary line |
| `orange-400` | `#FF8A3D` | Gradient end, sparklines |
| **`orange-500`** | **`#FF6A1A`** | **Brand primary — fills, active icon tiles, rays** |
| `orange-600` | `#EA5A0C` | Pressed state |
| `orange-700` | `#C2410C` | **Orange text / links on white (AA)** |
| `amber-400` | `#FFC83D` | Secondary accent (donut, highlights, "Run billing" button in sidebar card) |
| `amber-100` | `#FFF3CC` | Warning backgrounds |

**Ink (neutrals)**

| Token | Hex | Use |
|---|---|---|
| `ink-950` | `#0E0E0E` | Primary buttons, dark KPI card, app frame, tooltips |
| `ink-900` | `#171717` | Sidebar |
| `ink-800` | `#232323` | Sidebar hover / active surface, button hover |
| `ink-600` | `#4A4A4A` | Strong secondary text |
| `ink-500` | `#6B6B6B` | Secondary text (≈ 5.3 : 1 on white) |
| `ink-400` | `#9A9A9A` | Placeholders, disabled |
| `ink-200` | `#E7E7E3` | Borders, dividers |
| `ink-100` | `#F1F1EE` | Soft cards (feature cards), table hover, skeleton |
| `ink-50` | `#F7F7F5` | Page canvas, input fill |
| `white` | `#FFFFFF` | Surfaces |

**Semantic (text colour on tint background)**

| Meaning | Text | Background | Solid |
|---|---|---|---|
| Success | `#15803D` | `#DCFCE7` | `#16A34A` |
| Info | `#1D4ED8` | `#DBEAFE` | `#2563EB` |
| Warning | `#92400E` | `#FEF3C7` | `#F59E0B` |
| Danger | `#B91C1C` | `#FEE2E2` | `#DC2626` |
| Neutral | `#404040` | `#F1F1EE` | `#6B6B6B` |

> **Contrast rules (important):** white text on `orange-500` is only ≈ 2.9 : 1 — **do not** put small white text on orange. Use `ink-950` text on orange fills (≈ 6.6 : 1) or white text on ink-950. Orange *text* on white must use `orange-700` (≈ 5.2 : 1). Re-check with a contrast tool before submission.

### 3.2 Typography

Fonts via `next/font/google`: **Urbanist** (400/500/600/700) and **Inter** (400/500/600). Numbers in tables, KPIs and invoices use `font-variant-numeric: tabular-nums`.

| Style | Font | Size / line | Weight | Tracking | Use |
|---|---|---|---|---|---|
| Display XL | Urbanist | 64 / 68 | 700 | −0.02em | Landing hero |
| Display | Urbanist | 48 / 52 | 700 | −0.02em | Section titles (landing) |
| H1 | Urbanist | 32 / 38 | 700 | −0.015em | Page titles |
| H2 | Urbanist | 24 / 30 | 700 | −0.01em | Card/section titles |
| H3 | Urbanist | 18 / 26 | 600 | 0 | Modal titles, widget titles |
| Body L | Urbanist | 16 / 26 | 500 | 0 | Landing copy |
| Body | Inter | 14 / 22 | 400 | 0 | App text, table cells |
| Label | Urbanist | 13 / 18 | 600 | 0 | Form labels |
| Caption | Inter | 12 / 16 | 500 | 0.01em | Helper text, meta |
| KPI | Urbanist | 32 / 36 | 700 | −0.01em | KPI numbers (tabular) |
| Overline | Urbanist | 11 / 14 | 600 | 0.08em, uppercase | Sidebar section labels |

### 3.3 Spacing, radius, elevation

- **Spacing scale (px):** 4 · 8 · 12 · 16 · 20 · 24 · 32 · 40 · 56 · 80. Card padding 20–24. Section gap 24. Page gutters 24 (desktop) / 16 (mobile).
- **Radius:** pill `999px` (buttons, chips, status pills, search) · `24px` modal & feature cards · `20px` KPI/widget cards · `12px` inputs, sidebar items, small tiles · `8px` icon tiles.
- **Elevation:**
  - `shadow-card`: `0 1px 2px rgba(14,14,14,.04), 0 8px 24px rgba(14,14,14,.06)`
  - `shadow-float` (landing floating cards, popovers): `0 12px 40px rgba(14,14,14,.12)`
  - `shadow-modal`: `0 24px 64px rgba(14,14,14,.28)`
- **Borders:** 1 px `ink-200`. Focus ring: 2 px `orange-500` + 2 px white offset.

### 3.4 CSS variables (`src/app/globals.css`)

Tokens are plain CSS custom properties, then mapped to shadcn/ui's variable names so every shadcn component inherits the look. (Tailwind v3 → `tailwind.config.ts` `theme.extend.colors`; Tailwind v4 → `@theme inline`. Use whichever your scaffold generated.)

```css
:root {
  /* brand */
  --orange-50:#FFF4EC; --orange-100:#FFE6D2; --orange-300:#FFA96D; --orange-400:#FF8A3D;
  --orange-500:#FF6A1A; --orange-600:#EA5A0C; --orange-700:#C2410C;
  --amber-400:#FFC83D; --amber-100:#FFF3CC;
  /* ink */
  --ink-950:#0E0E0E; --ink-900:#171717; --ink-800:#232323; --ink-600:#4A4A4A;
  --ink-500:#6B6B6B; --ink-400:#9A9A9A; --ink-200:#E7E7E3; --ink-100:#F1F1EE; --ink-50:#F7F7F5;
  /* semantic */
  --success-fg:#15803D; --success-bg:#DCFCE7; --info-fg:#1D4ED8; --info-bg:#DBEAFE;
  --warning-fg:#92400E; --warning-bg:#FEF3C7; --danger-fg:#B91C1C; --danger-bg:#FEE2E2;

  /* shadcn/ui mapping */
  --background:#F7F7F5;   --foreground:#0E0E0E;
  --card:#FFFFFF;         --card-foreground:#0E0E0E;
  --popover:#FFFFFF;      --popover-foreground:#0E0E0E;
  --primary:#0E0E0E;      --primary-foreground:#FFFFFF;   /* black pill = primary action */
  --secondary:#F1F1EE;    --secondary-foreground:#0E0E0E;
  --muted:#F1F1EE;        --muted-foreground:#6B6B6B;
  --accent:#FFF4EC;       --accent-foreground:#C2410C;
  --destructive:#DC2626;  --destructive-foreground:#FFFFFF;
  --border:#E7E7E3;       --input:#E7E7E3;                --ring:#FF6A1A;
  --radius:12px;

  --font-display: var(--font-urbanist), system-ui, sans-serif;
  --font-body: var(--font-inter), system-ui, sans-serif;
}

.hero-glow {
  background:
    radial-gradient(60% 55% at 50% 0%, rgba(255,106,26,.38) 0%, rgba(255,106,26,0) 70%),
    repeating-conic-gradient(from 90deg at 50% -10%, rgba(255,160,90,.20) 0 6deg, transparent 6deg 14deg);
  -webkit-mask-image: linear-gradient(#000 40%, transparent);
          mask-image: linear-gradient(#000 40%, transparent);
}
```

---

## 4. Iconography & Imagery
- **Icons:** `lucide-react`, stroke 1.75, 20 px in nav/buttons, 16 px inline, 24 px in feature tiles.
- **Icon tiles:** 36 px rounded-12 square; tint `orange-50` with `orange-700` icon (light) or `orange-500` with `ink-950` icon (on dark).
- **Avatars:** circle with initials on a pastel tint (derive from name hash: orange-100, amber-100, info-bg, success-bg).
- **Imagery:** no stock photos; use **mini-UI mockups** inside feature cards (as in the landing reference) and the logo strip as text wordmarks.
- **Charts:** Recharts only (see §6.8).

---

## 5. Layout Shells

### 5.1 App shell (Admin, Staff **and** Customer portal)
```
┌─ ink-950 frame ─────────────────────────────────────────────────────────────┐
│ ┌─ Sidebar (ink-900, 248px) ─┐ ┌─ Content panel (white, radius 28, m 12) ───┐ │
│ │ [logo] Brightloop          │ │ ┌ Topbar ──────────────────────────────┐ │ │
│ │                            │ │ │ [🔍 Search…] [📅 Date range] 🔔 (AC) ▾ │ │ │
│ │ OVERVIEW                   │ │ └──────────────────────────────────────┘ │ │
│ │ ▣ Dashboard   (active)     │ │ Page header: H1 + subtitle   [Primary +] │ │
│ │ SALES                      │ │                                          │ │
│ │   Customers                │ │ …page content…                           │ │
│ │   Subscriptions            │ │                                          │ │
│ │   Invoices · Payments      │ │                                          │ │
│ │ CATALOG (admin)            │ │                                          │ │
│ │   Products · Plans         │ │                                          │ │
│ │   Templates · Discounts    │ │                                          │ │
│ │ SETTINGS (admin)           │ │                                          │ │
│ │   Taxes · Terms · Staff    │ │                                          │ │
│ │ ┌ Billing Day card ──────┐ │ │                                          │ │
│ │ │ 42 due today [Run ▶]   │ │ │                                          │ │
│ │ └────────────────────────┘ │ └──────────────────────────────────────────┘ │
│ └────────────────────────────┘                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```
- **Sidebar item:** 44 px high, radius 12. Inactive: icon + text `#A3A3A3`. Hover: `ink-800` bg. **Active:** `ink-800` bg, white text, icon in a 28 px **orange-500 tile** with `ink-950` icon.
- **Role-aware navigation:** items the role cannot use are **not rendered** (the server still enforces).
- **Customer portal** uses the same shell with a reduced menu: Overview · My subscriptions · My invoices · Profile.
- **Billing Day card** (Admin/Staff): `ink-800` card, amber button `Run billing`.
- **Mobile (< 1024 px):** sidebar becomes a slide-over drawer; content panel is full-bleed (no frame margin).

### 5.2 Public shell (landing & auth)
White canvas with `hero-glow`, floating pill nav (logo, Features, Benefits, Pricing, **Sign in**, **Get started**). Auth pages use a **split layout**: form card left; right panel `ink-950` with orange glow and two floating stat cards.

### 5.3 Page templates

| Template | Structure |
|---|---|
| **List** | Page header → toolbar (search, filter chips, date range, export) → DataTable → pagination |
| **Detail** | Breadcrumb → title + status pill + **StatusRibbon** (top-right) → action buttons → tabs (Overview · Lines · Invoices · Activity) → side summary card |
| **Form** | Two columns: section cards (left, 2/3) + sticky live-summary card (right, 1/3) |
| **Dashboard** | Header + filter bar → 4–5 KPI cards → trend + donut → tables row |
| **Print** | A4, white, no shell (§8) |

---

## 6. Component Specifications

All components live in `src/components/ui` (shadcn primitives restyled) and `src/components/shared` (Brightloop composites). **Owner: M3.**

### 6.1 Buttons

| Variant | Look | Use |
|---|---|---|
| **Primary** | `ink-950` pill, white text, optional ↗ icon; hover `ink-800` | Main action per screen ("Create report", "New subscription") |
| **Accent** | `orange-500` pill, `ink-950` text | One highlight action only (**Run Billing Day**) |
| **Secondary** | white pill, 1 px `ink-200`, ink text | Cancel, Back, secondary actions |
| **Ghost** | transparent, ink text, hover `ink-100` | Toolbar/table actions |
| **Destructive** | white pill with `danger-fg` text → solid `#DC2626` in confirm dialogs | Cancel invoice, void payment |

Sizes: sm 36 px · **md 44 px (default)** · lg 52 px. Active: scale 0.98. Disabled: 40 % opacity, `not-allowed`. Loading: spinner replaces icon, width is kept.

### 6.2 Form controls
- **Input / Select / Textarea / DatePicker:** 44 px, radius 12, 1 px `ink-200`, fill white; focus: border `ink-950` + 3 px ring `orange-500/30`. Label above (Label style), helper below (Caption), error below in `danger-fg` with an alert icon.
- **PasswordInput:** show/hide toggle + **live policy checklist** — four rows (9+ characters, uppercase, lowercase, special) each turning green with a check as satisfied.
- **MoneyInput:** right-aligned, `₹` prefix, tabular numerals, 2 decimals on blur.
- **Toggle (policy flags):** pill switch; ON = `ink-950` track with orange knob.
- **Combobox (customer/product picker):** searchable, server-side suggestions, avatar/SKU in the option.
- **Date range:** pill trigger with calendar icon (as in the reference topbar); presets: Today, 7d, This month, Last month, This year, Custom.

### 6.3 StatusPill (the single source of colour for statuses)
24 px high, px 10, pill, 12/600, optional 6 px leading dot. Never invent new colours.

| Entity | Status | Colour |
|---|---|---|
| Subscription | Draft | Neutral |
| | Quotation | Info |
| | Confirmed | Amber (`warning` family) |
| | **Active** | **Success** |
| | Paused | Orange (`orange-100` bg / `orange-700` text) |
| | Closed | Dark (`ink-950` bg / white text) |
| | Expired quotation | Danger |
| Invoice | Draft | Neutral |
| | Confirmed | Info |
| | **Paid** | **Success** |
| | Partially paid | Warning |
| | **Overdue** | **Danger** |
| | Cancelled | Neutral, strikethrough label |
| Payment | Recorded / Voided | Success / Neutral strikethrough |
| Plan / product / discount | Active / Archived | Success / Neutral |
| Discount | Exhausted / Expired | Neutral / Danger |

### 6.4 StatusRibbon (breadcrumb-style state banner)
Chevron-shaped steps at the **top-right of every Subscription and Invoice detail header**.

```
 ✓ Draft  ›  ✓ Quotation  ›  ● CONFIRMED  ›  Active  ›  Closed
```
| Step state | Style |
|---|---|
| Done | `ink-100` bg, `ink-600` text, check icon |
| **Current** | `ink-950` bg, white text, orange dot |
| Upcoming | `ink-50` bg, `ink-400` text, dashed `ink-200` border |

- **Paused** shows as an orange "Paused" badge on the *Active* step.
- **Invoice ribbon:** Draft › Confirmed › Paid. *Cancelled* replaces the ribbon with a single red-tint "Cancelled" tag.
- Ribbon is **not clickable**; transitions happen via action buttons (driven by the API's `allowedActions`).

### 6.5 KPI card (from the dashboard reference)
- 20 px radius, padding 20, min-height 148.
- Top row: 36 px icon tile (left) · kebab menu (right).
- Label (Body, `ink-500`) → **value (KPI style)** → delta row: ▲ green / ▼ red arrow + `%` + "from last month".
- Bottom-right **sparkline** (area, orange gradient).
- **Variants:** `dark` (ink-950 bg, white text, orange sparkline) — *first card only*; `light` (white, 1 px border, faint orange-50 gradient at the bottom).
- Brightloop KPI set: **Active subscriptions (dark)** · MRR · Revenue collected · Outstanding · Overdue.

### 6.6 DataTable
- Header row: Caption style `ink-500`, no fill, 1 px bottom border. Row height 56. Hover `ink-50`.
- First column may hold an avatar + two-line cell (name / secondary id).
- Numeric columns right-aligned, tabular numerals. Status column uses StatusPill.
- **Toolbar:** search pill, filter chips (removable), column visibility (optional), export button.
- **Footer:** "Showing 1–25 of 5,000" + page-size select (25/50/100) + prev/next.
- **Server-driven:** sorting, filtering and pagination are passed to the API — never filter 5,000 rows in the browser.
- **States:** skeleton rows while loading; EmptyState when none; inline error card with Retry.
- **Mobile:** each row becomes a card (title, status pill, 2–3 key facts, overflow menu).
- Row actions: kebab menu (View, Edit, …). Destructive items last, in red.

### 6.7 Overlays & feedback
- **Modal:** radius 24, max-width 520 (forms) / 720 (wide), title H3, footer buttons right-aligned (Secondary left of Primary). Backdrop `ink-950/50` with 4 px blur.
- **Drawer:** right-side, 480 px, for quick edit/create (customer, tax, payment term).
- **ConfirmDialog:** icon tile + plain-language consequence ("This cancels INV-2026-000412. This can't be undone.") + Destructive confirm.
- **Toast (sonner):** bottom-right, radius 16, white with left colour bar; 4 s. Billing result toast is special: *"Processed 42 subscriptions · 42 invoices created · 240 ms"* with a "View invoices" link.
- **Skeleton:** `ink-100` with soft shimmer.
- **EmptyState:** 56 px `orange-50` icon circle, H3 title, Body description, one Primary button.
- **Tooltip:** `ink-950`, white text, 12 px, radius 8.

### 6.8 Charts (Recharts)
| Chart | Spec |
|---|---|
| **Area (revenue trend)** | Line `orange-500` 2.5 px; fill gradient `orange-400 @ 35 %` → transparent; grid dashed `ink-200`; axis labels Caption `ink-500`; active dot white with orange ring; **dark tooltip** (`ink-950`, white text, value bold) |
| **Bar (monthly collections)** | `orange-500` bars radius 8 top; current month `ink-950`; hover lightens |
| **Donut (subscription status)** | Segments in order: `orange-500`, `amber-400`, `ink-950`, `ink-400`, `ink-200`; centre label = total (KPI style) + "Total"; legend right with dot, label, % |
| **Sparkline** | No axes; area gradient; 56 px high |

### 6.9 Other composites
- **Timeline (activity):** 1 px `ink-200` line, 10 px dots (current = orange), actor + action + relative time.
- **Totals block:** right-aligned label/value rows; Subtotal, Discount (green, negative), Tax, **Total** (H3, tabular).
- **LineEditor:** table with product + variant selects, qty stepper, unit price (auto, editable), tax select, amount; "Add line" ghost button; plan-fee row is locked and badged "Plan fee".
- **PolicyChips:** small pills on plans — Auto-close · Close early · Pause · Renew (✓ in `success`, ✕ muted).
- **UsageMeter (discounts):** thin progress bar `currentUses / maxUses`, turns amber ≥ 80 %, grey when exhausted.

---

## 7. Screen Blueprints

### 7.1 Landing page (`/`) — follows the "Active" reference
```
[logo Brightloop]        Features  Benefits  Pricing        [Sign in]  [Get started ↗]
─────────────────────────────── orange rays ───────────────────────────────────────
 ┌ MRR ₹18,05,930 ┐       [● New · Smart billing]          ┌ Active subscriptions ┐
 │  ▁▃▅▇ +10.2%   │   Run every billing month              │ 5,000+  ▲ 12%        │
 └────────────────┘      on autopilot.                      │ (avatars) Paid 4,2k  │
                         Products, plans, invoices,         └──────────────────────┘
                         payments and revenue reports
                         in one place.
                  ✓ Automated billing  ✓ Smart discounts  ✓ Live insights
                  [ Start free ↗ ]   [ See Billing Day ↗ ]
                 Built for subscription teams — wordmark · wordmark · wordmark
─────────────────────────────────────────────────────────────────────────────────
                      Everything you need to bill on repeat   (Display, centred)
 ┌ Automated Billing Day ─┐ ┌ Plans & Variants ──────┐ ┌ Smart Discounts ──────┐
 │ text + mini-mockup     │ │ text + mini-mockup     │ │ text + mini-mockup    │
 └────────────────────────┘ └────────────────────────┘ └───────────────────────┘
 ┌ Payments & Reconciliation ───────┐ ┌ Finance Dashboard ───────────────────────┐
 └──────────────────────────────────┘ └──────────────────────────────────────────┘
─────────────────────────────────────────────────────────────────────────────────
 Unlock a new era of effortless      ┃ Idempotent billing — never twice, never missed
 recurring revenue                   ┃ Automatic taxes & discounts
 [Role-based access][Automated tax]  ┃ Customer self-service portal
 [Real-time insights][Audit trail]   ┃ Dashboard that answers in under 2 seconds
─────────────────────────────────────────────────────────────────────────────────
 Pricing  (live from /public/plans — middle card dark, "Most popular")
 ┌ Starter ┐  ┌ Business (dark) ┐  ┌ Enterprise ┐
─────────────────────────────────────────────────────────────────────────────────
 [ dark CTA band with orange glow: "Put your billing on autopilot" [Get started ↗] ]
 Footer: logo · Product · Company · Legal · © 2026 Brightloop
```
- Feature cards: `ink-100` background, radius 24, title H3, 2-line description, small icon tile top-right, mini-UI mockup bottom (built with real components at reduced scale).
- Benefits list: each item has a 2 px `orange-500` left border, icon tile, bold title, `ink-500` description.

### 7.2 Login / Signup
```
┌──────────────────────────────┬────────────────────────────────┐
│ [logo]                       │  ink-950 + orange glow         │
│ Welcome back                 │      ┌ floating stat card ┐    │
│ Log in to your workspace     │      └────────────────────┘    │
│ Email  [______________]      │   "Nothing billed twice,       │
│ Password [__________ 👁]     │    nothing missed."            │
│ Forgot password?             │      ┌ floating stat card ┐    │
│ [      Log in ↗      ]       │      └────────────────────┘    │
│ No account? Sign up          │                                │
└──────────────────────────────┴────────────────────────────────┘
```
Signup adds Name and the live password checklist; errors are inline, never alerts.

### 7.3 Finance dashboard (`/dashboard`) — follows the "Quantro" reference
```
Finance Dashboard                                   [📅 01 Oct–31 Oct ▾] [Plan ▾] [Customer ▾] [Run Billing Day ▶]
Track revenue, subscriptions and overdue invoices in real time.
┌ Active subs (dark) ┐ ┌ MRR ────────┐ ┌ Collected ──┐ ┌ Outstanding ┐ ┌ Overdue ────┐
│ 3,102   ▲4.1%  ~~~ │ │ ₹28.4L ▲2.3%│ │ ₹22.1L ▼1.2%│ │ ₹6.1L       │ │ 87 · ₹1.98L │
└────────────────────┘ └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘
┌ Revenue overview (area) [Revenue|Invoiced] [This year ▾] ─────────┐ ┌ Subscriptions by status ┐
│                      ╱╲        ┌dark tooltip┐                      │ │      ◔ donut  3,102     │
│        ╱╲_____╱╲____╱  ╲___╱   └────────────┘                      │ │ ● Active 62% ● Paused…  │
└────────────────────────────────────────────────────────────────────┘ └─────────────────────────┘
┌ Overdue invoices            View All → ┐ ┌ Upcoming renewals   View All → ┐ ┌ Recent payments  View All → ┐
│ INV-…  Acme   ₹11,114  12d overdue 🔴  │ │ SUB-…  Zen Co  in 6 days       │ │ INV-… ₹5,000 UPI ✓          │
└────────────────────────────────────────┘ └────────────────────────────────┘ └─────────────────────────────┘
```

### 7.4 Subscription detail (`/subscriptions/[id]`)
```
Subscriptions › SUB-2026-00042
SUB-2026-00042  [Active]        ✓Draft › ✓Quotation › ✓Confirmed › ●ACTIVE › Closed
Acme Traders · Business Monthly · Net 30
[Pause] [Renew] [Close] [Generate invoice]       (buttons come from allowedActions)
Tabs: Overview | Lines | Invoices | Activity
┌ Lines ────────────────────────────────────────────┐ ┌ Summary ───────────────┐
│ Product        Qty  Unit      Tax    Amount        │ │ Start   01 Nov 2026    │
│ Plan fee        1   1,499.00  18%    1,499.00      │ │ Expiry  01 Nov 2027    │
│ CRM Seat·Odoo   5   1,760.00  18%    8,800.00      │ │ Next bill 01 Dec 2026  │
│                                      Subtotal …    │ │ Discount Seat Saver    │
└────────────────────────────────────────────────────┘ │ Total/period ₹11,114   │
                                                       └────────────────────────┘
```

### 7.5 Billing Day modal
```
┌ Run Billing Day ───────────────────────────── ✕ ┐
│ Create invoices for every active subscription    │
│ that is due on or before:                        │
│ [ 📅 30 Nov 2026 ]     ⓘ 42 subscriptions due    │
│ [✓] Auto-confirm created invoices                │
│ Running twice is safe — duplicates are skipped.  │
│                  [Cancel]   [ ▶ Run billing ]    │
└──────────────────────────────────────────────────┘
```
After run: modal swaps to a result panel (created / skipped / failed / duration) + "View invoices".

### 7.6 Invoice detail (`/invoices/[id]`)
Header: number, status pill, ribbon (Draft › Confirmed › Paid). Actions: **Confirm · Send · Print · Record payment · Cancel** (only valid ones). Body: bill-to card, lines table with Discount and Tax columns, totals block, **Payments** card (list + "Record payment"), due date with Overdue pill and days late.

### 7.7 Record payment modal
Fields: Method (segmented: Bank · Card · Cash · UPI · Cheque), Amount (pre-filled with amount due), Date (today), Reference, Note. Inline hint: "₹X due after this payment".

### 7.8 Customer portal home (`/portal`)
Greeting + 3 KPI-style cards (Active subscriptions · Next invoice · Outstanding balance) → "My subscriptions" cards with ribbon + actions allowed by plan → recent invoices table with Print.

### 7.9 Remaining screens (all use the templates in §5.3)

| Screen | Template | Key elements |
|---|---|---|
| Customers | List + Drawer/Detail | Avatar, company, GSTIN, active subs count |
| Products | List + Form | SKU, type pill, price/cost, **Variants editor** (Brand = Odoo +560) |
| Plans | List + Form | Interval pill, min qty, availability dates, **PolicyChips**, four toggles |
| Templates | List + Form | LineEditor, validity days |
| Subscriptions | List + Form + Detail | Customer combobox, template picker, LineEditor, sticky summary |
| Invoices | List | Filter chips: Draft · Confirmed · Paid · **Overdue** · Cancelled |
| Payments | List | Method chips, amount, invoice link, voided strikethrough |
| Discounts | List + Form | Scope selector, product multi-select, **UsageMeter**, auto-apply toggle |
| Taxes / Payment terms | List + Drawer | Simple 3–4 column tables |
| Staff | List + Modal | Create staff (policy-validated password), activate/deactivate |
| Billing runs | List | Date, by, due/created/skipped/failed, duration |
| Audit log | List | Actor, entity, action, time |
| Dev mailbox | List + Preview | Rendered email HTML (non-prod only) |

---

## 8. Print Invoice (`/print/invoice/[id]`)
- A4, 20 mm margins, white, **no sidebar/topbar**; Tailwind `print:hidden` on all chrome.
- Header: logo + company details (left) · "INVOICE" + number, dates (right).
- Bill-to card, lines table (Description, Qty, Unit, Discount, Tax %, Amount), totals, payment status stamp (PAID in green outline / OVERDUE in red), terms and footer note.
- Fonts: Inter only; no shadows; borders 1 px `#D4D4D0`; orange used only for the logo tile and accent rule.
- Toolbar (screen only): **Print / Save as PDF** (`window.print()`), Back.

---

## 9. Motion & Interaction
- Durations 150 ms (hover/press), 200 ms (menus, dropdowns), 280 ms (modal/drawer). Easing `cubic-bezier(.2,.8,.2,1)`.
- Charts animate once on mount (600 ms). Number counters on KPI cards only on first load.
- Respect `prefers-reduced-motion`: disable counters, shimmer and parallax.

---

## 10. Responsive Behaviour

| Breakpoint | Behaviour |
|---|---|
| `< 640` | Single column; KPIs as horizontal scroll-snap row; tables → cards; modals full-screen sheets |
| `640–1023` | 2-column grids; sidebar drawer |
| `≥ 1024` | Full shell with fixed sidebar; 4–5 KPI columns |
| `≥ 1440` | Content max-width 1360, centred inside the panel |

---

## 11. Accessibility Checklist
- Contrast per §3.1 rules; never convey status by colour alone (pill always has text).
- Every input has a visible `<label>`; errors linked with `aria-describedby`.
- Focus ring visible on all interactive elements; logical tab order; modals trap focus and close on Esc.
- Icon-only buttons have `aria-label`.
- Tables use `<th scope>`; sortable headers expose `aria-sort`.
- Toasts use `role="status"`; blocking errors use `role="alert"`.
- Touch targets ≥ 44 × 44 px.

---

## 12. Microcopy Standards

| Situation | Copy |
|---|---|
| Billing result | "Processed 42 subscriptions · 42 invoices created · 240 ms" |
| Billing, nothing due | "Nothing to bill — all subscriptions are up to date." |
| Duplicate protection | "Running twice is safe — duplicates are skipped." |
| Invalid transition | "This subscription can't move to Active from Draft. Confirm it first." |
| Plan policy | "This plan doesn't allow pausing." |
| Overpayment | "Amount is more than the ₹X still due." |
| Forgot password (always) | "If that email is registered, a reset link is on its way." |
| Empty list | "No invoices yet. Run Billing Day to create your first batch." |
| Destructive confirm | State the object and consequence; button repeats the verb ("Cancel invoice") |

---

## 13. UI Consistency Checklist (use in every PR review)
- [ ] Colours only from tokens (no raw hex outside `globals.css`).
- [ ] Fonts only Urbanist / Inter; numbers tabular.
- [ ] Primary action is a black pill; at most one Accent (orange) button per screen.
- [ ] Statuses use `StatusPill` with the mapping in §6.3.
- [ ] List pages use `DataTable` with server pagination; detail pages use the Detail template.
- [ ] Subscription and invoice details show the `StatusRibbon`.
- [ ] Loading skeleton, empty state and error state exist.
- [ ] Money formatted with the shared `formatMoney()`; dates with `formatDate()`.
- [ ] Works at 360 px and 1440 px; keyboard operable; focus visible.
- [ ] No component duplicated outside `components/ui` or `components/shared`.

---

## 14. Component → Owner Map

| Component group | Path | Owner |
|---|---|---|
| shadcn primitives, Button, Input, Modal, Toast, Tabs, Badge | `src/components/ui/` | M3 |
| AppShell, Sidebar, Topbar, PageHeader, DataTable, StatusPill, StatusRibbon, LineEditor, Timeline, ConfirmDialog, EmptyState | `src/components/shared/` | M3 |
| Chart wrappers (Area, Bar, Donut, Sparkline), KPI card, DashboardFilters | `src/components/charts/`, `src/components/dashboard/` | M4 |
| Landing sections, auth layout, PasswordInput checklist | `src/components/marketing/`, `src/components/auth/` | M4 |
| Invoice print layout | `src/components/print/` | M4 |
| Admin settings widgets (Tax drawer, Staff modal, Settings forms) | `src/features/settings/` | M1 |
| Discount form, UsageMeter, Billing history | `src/features/discounts/`, `src/features/billing/` | M2 |
