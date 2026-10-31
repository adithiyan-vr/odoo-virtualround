/**
 * Billing Engine — Hero Feature (M2)
 *
 * Runs a billing day batch:
 *  1. lifecycleSweep — activate due subs, auto-close expired
 *  2. Collect ACTIVE subs with nextBillingDate <= asOfDate
 *  3. Per subscription (own DB transaction + row lock):
 *     build lines → discount engine → pricing engine → insert invoice
 *     advance billedCycles / nextBillingDate
 *  4. Unique-constraint violations → counted as skipped (idempotent)
 *  5. Update billing_run record with final counts
 */

import { Prisma } from '@prisma/client';
import prisma from '@/lib/db';
import { addInterval } from '@/lib/dates';
import { round2, toDecimal } from '@/lib/money';
import { nextInvoiceNumber } from '@/lib/sequences';
import { recordAuditLog } from '@/lib/audit';
import { applyDiscounts, DiscountCandidate, DiscountInputLine } from '@/server/discounts/discount.engine';
import { computeLine, computeInvoiceTotals } from '@/server/pricing/pricing.engine';
import { Decimal } from 'decimal.js';
import { SessionPayload } from '@/lib/session';
import { BillingInterval } from '@/lib/constants/enums';
import { isUniqueViolation } from '@/lib/errors';
export { isUniqueViolation };

// ─── Constants ───────────────────────────────────────────────────────────────

const BILLING_CHUNK_SIZE = parseInt(process.env.BILLING_CHUNK_SIZE ?? '20', 10);
const BILLING_MAX_CATCHUP_CYCLES = parseInt(process.env.BILLING_MAX_CATCHUP_CYCLES ?? '24', 10);

// ─── Helpers ─────────────────────────────────────────────────────────────────

function chunked<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

/** Next billing date for a subscription after billedCycles increments. Returns null if past expiry. */
function nextBillingDateOrNull(sub: {
  billingAnchorDate: Date;
  billedCycles: number;
  expiryDate: Date;
  plan: { billingInterval: BillingInterval };
}): Date | null {
  const next = addInterval(sub.billingAnchorDate, sub.plan.billingInterval, sub.billedCycles);
  return next < sub.expiryDate ? next : null;
}

/** cycleStart = anchor + N intervals where N = billedCycles BEFORE this cycle */
function cycleStart(sub: {
  billingAnchorDate: Date;
  billedCycles: number;
  plan: { billingInterval: BillingInterval };
}): Date {
  return addInterval(sub.billingAnchorDate, sub.plan.billingInterval, sub.billedCycles);
}

// ─── Lifecycle sweep ──────────────────────────────────────────────────────────

/**
 * Runs before the billing batch:
 *  - CONFIRMED subs whose startDate <= asOfDate → ACTIVE (sets anchor + nextBillingDate)
 *  - ACTIVE/PAUSED subs past expiryDate with autoClose plan → CLOSED
 *  - Quotations past validUntil are left as QUOTATION (just flagged by API responses)
 */
async function lifecycleSweep(asOfDate: Date): Promise<void> {
  // 1. Activate confirmed subs: find them, then update per-row with anchor
  const toActivate = await prisma.subscription.findMany({
    where: { status: 'CONFIRMED', startDate: { lte: asOfDate } },
    select: { id: true, startDate: true },
  });

  for (const sub of toActivate) {
    await prisma.subscription.update({
      where: { id: sub.id },
      data: {
        status: 'ACTIVE',
        billingAnchorDate: sub.startDate,
        nextBillingDate: sub.startDate,
      },
    });
  }

  // 2. Auto-close expired subscriptions where plan.autoClose=true
  const expiredSubs = await prisma.subscription.findMany({
    where: {
      status: { in: ['ACTIVE', 'PAUSED'] },
      expiryDate: { lte: asOfDate },
      plan: { autoClose: true },
    },
    select: { id: true },
  });

  for (const sub of expiredSubs) {
    await prisma.subscription.update({
      where: { id: sub.id },
      data: {
        status: 'CLOSED',
        closedAt: asOfDate,
        closeReason: 'EXPIRED',
        nextBillingDate: null,
      },
    });
  }
}

// ─── Bill one subscription ────────────────────────────────────────────────────

