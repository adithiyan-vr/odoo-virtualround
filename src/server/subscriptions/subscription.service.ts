/**
 * Subscription Service
 *
 * Handles:
 *  - create (from template or blank)
 *  - list / getById
 *  - update (editable fields in DRAFT / QUOTATION)
 *  - transition (state machine guard + side-effects)
 *  - renew
 */

import prisma from '@/lib/db';
import { AppError } from '@/lib/errors';
import { PaginationParams, buildPaginationMeta } from '@/lib/pagination';
import { recordAuditLog } from '@/lib/audit';
import { addInterval, toCalendarDate } from '@/lib/dates';
import { nextSubNumber } from '@/lib/sequences';
import {
  allowedActions,
  assertTransition,
  SubAction,
} from '@/lib/state-machine';
import { round2, toDecimal } from '@/lib/money';
import { SubscriptionStatus, Role } from '@/lib/constants/enums';
import { SessionPayload } from '@/lib/session';
import { Decimal } from 'decimal.js';
import { differenceInCalendarDays } from 'date-fns';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function serializeDecimal<T extends Record<string, unknown>>(obj: T): T {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    out[k] = v instanceof Decimal ? v.toNumber() : v;
  }
  return out as T;
}

/** Compute effective unit price = salesPrice + variantSurcharge */
function effectiveUnitPrice(
  salesPrice: Decimal,
  surcharge: Decimal | null
): Decimal {
  return round2(salesPrice.add(surcharge ?? new Decimal(0)));
}

/** Build "allowedTransitions" for API responses */
function computeAllowedTransitions(
  sub: { status: SubscriptionStatus; validUntil: Date | null; startDate: Date; expiryDate: Date },
  plan: { canPause: boolean; canCloseEarly: boolean; canRenew: boolean; autoClose: boolean; validTo: Date | null },
  actorRole: Role,
  today: Date
): SubAction[] {
  return allowedActions(
    { status: sub.status, validUntil: sub.validUntil, startDate: sub.startDate, expiryDate: sub.expiryDate },
    plan,
    actorRole,
    today
  );
}

const FULL_INCLUDE = {
  customer: { select: { id: true, name: true, email: true, company: true } },
  plan: true,
  paymentTerm: true,
  template: { select: { id: true, validityDays: true } },
  discount: { include: { products: { select: { productId: true } } } },
  lines: {
    orderBy: { sortOrder: 'asc' as const },
    include: {
      product: { select: { id: true, name: true, salesPrice: true } },
      variant: { select: { id: true, attributeName: true, attributeValue: true, priceSurcharge: true } },
      tax: { select: { id: true, name: true, ratePercent: true } },
    },
  },
} as const;

function formatSub(sub: Awaited<ReturnType<typeof prisma.subscription.findUniqueOrThrow>>, actorRole: Role, today: Date) {
  const plan = (sub as any).plan;
  const lines = ((sub as any).lines ?? []).map((l: any) => {
    const unitPrice = toDecimal(l.unitPrice);
    const subtotal = round2(unitPrice.mul(l.quantity));
    return {
      id: l.id,
      productId: l.productId,
      variantId: l.variantId,
      description: l.description,
      isPlanFee: l.isPlanFee,
      quantity: l.quantity,
      unitPrice: unitPrice.toNumber(),
      taxId: l.taxId,
      taxName: l.tax?.name ?? null,
      taxRate: l.tax ? toDecimal(l.tax.ratePercent).toNumber() : 0,
      subtotal: subtotal.toNumber(),
      product: l.product
        ? { id: l.product.id, name: l.product.name }
        : null,
      variant: l.variant
        ? {
            id: l.variant.id,
            attributeName: l.variant.attributeName,
            attributeValue: l.variant.attributeValue,
            priceSurcharge: toDecimal(l.variant.priceSurcharge).toNumber(),
          }
        : null,
    };
  });

  const allowedTransitions = computeAllowedTransitions(
    sub as any,
    plan,
    actorRole,
    today
  );

  return {
    id: sub.id,
    subNumber: sub.subNumber,
    status: sub.status,
    customerId: sub.customerId,
    customer: (sub as any).customer,
    plan: {
      id: plan.id,
      name: plan.name,
      billingInterval: plan.billingInterval,
      price: toDecimal(plan.price).toNumber(),
      canPause: plan.canPause,
      canCloseEarly: plan.canCloseEarly,
      canRenew: plan.canRenew,
      autoClose: plan.autoClose,
    },
    paymentTerm: (sub as any).paymentTerm,
    discount: (sub as any).discount
      ? {
          id: (sub as any).discount.id,
          name: (sub as any).discount.name,
          type: (sub as any).discount.type,
          value: toDecimal((sub as any).discount.value).toNumber(),
        }
      : null,
    startDate: sub.startDate,
    expiryDate: sub.expiryDate,
    billingAnchorDate: sub.billingAnchorDate,
    nextBillingDate: sub.nextBillingDate,
    billedCycles: sub.billedCycles,
    quotationDate: sub.quotationDate,
    validUntil: sub.validUntil,
    pausedAt: sub.pausedAt,
    closedAt: sub.closedAt,
    closeReason: sub.closeReason,
    notes: sub.notes,
    lines,
    allowedTransitions,
    createdAt: sub.createdAt,
    updatedAt: sub.updatedAt,
  };
}

