/**
 * State Machine Tests — M2
 *
 * Tests every allowed and forbidden transition, plan policy enforcement,
 * and quotation-expiry blocking.
 */

import { describe, it, expect } from 'vitest';
import { allowedActions, assertTransition, SubSnapshot } from '@/lib/state-machine';
import { PlanPolicy } from '@/lib/state-machine';

const TODAY = new Date('2026-11-15');
const FUTURE = new Date('2026-12-31');
const PAST = new Date('2026-10-01');

const FULL_PLAN: PlanPolicy = {
  canPause: true,
  canCloseEarly: true,
  canRenew: true,
  autoClose: false,
  validTo: null,
};

const RESTRICTED_PLAN: PlanPolicy = {
  canPause: false,
  canCloseEarly: false,
  canRenew: false,
  autoClose: false,
  validTo: null,
};

function snap(status: SubSnapshot['status'], overrides: Partial<SubSnapshot> = {}): SubSnapshot {
  return {
    status,
    validUntil: null,
    startDate: PAST,
    expiryDate: FUTURE,
    ...overrides,
  };
}

// ─── allowedActions ────────────────────────────────────────────────────────

describe('allowedActions', () => {
  it('DRAFT → send_quotation + close', () => {
    const actions = allowedActions(snap('DRAFT'), FULL_PLAN, 'ADMIN', TODAY);
    expect(actions).toContain('send_quotation');
    expect(actions).toContain('close');
    expect(actions).not.toContain('confirm');
  });

  it('QUOTATION → confirm + revise + close', () => {
    const actions = allowedActions(snap('QUOTATION'), FULL_PLAN, 'ADMIN', TODAY);
    expect(actions).toContain('confirm');
    expect(actions).toContain('revise');
    expect(actions).toContain('close');
  });

  it('QUOTATION expired → confirm NOT allowed', () => {
    const expired = snap('QUOTATION', { validUntil: PAST });
    const actions = allowedActions(expired, FULL_PLAN, 'ADMIN', TODAY);
    expect(actions).not.toContain('confirm');
  });

  it('CONFIRMED → activate when startDate <= today', () => {
    const actions = allowedActions(snap('CONFIRMED'), FULL_PLAN, 'ADMIN', TODAY);
    expect(actions).toContain('activate');
  });

  it('CONFIRMED → activate NOT allowed before startDate', () => {
    const future = snap('CONFIRMED', { startDate: new Date('2026-12-01') });
    const actions = allowedActions(future, FULL_PLAN, 'ADMIN', TODAY);
    expect(actions).not.toContain('activate');
  });

  it('ACTIVE → pause when plan.canPause', () => {
    const actions = allowedActions(snap('ACTIVE'), FULL_PLAN, 'ADMIN', TODAY);
    expect(actions).toContain('pause');
  });

  it('ACTIVE → pause NOT allowed when plan.canPause=false', () => {
    const actions = allowedActions(snap('ACTIVE'), RESTRICTED_PLAN, 'ADMIN', TODAY);
    expect(actions).not.toContain('pause');
  });

  it('ACTIVE → renew when plan.canRenew', () => {
    const actions = allowedActions(snap('ACTIVE'), FULL_PLAN, 'ADMIN', TODAY);
    expect(actions).toContain('renew');
  });

  it('ACTIVE → close allowed for ADMIN even without canCloseEarly', () => {
    const actions = allowedActions(snap('ACTIVE'), RESTRICTED_PLAN, 'ADMIN', TODAY);
    expect(actions).toContain('close');
  });

  it('ACTIVE → close NOT allowed for CUSTOMER without canCloseEarly', () => {
    const actions = allowedActions(snap('ACTIVE'), RESTRICTED_PLAN, 'CUSTOMER', TODAY);
    expect(actions).not.toContain('close');
  });

  it('ACTIVE → close allowed for CUSTOMER when canCloseEarly', () => {
    const actions = allowedActions(snap('ACTIVE'), FULL_PLAN, 'CUSTOMER', TODAY);
    expect(actions).toContain('close');
  });

  it('PAUSED → resume + close', () => {
    const actions = allowedActions(snap('PAUSED'), FULL_PLAN, 'ADMIN', TODAY);
    expect(actions).toContain('resume');
    expect(actions).toContain('close');
  });

  it('CLOSED → nothing allowed', () => {
    const actions = allowedActions(snap('CLOSED'), FULL_PLAN, 'ADMIN', TODAY);
    expect(actions).toHaveLength(0);
  });
});

