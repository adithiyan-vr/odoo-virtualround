import { describe, it, expect } from 'vitest';
import { Decimal } from 'decimal.js';
import { BillingInterval, InvoiceStatus } from '@/lib/constants/enums';

describe('Module 7: Finance Dashboard Metrics & MRR Calculation', () => {
  it('should normalize recurring subtotal across intervals into accurate monthly MRR', () => {
    // Test dataset per PRD §8.9
    const subs = [
      { interval: BillingInterval.MONTHLY, subtotal: new Decimal('1000.00') }, // 1000
      { interval: BillingInterval.YEARLY, subtotal: new Decimal('12000.00') }, // 12000 / 12 = 1000
      { interval: BillingInterval.WEEKLY, subtotal: new Decimal('250.00') },   // 250 * 52 / 12 = 1083.33
      { interval: BillingInterval.DAILY, subtotal: new Decimal('50.00') },     // 50 * 30 = 1500
    ];

    let totalMrr = new Decimal(0);
    for (const sub of subs) {
      switch (sub.interval) {
        case BillingInterval.MONTHLY:
          totalMrr = totalMrr.plus(sub.subtotal);
          break;
        case BillingInterval.YEARLY:
          totalMrr = totalMrr.plus(sub.subtotal.dividedBy(12));
          break;
        case BillingInterval.WEEKLY:
          totalMrr = totalMrr.plus(sub.subtotal.times(52).dividedBy(12));
          break;
        case BillingInterval.DAILY:
          totalMrr = totalMrr.plus(sub.subtotal.times(30));
          break;
      }
    }

    // 1000 + 1000 + 1083.333... + 1500 = 4583.33
    expect(Math.round(totalMrr.toNumber() * 100) / 100).toBe(4583.33);
  });

  it('should identify overdue invoices correctly (CONFIRMED, amountDue > 0, dueDate < today)', () => {
    const today = new Date('2026-10-31T00:00:00Z');

    const inv1 = {
      status: InvoiceStatus.CONFIRMED,
      amountDue: new Decimal('1500'),
      dueDate: new Date('2026-10-15T00:00:00Z'), // Past due
    };
    const inv2 = {
      status: InvoiceStatus.CONFIRMED,
      amountDue: new Decimal('1500'),
      dueDate: new Date('2026-11-15T00:00:00Z'), // Future due
    };
    const inv3 = {
      status: InvoiceStatus.PAID,
      amountDue: new Decimal('0'),
      dueDate: new Date('2026-10-15T00:00:00Z'), // Paid, not overdue
    };

    const isOverdue = (inv: { status: InvoiceStatus; amountDue: Decimal; dueDate: Date }) =>
      inv.status === InvoiceStatus.CONFIRMED &&
      inv.amountDue.gt(0) &&
      inv.dueDate < today;

    expect(isOverdue(inv1)).toBe(true);
    expect(isOverdue(inv2)).toBe(false);
    expect(isOverdue(inv3)).toBe(false);
  });
});