// ─── SubscriptionService ───────────────────────────────────────────────────

export class SubscriptionService {
  // ─── List ──────────────────────────────────────────────────────────────

  static async list(
    params: PaginationParams & {
      status?: SubscriptionStatus;
      planId?: string;
      customerId?: string;
      from?: string;
      to?: string;
    },
    session: SessionPayload
  ) {
    const today = new Date();
    const isCustomer = session.role === 'CUSTOMER';

    const where: Record<string, unknown> = {
      ...(isCustomer ? { customer: { userId: session.userId } } : {}),
      ...(params.status ? { status: params.status } : {}),
      ...(params.planId ? { planId: params.planId } : {}),
      ...(params.customerId && !isCustomer ? { customerId: params.customerId } : {}),
      ...(params.q
        ? {
            OR: [
              { subNumber: { contains: params.q, mode: 'insensitive' } },
              { customer: { name: { contains: params.q, mode: 'insensitive' } } },
            ],
          }
        : {}),
    };

    const [total, subs] = await Promise.all([
      prisma.subscription.count({ where }),
      prisma.subscription.findMany({
        where,
        skip: params.skip,
        take: params.take,
        orderBy: { createdAt: 'desc' },
        include: FULL_INCLUDE,
      }),
    ]);

    return {
      subscriptions: subs.map((s) => formatSub(s as any, session.role, today)),
      meta: buildPaginationMeta(total, params.page, params.pageSize),
    };
  }

  // ─── Get by ID ─────────────────────────────────────────────────────────

  static async getById(id: string, session: SessionPayload) {
    const today = new Date();
    const isCustomer = session.role === 'CUSTOMER';

    const sub = await prisma.subscription.findUnique({
      where: { id },
      include: FULL_INCLUDE,
    });

    if (!sub) throw AppError.notFound('Subscription not found');

    if (isCustomer) {
      const customer = await prisma.customer.findUnique({
        where: { userId: session.userId },
      });
      if (!customer || sub.customerId !== customer.id) {
        throw AppError.notFound('Subscription not found');
      }
    }

    return formatSub(sub as any, session.role, today);
  }

  // ─── Create ────────────────────────────────────────────────────────────