type SubForBilling = {
  id: string;
  customerId: string;
  discountId: string | null;
  billingAnchorDate: Date;
  billedCycles: number;
  expiryDate: Date;
  status: string;
  plan: {
    id: string;
    billingInterval: BillingInterval;
    canPause: boolean;
    canCloseEarly: boolean;
    canRenew: boolean;
    autoClose: boolean;
    validTo: Date | null;
  };
  paymentTerm: { days: number; name: string };
  customer: {
    name: string;
    email: string;
    addressLine1: string | null;
    addressLine2: string | null;
    city: string | null;
    state: string | null;
    postalCode: string | null;
    country: string;
    gstin: string | null;
  };
  lines: Array<{
    id: string;
    productId: string | null;
    variantId: string | null;
    description: string;
    isPlanFee: boolean;
    quantity: number;
    unitPrice: Decimal;
    taxId: string | null;
    tax: { id: string; name: string; ratePercent: Decimal } | null;
    product: { id: string; name: string } | null;
    variant: { priceSurcharge: Decimal } | null;
  }>;
  discount: {
    id: string;
    type: string;
    value: Decimal;
    scope: string;
    minPurchase: Decimal | null;
    minQuantity: number | null;
    startDate: Date;
    endDate: Date | null;
    maxUses: number | null;
    currentUses: number;
    autoApply: boolean;
    isActive: boolean;
    createdAt: Date;
    products: { productId: string }[];
  } | null;
};

async function loadSubForBilling(
  tx: Prisma.TransactionClient,
  id: string
): Promise<SubForBilling> {
  return tx.subscription.findUniqueOrThrow({
    where: { id },
    include: {
      plan: true,
      paymentTerm: true,
      customer: {
        select: {
          name: true,
          email: true,
          addressLine1: true,
          addressLine2: true,
          city: true,
          state: true,
          postalCode: true,
          country: true,
          gstin: true,
        },
      },
      lines: {
        include: {
          tax: true,
          product: { select: { id: true, name: true } },
          variant: { select: { priceSurcharge: true } },
        },
      },
      discount: {
        include: { products: { select: { productId: true } } },
      },
    },
  }) as Promise<SubForBilling>;
}

