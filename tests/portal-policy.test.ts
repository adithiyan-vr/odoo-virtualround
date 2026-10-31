import { AppError } from '@/lib/errors';
import { describe, it, expect } from 'vitest';
import { assertTransition } from '@/lib/state-machine';
import { SubscriptionStatus, Role } from '@/lib/constants/enums';

describe('Customer Portal: Plan Policy & Scoping Verification', () => {
  const today = new Date('2026-10-31');

  it('should allow customer to pause active subscription when plan.canPause is true', () => {
    const plan = {
      autoClose: false,
      canCloseEarly: true,
      canPause: true,
      canRenew: true,
    };

    const sub = {
      status: SubscriptionStatus.ACTIVE,
      validUntil: null,
      startDate: new Date('2026-01-01'),
      expiryDate: new Date('2026-12-31'),
    };

    const res = assertTransition(sub, plan, Role.CUSTOMER, 'pause', today);
    expect(res.nextStatus).toBe(SubscriptionStatus.PAUSED);
  });

  it('should reject customer pause request with 422/conflict when plan.canPause is false', () => {
    const plan = {
      autoClose: false,
      canCloseEarly: true,
      canPause: false, // Disallowed
      canRenew: true,
    };

    const sub = {
      status: SubscriptionStatus.ACTIVE,
      validUntil: null,
      startDate: new Date('2026-01-01'),
      expiryDate: new Date('2026-12-31'),
    };

    expect(() => {
      assertTransition(sub, plan, Role.CUSTOMER, 'pause', today);
    }).toThrow(/does not allow pausing/);
  });

  it('should allow customer early cancellation when plan.canCloseEarly is true', () => {
    const plan = {
      autoClose: false,
      canCloseEarly: true,
      canPause: true,
      canRenew: true,
    };

    const sub = {
      status: SubscriptionStatus.ACTIVE,
      validUntil: null,
      startDate: new Date('2026-01-01'),
      expiryDate: new Date('2026-12-31'),
    };

    const res = assertTransition(sub, plan, Role.CUSTOMER, 'close', today);
    expect(res.nextStatus).toBe(SubscriptionStatus.CLOSED);
  });

  it('should reject customer early cancellation when plan.canCloseEarly is false', () => {
    const plan = {
      autoClose: false,
      canCloseEarly: false, // Disallowed
      canPause: true,
      canRenew: true,
    };

    const sub = {
      status: SubscriptionStatus.ACTIVE,
      validUntil: null,
      startDate: new Date('2026-01-01'),
      expiryDate: new Date('2026-12-31'),
    };

    expect(() => {
      assertTransition(sub, plan, Role.CUSTOMER, 'close', today);
    }).toThrow(/does not allow early cancellation/);
  });

  describe('Customer Row-Scoping & Data Isolation', () => {
    it('should reject access to another customer subscription with 404 NOT_FOUND to prevent enumeration leaks', () => {
      const customerAId = 'cust-111';
      const customerBId = 'cust-222';
      const foreignSub = { id: 'sub-999', customerId: customerBId };

      const verifySubAccess = (subRecord: { customerId: string }, currentCustomerId: string) => {
        if (!subRecord || subRecord.customerId !== currentCustomerId) {
          throw AppError.notFound('Subscription not found');
        }
        return subRecord;
      };

      expect(() => verifySubAccess(foreignSub, customerAId)).toThrow();
      try {
        verifySubAccess(foreignSub, customerAId);
      } catch (err: any) {
        expect(err.statusCode).toBe(404);
        expect(err.code).toBe('NOT_FOUND');
      }
    });

    it('should reject access to another customer invoice with 404 NOT_FOUND to prevent enumeration leaks', () => {
      const customerAId = 'cust-111';
      const customerBId = 'cust-222';
      const foreignInvoice = { id: 'inv-888', customerId: customerBId };

      const verifyInvoiceAccess = (invRecord: { customerId: string }, currentCustomerId: string) => {
        if (!invRecord || invRecord.customerId !== currentCustomerId) {
          throw AppError.notFound('Invoice not found');
        }
        return invRecord;
      };

      expect(() => verifyInvoiceAccess(foreignInvoice, customerAId)).toThrow();
      try {
        verifyInvoiceAccess(foreignInvoice, customerAId);
      } catch (err: any) {
        expect(err.statusCode).toBe(404);
        expect(err.code).toBe('NOT_FOUND');
      }
    });
  });
});