  static async create(
    session: SessionPayload,
    data: {
      customerId: string;
      templateId?: string | null;
      planId: string;
      startDate: string;
      expiryDate: string;
      paymentTermId: string;
      discountId?: string | null;
      notes?: string | null;
      lines: Array<{
        productId: string;
        variantId?: string | null;
        quantity?: number;
        taxId?: string | null;
      }>;
    }
  ) {
    const today = new Date();

    // Validate plan
    const plan = await prisma.plan.findUnique({ where: { id: data.planId } });
    if (!plan || !plan.isActive) throw AppError.notFound('Plan not found or inactive');

    // Validate payment term
    const paymentTerm = await prisma.paymentTerm.findUnique({ where: { id: data.paymentTermId } });
    if (!paymentTerm) throw AppError.notFound('Payment term not found');

    // Validate customer
    const customer = await prisma.customer.findUnique({ where: { id: data.customerId } });
    if (!customer) throw AppError.notFound('Customer not found');

    // Resolve template lines if templateId given (merge, not override)
    let templateLines: typeof data.lines = [];
    if (data.templateId) {
      const tmpl = await prisma.quotationTemplate.findUnique({
        where: { id: data.templateId },
        include: { lines: { include: { product: true, variant: true } } },
      });
      if (!tmpl) throw AppError.notFound('Quotation template not found');
      templateLines = tmpl.lines.map((l) => ({
        productId: l.productId,
        variantId: l.variantId ?? null,
        quantity: l.quantity,
        taxId: null,
      }));
    }

    const resolvedLines = data.lines.length > 0 ? data.lines : templateLines;

    const startDate = toCalendarDate(data.startDate);
    const expiryDate = toCalendarDate(data.expiryDate);

    // Build subscription lines prior to entering transaction
    const lineData = await Promise.all(
      resolvedLines.map(async (l, i) => {
        const product = await prisma.product.findUnique({ where: { id: l.productId }, include: { defaultTax: true } });
        if (!product) throw AppError.notFound(`Product ${l.productId} not found`);

        const variant = l.variantId
          ? await prisma.productVariant.findUnique({ where: { id: l.variantId } })
          : null;

        const unitPrice = effectiveUnitPrice(
          toDecimal(product.salesPrice),
          variant ? toDecimal(variant.priceSurcharge) : null
        );
        const qty = l.quantity ?? 1;
        const subtotal = round2(unitPrice.mul(qty));
        const taxId = l.taxId ?? product.defaultTaxId ?? null;

        return {
          productId: l.productId,
          variantId: l.variantId ?? null,
          description: variant
            ? `${product.name} (${variant.attributeName}: ${variant.attributeValue})`
            : product.name,
          isPlanFee: false,
          quantity: qty,
          unitPrice: unitPrice,
          taxId,
          subtotal,
          sortOrder: i,
        };
      })
    );

    // Add plan fee line if plan.price > 0
    if (toDecimal(plan.price).gt(0)) {
      lineData.unshift({
        productId: null as any,
        variantId: null,
        description: `Plan Fee: ${plan.name}`,
        isPlanFee: true,
        quantity: 1,
        unitPrice: toDecimal(plan.price),
        taxId: null,
        subtotal: round2(toDecimal(plan.price)),
        sortOrder: -1,
      });
    }

    const recurringSubtotal = lineData.reduce((s, l) => s.add(l.subtotal), new Decimal(0));

    const subId = await prisma.$transaction(
      async (tx) => {
        const subNumber = await nextSubNumber(tx);

        const created = await tx.subscription.create({
          data: {
            subNumber,
            customerId: data.customerId,
            planId: data.planId,
            templateId: data.templateId ?? null,
            discountId: data.discountId ?? null,
            paymentTermId: data.paymentTermId,
            status: 'DRAFT',
            startDate,
            expiryDate,
            notes: data.notes ?? null,
            recurringSubtotal,
            createdById: session.userId,
            lines: {
              create: lineData.map((l) => ({
                productId: l.productId,
                variantId: l.variantId,
                description: l.description,
                isPlanFee: l.isPlanFee,
                quantity: l.quantity,
                unitPrice: l.unitPrice,
                taxId: l.taxId,
                subtotal: l.subtotal,
                sortOrder: l.sortOrder,
              })),
            },
          },
          select: { id: true, subNumber: true },
        });

        await recordAuditLog(
          {
            actorId: session.userId,
            entity: 'subscription',
            entityId: created.id,
            action: 'create_subscription',
            meta: { subNumber: created.subNumber, customerId: data.customerId },
          },
          tx
        );

        return created.id;
      },
      { timeout: 30000, maxWait: 10000 }
    );

    return SubscriptionService.getById(subId, session);
  }

  // ─── Update editable fields ────────────────────────────────────────────

  static async update(
    session: SessionPayload,
    id: string,
    data: { discountId?: string | null; notes?: string | null; paymentTermId?: string }
  ) {
    const today = new Date();
    const sub = await prisma.subscription.findUnique({ where: { id }, include: FULL_INCLUDE });
    if (!sub) throw AppError.notFound('Subscription not found');

    if (!['DRAFT', 'QUOTATION'].includes(sub.status)) {
      throw AppError.businessRule('Only DRAFT or QUOTATION subscriptions can be updated');
    }

    const updated = await prisma.subscription.update({
      where: { id },
      data: {
        ...(data.discountId !== undefined ? { discountId: data.discountId } : {}),
        ...(data.notes !== undefined ? { notes: data.notes } : {}),
        ...(data.paymentTermId ? { paymentTermId: data.paymentTermId } : {}),
      },
      include: FULL_INCLUDE,
    });

    await recordAuditLog({
      actorId: session.userId,
      entity: 'subscription',
      entityId: id,
      action: 'update_subscription',
      meta: data,
    });

    return formatSub(updated as any, session.role, today);
  }

  // ─── Transition ────────────────────────────────────────────────────────