async function createInvoiceForCycle(
  tx: Prisma.TransactionClient,
  sub: SubForBilling,
  cycleStartDate: Date,
  billingRunId: string,
  autoConfirm: boolean
): Promise<void> {
  // 1. Build input lines for discount engine
  const inputLines: DiscountInputLine[] = sub.lines.map((l) => {
    const unitPrice = toDecimal(l.unitPrice);
    const gross = round2(unitPrice.mul(l.quantity));
    return {
      id: l.id,
      productId: l.productId,
      quantity: l.quantity,
      unitPrice,
      gross,
    };
  });

  // 2. Build discount candidates (attached + autoApply)
  const discountCandidates: DiscountCandidate[] = [];
  if (sub.discount) {
    discountCandidates.push({
      id: sub.discount.id,
      type: sub.discount.type as 'FIXED' | 'PERCENT',
      value: sub.discount.value,
      scope: sub.discount.scope as 'PRODUCT' | 'SUBSCRIPTION',
      minPurchase: sub.discount.minPurchase,
      minQuantity: sub.discount.minQuantity,
      startDate: sub.discount.startDate,
      endDate: sub.discount.endDate,
      maxUses: sub.discount.maxUses,
      currentUses: sub.discount.currentUses,
      autoApply: sub.discount.autoApply,
      isActive: sub.discount.isActive,
      productIds: sub.discount.products.map((p) => p.productId),
      createdAt: sub.discount.createdAt,
    });
  }

  // Also fetch autoApply discounts not already in the list
  const autoApplyDiscounts = await tx.discount.findMany({
    where: {
      autoApply: true,
      isActive: true,
      startDate: { lte: cycleStartDate },
      OR: [{ endDate: null }, { endDate: { gte: cycleStartDate } }],
      id: sub.discount ? { not: sub.discount.id } : undefined,
    },
    include: { products: { select: { productId: true } } },
  });

  for (const d of autoApplyDiscounts) {
    discountCandidates.push({
      id: d.id,
      type: d.type as 'FIXED' | 'PERCENT',
      value: d.value,
      scope: d.scope as 'PRODUCT' | 'SUBSCRIPTION',
      minPurchase: d.minPurchase,
      minQuantity: d.minQuantity,
      startDate: d.startDate,
      endDate: d.endDate,
      maxUses: d.maxUses,
      currentUses: d.currentUses,
      autoApply: d.autoApply,
      isActive: d.isActive,
      productIds: d.products.map((p) => p.productId),
      createdAt: d.createdAt,
    });
  }

  // 3. Run discount engine and reserve uses (drop and recompute if exhausted by race)
  let finalApplied: { discountId: string; amount: Decimal }[] = [];
  let discountByLineId = new Map<string, Decimal>();

  while (true) {
    const discountResult = applyDiscounts(discountCandidates, inputLines, cycleStartDate);
    discountByLineId = new Map(
      discountResult.lines.map((l) => [l.lineId, l.discountAmount])
    );

    let raceExhaustedId: string | null = null;
    finalApplied = [];

    for (const app of discountResult.applied) {
      const updated = await tx.$executeRaw`
        UPDATE discounts
        SET current_uses = current_uses + 1
        WHERE id = ${app.discountId}::uuid
          AND (max_uses IS NULL OR current_uses < max_uses)
      `;
      if (Number(updated) > 0) {
        finalApplied.push(app);
      } else {
        raceExhaustedId = app.discountId;
        break;
      }
    }

    if (raceExhaustedId) {
      // Rollback current_uses increments from this iteration
      for (const reverted of finalApplied) {
        await tx.$executeRaw`
          UPDATE discounts
          SET current_uses = current_uses - 1
          WHERE id = ${reverted.discountId}::uuid
        `;
      }
      // Drop exhausted candidate and recompute
      const idx = discountCandidates.findIndex((c) => c.id === raceExhaustedId);
      if (idx !== -1) discountCandidates.splice(idx, 1);
      continue;
    }

    break;
  }

  // 5. Compute pricing per line
  const pricingLines = sub.lines.map((l) => {
    const discountAmount = discountByLineId.get(l.id) ?? new Decimal(0);
    const taxRate = l.tax ? toDecimal(l.tax.ratePercent) : new Decimal(0);
    const unitPrice = toDecimal(l.unitPrice);
    return computeLine({
      quantity: l.quantity,
      unitPrice,
      discountAmount,
      taxRate,
    });
  });

  const totals = computeInvoiceTotals(pricingLines);
  const periodEnd = addInterval(
    cycleStartDate,
    sub.plan.billingInterval,
    1
  );
  const dueDate = new Date(cycleStartDate);
  dueDate.setDate(dueDate.getDate() + sub.paymentTerm.days);

  // 6. Allocate invoice number
  const invoiceNumber = await nextInvoiceNumber(tx);

  // 7. Determine initial status
  const status =
    autoConfirm || totals.totalAmount.lte(0) ? 'CONFIRMED' : 'DRAFT';
  const isPaid = totals.totalAmount.lte(0);

  // 8. Build billing address snapshot
  const c = sub.customer;
  const addressParts = [c.addressLine1, c.addressLine2, c.city, c.state, c.postalCode, c.country]
    .filter(Boolean)
    .join(', ');

  // 9. Insert invoice + lines + invoice_discounts
  await tx.invoice.create({
    data: {
      invoiceNumber,
      subscriptionId: sub.id,
      customerId: sub.customerId,
      billingRunId,
      billingCycleDate: cycleStartDate,
      periodEnd,
      status: isPaid ? 'PAID' : status,
      invoiceDate: cycleStartDate,
      dueDate,
      billToName: c.name,
      billToEmail: c.email,
      billToAddress: addressParts || null,
      billToGstin: c.gstin,
      paymentTermName: sub.paymentTerm.name,
      subtotal: totals.subtotal,
      discountAmount: totals.discountAmount,
      taxAmount: totals.taxAmount,
      totalAmount: totals.totalAmount,
      amountPaid: new Decimal(0),
      amountDue: totals.totalAmount,
      paidAt: isPaid ? cycleStartDate : null,
      confirmedAt: status === 'CONFIRMED' ? cycleStartDate : null,
      lines: {
        create: sub.lines.map((l, i) => {
          const p = pricingLines[i];
          return {
            subscriptionLineId: l.id,
            productId: l.productId,
            description: l.description,
            quantity: l.quantity,
            unitPrice: toDecimal(l.unitPrice),
            amount: p.amount,
            discountAmount: p.discountAmount,
            taxableAmount: p.taxable,
            taxName: l.tax?.name ?? null,
            taxRate: l.tax ? toDecimal(l.tax.ratePercent) : new Decimal(0),
            taxAmount: p.taxAmount,
            lineTotal: p.lineTotal,
            sortOrder: i,
          };
        }),
      },
      discounts: finalApplied.length
        ? {
            create: finalApplied.map((a) => ({
              discountId: a.discountId,
              amount: a.amount,
            })),
          }
        : undefined,
    },
  });
}

