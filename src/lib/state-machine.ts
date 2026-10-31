/**
 * Subscription State Machine (pure — no I/O)
 *
 * Single source of truth for:
 *  - Which transitions are allowed from a given state
 *  - Which plan policies restrict a transition
 *  - What actions the current actor may take
 *
 * Used by API responses (allowedTransitions) and by service guards (assertTransition).
 */

import { SubscriptionStatus, CloseReason, Role } from './constants/enums';
import { AppError } from './errors';

// ─── Types ────────────────────────────────────────────────────────────────────

export type SubAction =
  | 'send_quotation'   // DRAFT → QUOTATION
  | 'revise'           // QUOTATION → DRAFT
  | 'confirm'          // QUOTATION → CONFIRMED
  | 'activate'         // CONFIRMED → ACTIVE
  | 'pause'            // ACTIVE → PAUSED
  | 'resume'           // PAUSED → ACTIVE
  | 'close'            // ACTIVE | PAUSED | CONFIRMED | QUOTATION | DRAFT → CLOSED
  | 'renew';           // ACTIVE → ACTIVE (extends expiryDate; stays ACTIVE)

export interface PlanPolicy {
  canPause: boolean;
  canCloseEarly: boolean;
  canRenew: boolean;
  autoClose: boolean;
  validTo?: Date | null;
}

export interface SubSnapshot {
  status: SubscriptionStatus;
  validUntil?: Date | null;    // quotation expiry
  startDate: Date;             // used to block premature activate
  expiryDate: Date;
}

// ─── Allowed action map ───────────────────────────────────────────────────────

/**
 * Returns the set of actions that are structurally allowed (ignoring plan policy)
 * for the given status.  Policy checks narrow this list further.
 */
const BASE_TRANSITIONS: Record<SubscriptionStatus, SubAction[]> = {
  DRAFT:     ['send_quotation', 'close'],
  QUOTATION: ['confirm', 'revise', 'close'],
  CONFIRMED: ['activate', 'close'],
  ACTIVE:    ['pause', 'close', 'renew'],
  PAUSED:    ['resume', 'close'],
  CLOSED:    [],
};

/**
 * Computes the list of actions the given actor may currently take on the subscription.
 *
 * @param sub       - Snapshot of the current subscription
 * @param plan      - Plan policy flags
 * @param actorRole - Role of the requesting user
 * @param today     - Calendar date (pass as parameter so engines stay pure)
 */
export function allowedActions(
  sub: SubSnapshot,
  plan: PlanPolicy,
  actorRole: Role,
  today: Date
): SubAction[] {
  const base: SubAction[] = [...(BASE_TRANSITIONS[sub.status] ?? [])];

  return base.filter((action) => {
    switch (action) {
      case 'pause':
        // Only if plan allows it; customers cannot directly pause via this action
        return plan.canPause;

      case 'close': {
        if (sub.status === 'ACTIVE' || sub.status === 'PAUSED') {
          // Admin/Staff can always close; customer only if canCloseEarly
          if (actorRole === 'CUSTOMER') return plan.canCloseEarly;
          return true; // staff/admin can close even without canCloseEarly
        }
        // DRAFT / QUOTATION / CONFIRMED → always closable (cancel)
        return true;
      }

      case 'renew':
        return plan.canRenew;

      case 'activate': {
        // Cannot activate before startDate
        return today >= sub.startDate;
      }

      case 'confirm': {
        // Cannot confirm expired quotation
        if (sub.validUntil && today > sub.validUntil) return false;
        return true;
      }

      default:
        return true;
    }
  });
}

// ─── Transition target map ────────────────────────────────────────────────────

const ACTION_TO_STATUS: Partial<Record<SubAction, SubscriptionStatus>> = {
  send_quotation: 'QUOTATION',
  revise:         'DRAFT',
  confirm:        'CONFIRMED',
  activate:       'ACTIVE',
  pause:          'PAUSED',
  resume:         'ACTIVE',
  close:          'CLOSED',
  // renew keeps status ACTIVE — handled by service
};

export function targetStatus(action: SubAction): SubscriptionStatus | null {
  return ACTION_TO_STATUS[action] ?? null;
}

// ─── Guard ────────────────────────────────────────────────────────────────────

/**
 * Asserts that the requested action is allowed; throws AppError otherwise.
 *
 * @returns The resulting SubscriptionStatus (or current status for `renew`)
 */
export function assertTransition(
  sub: SubSnapshot,
  plan: PlanPolicy,
  actorRole: Role,
  action: SubAction,
  today: Date
): { nextStatus: SubscriptionStatus; closeReason?: CloseReason } {
  const allowed = allowedActions(sub, plan, actorRole, today);

  if (!allowed.includes(action)) {
    // Distinguish policy violations from illegal jumps
    const baseAllowed = BASE_TRANSITIONS[sub.status] ?? [];
    if (!baseAllowed.includes(action)) {
      throw AppError.conflict(
        `Cannot perform '${action}' from status '${sub.status}'.`,
        [{ issue: `Illegal transition`, allowedTransitions: baseAllowed }]
      );
    }

    // Base allows it but policy/date blocks it
    if (action === 'pause') {
      throw AppError.businessRule(`This plan does not allow pausing subscriptions.`);
    }
    if (action === 'close' && actorRole === 'CUSTOMER') {
      throw AppError.businessRule(`This plan does not allow early cancellation by customers.`);
    }
    if (action === 'renew') {
      throw AppError.businessRule(`This plan does not allow renewal.`);
    }
    if (action === 'confirm') {
      throw AppError.businessRule(`Quotation has expired and can no longer be confirmed.`);
    }
    if (action === 'activate') {
      throw AppError.businessRule(
        `Subscription cannot be activated before its start date (${sub.startDate.toISOString().slice(0, 10)}).`
      );
    }

    throw AppError.businessRule(`Action '${action}' is not permitted at this time.`);
  }

  const next = targetStatus(action);

  if (action === 'renew') {
    // Renew does not change status
    return { nextStatus: sub.status };
  }

  if (!next) {
    throw AppError.internal(`No target status defined for action '${action}'`);
  }

  // Determine close reason
  if (next === 'CLOSED') {
    const closeReason: CloseReason =
      actorRole === 'CUSTOMER' ? 'CUSTOMER_REQUEST' : 'MANUAL';
    return { nextStatus: next, closeReason };
  }

  return { nextStatus: next };
}