  /**
   * Perform a state machine transition on the subscription.
   * The `to` parameter is the target SubscriptionStatus.
   * We infer the action from the current state + target.
   */
  static async transition(
    session: SessionPayload,
    id: string,
    targetStatus: SubscriptionStatus
  ) {
    const today = new Date();

    const sub = await prisma.subscription.findUnique({ where: { id }, include: FULL_INCLUDE });
    if (!sub) throw AppError.notFound('Subscription not found');

    const plan = (sub as any).plan;

    // Map targetStatus → action
    const ACTION_MAP: Partial<Record<SubscriptionStatus, SubAction>> = {
      QUOTATION: 'send_quotation',
      DRAFT:     'revise',
      CONFIRMED: 'confirm',
      ACTIVE:    sub.status === 'CONFIRMED' ? 'activate' : 'resume',
      PAUSED:    'pause',
      CLOSED:    'close',
    };
    const action = ACTION_MAP[targetStatus];
    if (!action) throw AppError.conflict(`Cannot transition to '${targetStatus}'`);

    const { nextStatus, closeReason } = assertTransition(
      {
        status: sub.status as SubscriptionStatus,
        validUntil: sub.validUntil,
        startDate: sub.startDate,
        expiryDate: sub.expiryDate,
      },
      plan,
      session.role,
      action,
      today
    );

    const updateData: Record<string, unknown> = { status: nextStatus };

    if (nextStatus === 'QUOTATION') {
      updateData.quotationDate = today;
      const template = (sub as any).template ?? null;
      const validityDays = template?.validityDays ?? 30;
      const validUntil = new Date(today);
      validUntil.setDate(validUntil.getDate() + validityDays);
      updateData.validUntil = validUntil;
    }

    if (nextStatus === 'ACTIVE' && sub.status === 'CONFIRMED') {
      // Activating: set billing anchor + nextBillingDate
      updateData.billingAnchorDate = sub.startDate;
      updateData.nextBillingDate = sub.startDate;
    }

    if (nextStatus === 'ACTIVE' && sub.status === 'PAUSED') {
      // Resume: shift anchor by paused days
      const pausedAt = sub.pausedAt;
      if (pausedAt) {
        const pausedDays = differenceInCalendarDays(today, pausedAt);
        const newAnchor = addInterval(sub.billingAnchorDate!, 'DAILY', pausedDays);
        const newExpiry = addInterval(sub.expiryDate, 'DAILY', pausedDays);
        updateData.billingAnchorDate = newAnchor;
        updateData.expiryDate = newExpiry;
        updateData.pausedAt = null;
        // Recompute nextBillingDate
        updateData.nextBillingDate = addInterval(newAnchor, plan.billingInterval, sub.billedCycles);
      }
    }

    if (nextStatus === 'PAUSED') {
      updateData.pausedAt = today;
      updateData.nextBillingDate = null;
    }

    if (nextStatus === 'CLOSED') {
      updateData.closedAt = today;
      updateData.closeReason = closeReason ?? 'MANUAL';
      updateData.nextBillingDate = null;
    }

    await prisma.$transaction(
      async (tx) => {
        await tx.subscription.update({
          where: { id },
          data: updateData,
          select: { id: true },
        });

        await recordAuditLog(
          {
            actorId: session.userId,
            entity: 'subscription',
            entityId: id,
            action: `transition_${sub.status}_to_${nextStatus}`,
            meta: { from: sub.status, to: nextStatus, closeReason },
          },
          tx
        );
      },
      { timeout: 30000, maxWait: 10000 }
    );

    return SubscriptionService.getById(id, session);
  }

  // ─── Renew ─────────────────────────────────────────────────────────────

  static async renew(session: SessionPayload, id: string) {
    const today = new Date();

    const sub = await prisma.subscription.findUnique({ where: { id }, include: FULL_INCLUDE });
    if (!sub) throw AppError.notFound('Subscription not found');

    const plan = (sub as any).plan;

    assertTransition(
      { status: sub.status as SubscriptionStatus, validUntil: sub.validUntil, startDate: sub.startDate, expiryDate: sub.expiryDate },
      plan,
      session.role,
      'renew',
      today
    );

    const newExpiry = addInterval(sub.expiryDate, plan.billingInterval, 1);

    await prisma.$transaction(
      async (tx) => {
        await tx.subscription.update({
          where: { id },
          data: { expiryDate: newExpiry },
          select: { id: true },
        });

        await recordAuditLog(
          {
            actorId: session.userId,
            entity: 'subscription',
            entityId: id,
            action: 'renew_subscription',
            meta: { oldExpiry: sub.expiryDate, newExpiry },
          },
          tx
        );
      },
      { timeout: 30000, maxWait: 10000 }
    );

    return SubscriptionService.getById(id, session);
  }
}