// ─── assertTransition ─────────────────────────────────────────────────────

describe('assertTransition', () => {
  it('DRAFT → send_quotation → QUOTATION', () => {
    const { nextStatus } = assertTransition(snap('DRAFT'), FULL_PLAN, 'ADMIN', 'send_quotation', TODAY);
    expect(nextStatus).toBe('QUOTATION');
  });

  it('QUOTATION → confirm → CONFIRMED', () => {
    const { nextStatus } = assertTransition(snap('QUOTATION'), FULL_PLAN, 'ADMIN', 'confirm', TODAY);
    expect(nextStatus).toBe('CONFIRMED');
  });

  it('CONFIRMED → activate → ACTIVE', () => {
    const { nextStatus } = assertTransition(snap('CONFIRMED'), FULL_PLAN, 'ADMIN', 'activate', TODAY);
    expect(nextStatus).toBe('ACTIVE');
  });

  it('ACTIVE → pause → PAUSED', () => {
    const { nextStatus } = assertTransition(snap('ACTIVE'), FULL_PLAN, 'ADMIN', 'pause', TODAY);
    expect(nextStatus).toBe('PAUSED');
  });

  it('PAUSED → resume → ACTIVE', () => {
    const { nextStatus } = assertTransition(snap('PAUSED'), FULL_PLAN, 'ADMIN', 'resume', TODAY);
    expect(nextStatus).toBe('ACTIVE');
  });

  it('ACTIVE → close → CLOSED with MANUAL reason for ADMIN', () => {
    const { nextStatus, closeReason } = assertTransition(snap('ACTIVE'), FULL_PLAN, 'ADMIN', 'close', TODAY);
    expect(nextStatus).toBe('CLOSED');
    expect(closeReason).toBe('MANUAL');
  });

  it('ACTIVE → close → CLOSED with CUSTOMER_REQUEST for CUSTOMER', () => {
    const { nextStatus, closeReason } = assertTransition(snap('ACTIVE'), FULL_PLAN, 'CUSTOMER', 'close', TODAY);
    expect(nextStatus).toBe('CLOSED');
    expect(closeReason).toBe('CUSTOMER_REQUEST');
  });

  it('throws CONFLICT on illegal jump (DRAFT → activate)', () => {
    expect(() =>
      assertTransition(snap('DRAFT'), FULL_PLAN, 'ADMIN', 'activate', TODAY)
    ).toThrow();
  });

  it('throws BUSINESS_RULE when pause not allowed by plan', () => {
    expect(() =>
      assertTransition(snap('ACTIVE'), RESTRICTED_PLAN, 'ADMIN', 'pause', TODAY)
    ).toThrow(/plan does not allow pausing/i);
  });

  it('throws BUSINESS_RULE when expired quotation is confirmed', () => {
    const expired = snap('QUOTATION', { validUntil: PAST });
    expect(() =>
      assertTransition(expired, FULL_PLAN, 'ADMIN', 'confirm', TODAY)
    ).toThrow(/expired/i);
  });

  it('throws BUSINESS_RULE for customer close without canCloseEarly', () => {
    expect(() =>
      assertTransition(snap('ACTIVE'), RESTRICTED_PLAN, 'CUSTOMER', 'close', TODAY)
    ).toThrow(/early cancellation/i);
  });

  it('renew returns same status', () => {
    const { nextStatus } = assertTransition(snap('ACTIVE'), FULL_PLAN, 'ADMIN', 'renew', TODAY);
    expect(nextStatus).toBe('ACTIVE');
  });
});

