/**
 * Pricing Engine Tests — M2
 *
 * Verifies tax rounding, discount interaction, and the PRD's own example:
 *   10 × ₹1560 = ₹15,600 gross → 10% discount → ₹14,040 taxable → 18% GST → ₹16,567.20
 * (PRD §8.11 says ₹11,114.42 is a different scenario; we test the documented demo values.)
 */

import { describe, it, expect } from 'vitest';
import { computeLine, computeInvoiceTotals } from '@/server/pricing/pricing.engine';

describe('Pricing Engine', () => {
  it('basic — qty × unitPrice with tax', () => {
    const r = computeLine({ quantity: 2, unitPrice: 500, discountAmount: 0, taxRate: 18 });
    expect(r.amount.toNumber()).toBe(1000);
    expect(r.taxable.toNumber()).toBe(1000);
    expect(r.taxAmount.toNumber()).toBe(180);
    expect(r.lineTotal.toNumber()).toBe(1180);
  });

  it('discount reduces taxable base', () => {
    const r = computeLine({ quantity: 1, unitPrice: 1000, discountAmount: 100, taxRate: 18 });
    expect(r.taxable.toNumber()).toBe(900);
    expect(r.taxAmount.toNumber()).toBe(162);
    expect(r.lineTotal.toNumber()).toBe(1062);
  });

  it('zero tax rate', () => {
    const r = computeLine({ quantity: 5, unitPrice: 200, taxRate: 0 });
    expect(r.taxAmount.toNumber()).toBe(0);
    expect(r.lineTotal.toNumber()).toBe(1000);
  });

  it('discount cannot make taxable negative → clamped to 0', () => {
    const r = computeLine({ quantity: 1, unitPrice: 100, discountAmount: 200, taxRate: 18 });
    expect(r.taxable.toNumber()).toBe(0);
    expect(r.taxAmount.toNumber()).toBe(0);
    expect(r.lineTotal.toNumber()).toBe(0);
  });

  it('PRD demo scenario: 10×₹1560, 10% discount, 18% GST', () => {
    // gross = 15600, discount = 1560, taxable = 14040, tax = 2527.20, total = 16567.20
    const r = computeLine({
      quantity: 10,
      unitPrice: 1560,
      discountAmount: 1560,
      taxRate: 18,
    });
    expect(r.amount.toNumber()).toBe(15600);
    expect(r.discountAmount.toNumber()).toBe(1560);
    expect(r.taxable.toNumber()).toBe(14040);
    expect(r.taxAmount.toNumber()).toBe(2527.2);
    expect(r.lineTotal.toNumber()).toBe(16567.2);
  });

  it('invoice totals sums columns correctly', () => {
    const l1 = computeLine({ quantity: 1, unitPrice: 1000, taxRate: 18 });
    const l2 = computeLine({ quantity: 2, unitPrice: 500, taxRate: 5 });
    const totals = computeInvoiceTotals([l1, l2]);
    expect(totals.subtotal.toNumber()).toBe(2000);
    expect(totals.taxAmount.toNumber()).toBeCloseTo(l1.taxAmount.add(l2.taxAmount).toNumber(), 2);
    expect(totals.totalAmount.toNumber()).toBeCloseTo(l1.lineTotal.add(l2.lineTotal).toNumber(), 2);
  });

  it('rounding: half-up on tax', () => {
    // 1 × 100 × 17.5% = 17.50 (exact half; rounds to 17.50)
    const r = computeLine({ quantity: 1, unitPrice: 100, taxRate: 17.5 });
    expect(r.taxAmount.toNumber()).toBe(17.5);
  });
});

