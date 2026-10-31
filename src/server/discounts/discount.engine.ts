/**
 * Discount Engine (pure — no I/O, fully unit-tested)
 *
 * Input:  candidate discounts, invoice lines (with gross & productId), invoiceDate
 * Output: per-line discountAmount + list of applied { discountId, amount }
 *
 * Algorithm (from ARCHITECTURE §7.3):
 *   1. Filter active, in-window, not-exhausted candidates
 *   2. PRODUCT scope: per-line, check thresholds → best saving per line
 *   3. SUBSCRIPTION scope: on remaining invoice gross → proportional allocation
 *   4. Clamp all lines ≥ 0
 */

import { Decimal } from 'decimal.js';
import { round2, toDecimal } from '@/lib/money';
import { DiscountScope, DiscountType } from '@/lib/constants/enums';

// ─── Input / Output types ────────────────────────────────────────────────────

export interface DiscountCandidate {
  id: string;
  type: DiscountType;           // 'FIXED' | 'PERCENT'
  value: Decimal | number | string;
  scope: DiscountScope;         // 'PRODUCT' | 'SUBSCRIPTION'
  minPurchase: Decimal | number | string | null;
  minQuantity: number | null;
  startDate: Date;
  endDate: Date | null;
  maxUses: number | null;
  currentUses: number;
  autoApply: boolean;
  isActive: boolean;
  productIds: string[];         // empty = applies to all products (SUBSCRIPTION scope)
  createdAt: Date;
}

export interface DiscountInputLine {
  id: string;                   // subscriptionLine id (used as key)
  productId: string | null;     // null for plan-fee line
  quantity: number;
  unitPrice: Decimal | number | string;
  // computed gross BEFORE any discount
  gross: Decimal;               // quantity × unitPrice
}

export interface DiscountOutputLine {
  lineId: string;
  discountAmount: Decimal;      // ≥ 0, ≤ gross
}

export interface AppliedDiscount {
  discountId: string;
  amount: Decimal;
}