async function billOneSubscription(
  id: string,
  runId: string,
  opts: { asOfDate: Date; autoConfirm: boolean }
): Promise<number> {
  return prisma.$transaction(async (tx) => {
    // Row-level lock to serialise concurrent billing for same subscription
    await tx.$executeRaw`SELECT id FROM subscriptions WHERE id = ${id}::uuid FOR UPDATE`;

    const sub = await loadSubForBilling(tx, id);
    if (sub.status !== 'ACTIVE') return 0;

    let created = 0;

    for (let guard = 0; guard < BILLING_MAX_CATCHUP_CYCLES; guard++) {
      const start = cycleStart(sub);

      if (start > opts.asOfDate) break;
      if (start >= sub.expiryDate) break;

      // Pre-check under lock (backstop: unique constraint is the real guard)
      const exists = await tx.invoice.findUnique({
        where: {
          subscriptionId_billingCycleDate: {
            subscriptionId: id,
            billingCycleDate: start,
          },
        },
        select: { id: true },
      });

      if (!exists) {
        await createInvoiceForCycle(tx, sub, start, runId, opts.autoConfirm);
        created++;
      }

      sub.billedCycles += 1;
    }

    // Advance nextBillingDate
    const newNextBillingDate = nextBillingDateOrNull(sub);
    await tx.subscription.update({
      where: { id },
      data: {
        billedCycles: sub.billedCycles,
        nextBillingDate: newNextBillingDate,
      },
    });

    return created;
  }, { timeout: 30000, maxWait: 10000 });
}

// ─── Main billing run ─────────────────────────────────────────────────────────

export interface BillingRunResult {
  billingRunId: string;
  asOfDate: string;
  due: number;
  created: number;
  skipped: number;
  failed: number;
  durationMs: number;
  errors: { subscriptionId: string; message: string }[];
}

export async function runBilling(
  session: SessionPayload,
  opts: {
    asOfDate: Date;
    autoConfirm: boolean;
    subscriptionIds?: string[];
  }
): Promise<BillingRunResult> {
  const t0 = performance.now();

  const run = await prisma.billingRun.create({
    data: {
      asOfDate: opts.asOfDate,
      autoConfirm: opts.autoConfirm,
      triggeredById: session.userId,
      status: 'RUNNING',
    },
  });

  // Lifecycle sweep first
  await lifecycleSweep(opts.asOfDate);

  // Collect due subscriptions
  const due = await prisma.subscription.findMany({
    where: opts.subscriptionIds?.length
      ? {
          status: 'ACTIVE',
          id: { in: opts.subscriptionIds },
        }
      : {
          status: 'ACTIVE',
          nextBillingDate: { lte: opts.asOfDate },
        },
    select: { id: true },
    orderBy: { nextBillingDate: 'asc' },
  });

  const result = {
    due: due.length,
    created: 0,
    skipped: 0,
    failed: 0,
    errors: [] as { subscriptionId: string; message: string }[],
  };

  // Process in chunks (limited parallelism)
  for (const chunk of chunked(due, BILLING_CHUNK_SIZE)) {
    await Promise.all(
      chunk.map(async ({ id }) => {
        try {
          const n = await billOneSubscription(id, run.id, opts);
          result.created += n;
          if (n === 0) result.skipped++;
        } catch (err) {
          if (isUniqueViolation(err)) {
            result.skipped++;
          } else {
            result.failed++;
            result.errors.push({
              subscriptionId: id,
              message: err instanceof Error ? err.message : String(err),
            });
            console.error(`[billing] Failed sub ${id}:`, err);
          }
        }
      })
    );
  }

  const durationMs = Math.round(performance.now() - t0);

  // Update billing run record
  await prisma.billingRun.update({
    where: { id: run.id },
    data: {
      status: result.failed > 0 ? 'PARTIAL' : 'COMPLETED',
      dueCount: result.due,
      invoicesCreated: result.created,
      skippedCount: result.skipped,
      failedCount: result.failed,
      durationMs,
      finishedAt: new Date(),
      errors: result.errors.length ? (result.errors as Prisma.InputJsonValue) : undefined,
    },
  });

  await recordAuditLog({
    actorId: session.userId,
    entity: 'billing_run',
    entityId: run.id,
    action: 'billing_run_completed',
    meta: { ...result, durationMs },
  });

  return {
    billingRunId: run.id,
    asOfDate: opts.asOfDate.toISOString().slice(0, 10),
    ...result,
    durationMs,
  };
}

// ─── Auto-close job ───────────────────────────────────────────────────────────

export async function autoClose(session: SessionPayload, asOfDate: Date) {
  const subs = await prisma.subscription.findMany({
    where: {
      status: { in: ['ACTIVE', 'PAUSED'] },
      expiryDate: { lte: asOfDate },
      plan: { autoClose: true },
    },
    select: { id: true },
  });

  let closed = 0;
  for (const s of subs) {
    await prisma.subscription.update({
      where: { id: s.id },
      data: {
        status: 'CLOSED',
        closedAt: asOfDate,
        closeReason: 'EXPIRED',
        nextBillingDate: null,
      },
    });
    closed++;
  }

  await recordAuditLog({
    actorId: session.userId,
    entity: 'billing_sweep',
    entityId: 'auto-close',
    action: 'auto_close',
    meta: { closed, asOfDate },
  });

  return { closed };
}

