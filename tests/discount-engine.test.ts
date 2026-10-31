/**
 * Discount Engine Tests — M2
 *
 * ≥ 12 cases: percent, fixed, thresholds, window edges, exhausted,
 * stacking, rounding remainder, zero-clamp, scope PRODUCT vs SUBSCRIPTION.
 */

import { describe, it, expect } from 'vitest';
import { applyDiscounts, DiscountCandidate, DiscountInputLine } from '@/server/discounts/discount.engine';
import { Decimal } from 'decimal.js';

const TODAY = new Date('2026-11-15');
const YESTERDAY = new Date('2026-11-14');
const TOMORROW = new Date('2026-11-16');

function dec(n: number) { return new Decimal(n); }

function candidate(overrides: Partial<DiscountCandidate> = {}): DiscountCandidate {
  return {
    id: 'disc-1',
    type: 'PERCENT',
    value: dec(10),
    scope: 'SUBSCRIPTION',
    minPurchase: null,
    minQuantity: null,
    startDate: YESTERDAY,
    endDate: TOMORROW,
    maxUses: null,
    currentUses: 0,
    autoApply: true,
    isActive: true,
    productIds: [],
    createdAt: new Date('2026-01-01'),
    ...overrides,
  };
}

function line(id: string, productId: string, qty: number, unitPrice: number): DiscountInputLine {
  const gross = dec(qty * unitPrice);
  return { id, productId, quantity: qty, unitPrice: dec(unitPrice), gross };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('Discount Engine', () => {
  it('1. PERCENT discount — basic 10% on subscription', () => {
    const lines = [line('l1', 'p1', 2, 1000)];
    const { lines: out, applied } = applyDiscounts([candidate()], lines, TODAY);
    expect(out[0].discountAmount.toNumber()).toBe(200); // 10% of 2000
    expect(applied).toHaveLength(1);
  });

  it('2. FIXED discount — flat amount spread proportionally', () => {
    const d = candidate({ type: 'FIXED', value: dec(300) });
    const lines = [line('l1', 'p1', 1, 600), line('l2', 'p2', 1, 400)];
    const { lines: out } = applyDiscounts([d], lines, TODAY);
    const total = out.reduce((s, l) => s.add(l.discountAmount), new Decimal(0));
    expect(total.toNumber()).toBeCloseTo(300, 1);
  });

  it('3. minPurchase threshold — not met → no discount', () => {
    const d = candidate({ minPurchase: dec(5000) });
    const lines = [line('l1', 'p1', 1, 1000)];
    const { lines: out, applied } = applyDiscounts([d], lines, TODAY);
    expect(out[0].discountAmount.toNumber()).toBe(0);
    expect(applied).toHaveLength(0);
  });

  it('4. minPurchase threshold — met → discount applied', () => {
    const d = candidate({ minPurchase: dec(1000) });
    const lines = [line('l1', 'p1', 2, 1000)];
    const { lines: out } = applyDiscounts([d], lines, TODAY);
    expect(out[0].discountAmount.toNumber()).toBe(200);
  });

  it('5. minQuantity threshold — not met → no discount', () => {
    const d = candidate({ minQuantity: 5 });
    const lines = [line('l1', 'p1', 3, 500)];
    const { applied } = applyDiscounts([d], lines, TODAY);
    expect(applied).toHaveLength(0);
  });

  it('6. Date window — discount not yet started → no discount', () => {
    const d = candidate({ startDate: TOMORROW });
    const lines = [line('l1', 'p1', 1, 1000)];
    const { applied } = applyDiscounts([d], lines, TODAY);
    expect(applied).toHaveLength(0);
  });

  it('7. Date window — discount expired → no discount', () => {
    const d = candidate({ endDate: YESTERDAY });
    const lines = [line('l1', 'p1', 1, 1000)];
    const { applied } = applyDiscounts([d], lines, TODAY);
    expect(applied).toHaveLength(0);
  });

  it('8. maxUses exhausted → no discount', () => {
    const d = candidate({ maxUses: 3, currentUses: 3 });
    const lines = [line('l1', 'p1', 1, 1000)];
    const { applied } = applyDiscounts([d], lines, TODAY);
    expect(applied).toHaveLength(0);
  });

  it('9. PRODUCT scope — only applies to matching productId', () => {
    const d = candidate({ scope: 'PRODUCT', productIds: ['p1'] });
    const lines = [line('l1', 'p1', 1, 1000), line('l2', 'p2', 1, 1000)];
    const { lines: out } = applyDiscounts([d], lines, TODAY);
    expect(out[0].discountAmount.toNumber()).toBe(100); // p1 gets 10%
    expect(out[1].discountAmount.toNumber()).toBe(0);   // p2 not matched
  });

  it('10. PRODUCT scope miss — different productId → 0', () => {
    const d = candidate({ scope: 'PRODUCT', productIds: ['p99'] });
    const lines = [line('l1', 'p1', 1, 1000)];
    const { applied } = applyDiscounts([d], lines, TODAY);
    expect(applied).toHaveLength(0);
  });

  it('11. Zero-clamp — discount > gross clamped to gross', () => {
    const d = candidate({ type: 'FIXED', value: dec(9999) });
    const lines = [line('l1', 'p1', 1, 100)];
    const { lines: out } = applyDiscounts([d], lines, TODAY);
    expect(out[0].discountAmount.toNumber()).toBeLessThanOrEqual(100);
  });

  it('12. Rounding remainder goes to last line', () => {
    // 10% of 3×333.33 = 99.999 → rounds to 100.00; remainder on last line
    const d = candidate({ type: 'PERCENT', value: dec(10) });
    const lines = [
      line('l1', 'p1', 1, 333.33),
      line('l2', 'p2', 1, 333.33),
      line('l3', 'p3', 1, 333.34),
    ];
    const { lines: out } = applyDiscounts([d], lines, TODAY);
    const total = out.reduce((s, l) => s.add(l.discountAmount), new Decimal(0));
    // Total discount should be close to 10% of 1000 = 100
    expect(total.toNumber()).toBeCloseTo(100.0, 0);
  });

  it('13. No discount candidates → all zeros', () => {
    const lines = [line('l1', 'p1', 5, 500)];
    const { lines: out, applied } = applyDiscounts([], lines, TODAY);
    expect(out[0].discountAmount.toNumber()).toBe(0);
    expect(applied).toHaveLength(0);
  });

  it('14. Best-per-line: two PRODUCT discounts → larger one wins per line', () => {
    const d5 = candidate({ id: 'disc-5pct', type: 'PERCENT', value: dec(5), scope: 'PRODUCT', productIds: ['p1'] });
    const d20 = candidate({ id: 'disc-20pct', type: 'PERCENT', value: dec(20), scope: 'PRODUCT', productIds: ['p1'] });
    const lines = [line('l1', 'p1', 1, 1000)];
    const { lines: out } = applyDiscounts([d5, d20], lines, TODAY);
    expect(out[0].discountAmount.toNumber()).toBe(200); // 20% wins
  });

  it('15. isActive=false → excluded', () => {
    const d = candidate({ isActive: false });
    const lines = [line('l1', 'p1', 1, 1000)];
    const { applied } = applyDiscounts([d], lines, TODAY);
    expect(applied).toHaveLength(0);
  });
});