export interface DiscountEngineResult {
  lines: DiscountOutputLine[];
  applied: AppliedDiscount[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isActive(d: DiscountCandidate, invoiceDate: Date): boolean {
  if (!d.isActive) return false;
  if (d.startDate > invoiceDate) return false;
  if (d.endDate && invoiceDate > d.endDate) return false;
  if (d.maxUses !== null && d.currentUses >= d.maxUses) return false;
  return true;
}

function computeValue(
  d: DiscountCandidate,
  baseAmount: Decimal
): Decimal {
  if (d.type === 'PERCENT') {
    return round2(baseAmount.mul(toDecimal(d.value)).div(100));
  }
  // FIXED — amount of the discount itself (not per-item)
  return round2(toDecimal(d.value));
}

/**
 * Tie-break: earliest endDate (nulls last), then oldest createdAt.
 */
function tieBreak(a: DiscountCandidate, b: DiscountCandidate): number {
  if (a.endDate !== null && b.endDate !== null) {
    if (a.endDate < b.endDate) return -1;
    if (a.endDate > b.endDate) return 1;
  } else if (a.endDate !== null) {
    return -1;
  } else if (b.endDate !== null) {
    return 1;
  }
  return a.createdAt.getTime() - b.createdAt.getTime();
}

// ─── Main engine ─────────────────────────────────────────────────────────────

export function applyDiscounts(
  candidates: DiscountCandidate[],
  lines: DiscountInputLine[],
  invoiceDate: Date
): DiscountEngineResult {
  // 1. Filter active candidates
  const active = candidates.filter((d) => isActive(d, invoiceDate));

  // ── Step 2: PRODUCT-scope discounts ─────────────────────────────────────
  // Track winning product discount per line: lineId -> { discountId, amount }
  const productWinners = new Map<string, { discountId: string; amount: Decimal }>();

  const productDiscounts = active
    .filter((d) => d.scope === 'PRODUCT')
    .sort(tieBreak);

  for (const d of productDiscounts) {
    // Eligible lines: productId must be in d.productIds (or empty = all)
    const eligible = lines.filter(
      (l) =>
        l.productId !== null &&
        (d.productIds.length === 0 || d.productIds.includes(l.productId))
    );
    if (eligible.length === 0) continue;

    const eligibleGross = eligible.reduce((s, l) => s.add(l.gross), new Decimal(0));
    const eligibleQty = eligible.reduce((s, l) => s + l.quantity, 0);

    // Check thresholds
    if (d.minPurchase !== null && eligibleGross.lt(toDecimal(d.minPurchase))) continue;
    if (d.minQuantity !== null && eligibleQty < d.minQuantity) continue;

    // Calculate total saving this discount gives across eligible lines
    const totalSaving = computeValue(d, eligibleGross);
    if (totalSaving.lte(0)) continue;

    // Allocate proportionally across eligible lines; keep best per line
    let remainder = totalSaving;
    for (let i = 0; i < eligible.length; i++) {
      const l = eligible[i];
      const currentGross = l.gross;
      let lineSaving: Decimal;
      if (i === eligible.length - 1) {
        lineSaving = remainder;
      } else {
        lineSaving = round2(totalSaving.mul(currentGross).div(eligibleGross));
        remainder = remainder.sub(lineSaving);
      }

      // Keep the BEST (largest) discount per line
      const current = productWinners.get(l.id)?.amount ?? new Decimal(0);
      if (lineSaving.gt(current)) {
        productWinners.set(l.id, { discountId: d.id, amount: lineSaving });
      }
    }
  }

  // Working copy — lineId -> discount amount
  const discountPerLine = new Map<string, Decimal>();
  for (const l of lines) {
    discountPerLine.set(l.id, productWinners.get(l.id)?.amount ?? new Decimal(0));
  }

  // ── Step 3: SUBSCRIPTION-scope discounts ─────────────────────────────────
  const subDiscounts = active
    .filter((d) => d.scope === 'SUBSCRIPTION')
    .sort(tieBreak);

  // Remaining (post product-discount) gross
  const remainingGross = lines.reduce((s, l) => {
    const disc = discountPerLine.get(l.id) ?? new Decimal(0);
    return s.add(Decimal.max(0, l.gross.sub(disc)));
  }, new Decimal(0));

  // For threshold checks: total invoice qty
  const totalQty = lines.reduce((s, l) => s + l.quantity, 0);

  let appliedSubDiscount: AppliedDiscount | null = null;

  for (const d of subDiscounts) {
    if (d.minPurchase !== null && remainingGross.lt(toDecimal(d.minPurchase))) continue;
    if (d.minQuantity !== null && totalQty < d.minQuantity) continue;

    const totalSaving = computeValue(d, remainingGross);
    if (totalSaving.lte(0)) continue;

    // Allocate proportionally across all lines; remainder to last line
    let remainder2 = totalSaving;
    let actualAllocated = new Decimal(0);

    for (let i = 0; i < lines.length; i++) {
      const l = lines[i];
      const lineRemaining = Decimal.max(0, l.gross.sub(discountPerLine.get(l.id) ?? new Decimal(0)));
      if (lineRemaining.lte(0)) continue;

      let lineSaving: Decimal;
      if (i === lines.length - 1) {
        lineSaving = remainder2;
      } else {
        lineSaving = round2(totalSaving.mul(lineRemaining).div(remainingGross));
        remainder2 = remainder2.sub(lineSaving);
      }

      const clampedLineSaving = Decimal.min(lineSaving, lineRemaining);
      actualAllocated = actualAllocated.add(clampedLineSaving);

      const current = discountPerLine.get(l.id) ?? new Decimal(0);
      discountPerLine.set(l.id, current.add(clampedLineSaving));
    }

    if (actualAllocated.gt(0)) {
      appliedSubDiscount = { discountId: d.id, amount: actualAllocated };
    }
    break; // apply at most ONE subscription-scope discount (largest/first by tiebreak)
  }

  // ── Step 4: Clamp ≥ 0 and ≤ gross ────────────────────────────────────────
  const outputLines: DiscountOutputLine[] = lines.map((l) => {
    const raw = discountPerLine.get(l.id) ?? new Decimal(0);
    const clamped = Decimal.min(Decimal.max(raw, 0), l.gross);
    return { lineId: l.id, discountAmount: clamped };
  });

  // Calculate actual applied amounts for PRODUCT discounts
  const productDiscountTotals = new Map<string, Decimal>();
  for (const [lineId, winner] of productWinners.entries()) {
    const outputLine = outputLines.find((ol) => ol.lineId === lineId);
    if (!outputLine) continue;
    // The portion attributable to product discount (up to winner.amount)
    const effectiveProductSaving = Decimal.min(outputLine.discountAmount, winner.amount);
    if (effectiveProductSaving.gt(0)) {
      const prev = productDiscountTotals.get(winner.discountId) ?? new Decimal(0);
      productDiscountTotals.set(winner.discountId, prev.add(effectiveProductSaving));
    }
  }

  const applied: AppliedDiscount[] = [];
  for (const [discountId, amount] of productDiscountTotals.entries()) {
    if (amount.gt(0)) {
      applied.push({ discountId, amount });
    }
  }

  if (appliedSubDiscount && appliedSubDiscount.amount.gt(0)) {
    applied.push(appliedSubDiscount);
  }

  return { lines: outputLines, applied };
}
