import { describe, it, expect } from 'vitest';
import { Decimal, round2, formatMoney } from '@/lib/money';

describe('Money Precision & Surcharge Math', () => {
  it('should maintain exact precision using Decimal', () => {
    // Standard float quirk: 0.1 + 0.2 = 0.30000000000000004
    const a = new Decimal('0.1');
    const b = new Decimal('0.2');
    expect(a.plus(b).toString()).toBe('0.3');
  });

  it('should calculate Odoo brand variant surcharge accurately (+560)', () => {
    const baseSalesPrice = new Decimal('1200.00'); // BL-CRM
    const odooVariantSurcharge = new Decimal('560.00'); // Brand=Odoo
    const effectivePrice = round2(baseSalesPrice.plus(odooVariantSurcharge));

    expect(effectivePrice.toString()).toBe('1760');
    expect(effectivePrice.toFixed(2)).toBe('1760.00');
  });

  it('should round tax amounts with half-up rounding', () => {
    // 1760 * 18% = 316.80
    const subtotal = new Decimal('1760.00');
    const taxRate = new Decimal('18.00');
    const tax = round2(subtotal.times(taxRate).dividedBy(100));

    expect(tax.toFixed(2)).toBe('316.80');
    expect(subtotal.plus(tax).toFixed(2)).toBe('2076.80');
  });

  it('should format money in Indian currency notation (en-IN)', () => {
    const formatted = formatMoney('1234567.89');
    expect(formatted).toContain('12,34,567.89');
  });
});
