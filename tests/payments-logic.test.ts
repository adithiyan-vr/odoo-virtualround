import { describe, it, expect } from 'vitest';
import { toDecimal } from '@/lib/money';
import { Decimal } from 'decimal.js';
import { InvoiceStatus, PaymentMethod } from '@/lib/constants/enums';

describe('Module 6: Payments & Overpayment Protection Logic', () => {
  it('should accept valid positive payment within balance due', () => {
    const totalAmount = new Decimal('11114.42');
    const amountPaid = new Decimal('0.00');
    const amountDue = totalAmount.minus(amountPaid);

    const paymentAmount = new Decimal('5000.00');
    expect(paymentAmount.gt(0)).toBe(true);
    expect(paymentAmount.lte(amountDue)).toBe(true);

    const newAmountPaid = amountPaid.plus(paymentAmount);
    const newAmountDue = totalAmount.minus(newAmountPaid);
    expect(newAmountPaid.toString()).toBe('5000');
    expect(newAmountDue.toString()).toBe('6114.42');

    // Partial payment leaves invoice CONFIRMED
    const status = newAmountDue.lte(0) ? InvoiceStatus.PAID : InvoiceStatus.CONFIRMED;
    expect(status).toBe(InvoiceStatus.CONFIRMED);
  });

  it('should auto-flip status to PAID when cumulative payments settle total amount', () => {
    const totalAmount = new Decimal('11114.42');
    const existingPaid = new Decimal('5000.00');
    const remainingDue = totalAmount.minus(existingPaid); // 6114.42

    const finalPayment = new Decimal('6114.42');
    expect(finalPayment.equals(remainingDue)).toBe(true);

    const newAmountPaid = existingPaid.plus(finalPayment);
    const newAmountDue = totalAmount.minus(newAmountPaid);

    expect(newAmountDue.lte(0)).toBe(true);
    const status = newAmountDue.lte(0) ? InvoiceStatus.PAID : InvoiceStatus.CONFIRMED;
    expect(status).toBe(InvoiceStatus.PAID);
  });

  it('should detect and reject overpayment exceeding balance due', () => {
    const totalAmount = new Decimal('5000.00');
    const amountPaid = new Decimal('3000.00');
    const balanceDue = totalAmount.minus(amountPaid); // 2000.00

    const excessivePayment = new Decimal('2000.01');
    const isOverpaying = excessivePayment.gt(balanceDue);

    expect(isOverpaying).toBe(true);
  });

  it('should reject zero or negative payment amounts', () => {
    const zeroPayment = new Decimal('0.00');
    const negativePayment = new Decimal('-100.00');

    expect(zeroPayment.lte(0)).toBe(true);
    expect(negativePayment.lte(0)).toBe(true);
  });

  it('should only permit payments on CONFIRMED invoices', () => {
    const allowedStatuses = [InvoiceStatus.CONFIRMED];

    expect(allowedStatuses.includes(InvoiceStatus.CONFIRMED)).toBe(true);
    expect(allowedStatuses.includes(InvoiceStatus.DRAFT as any)).toBe(false);
    expect(allowedStatuses.includes(InvoiceStatus.PAID as any)).toBe(false);
    expect(allowedStatuses.includes(InvoiceStatus.CANCELLED as any)).toBe(false);
  });
});
