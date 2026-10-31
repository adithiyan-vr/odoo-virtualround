/**
 * Invoice Service — confirm, cancel, send, and list invoices.
 */

import prisma from '@/lib/db';
import { AppError } from '@/lib/errors';
import { PaginationParams, buildPaginationMeta } from '@/lib/pagination';
import { recordAuditLog } from '@/lib/audit';
import { toDecimal } from '@/lib/money';
import { InvoiceStatus } from '@/lib/constants/enums';
import { SessionPayload } from '@/lib/session';
import { Decimal } from 'decimal.js';

// ─── Serialiser ───────────────────────────────────────────────────────────────

function formatInvoice(inv: any, session: SessionPayload) {
  const today = new Date();
  const isOverdue =
    inv.status === 'CONFIRMED' &&
    inv.dueDate < today;

  const allowedActions: string[] = [];
  if (inv.status === 'DRAFT') {
    allowedActions.push('confirm', 'cancel');
  }
  if (inv.status === 'CONFIRMED') {
    allowedActions.push('send');
    if (toDecimal(inv.amountPaid).lte(0)) {
      allowedActions.push('cancel');
    }
  }

  return {
    id: inv.id,
    invoiceNumber: inv.invoiceNumber,
    status: inv.status,
    subscription: inv.subscription
      ? { id: inv.subscription.id, subNumber: inv.subscription.subNumber }
      : null,
    customer: {
      id: inv.customer.id,
      name: inv.customer.name,
      email: inv.customer.email,
    },
    billingCycleDate: inv.billingCycleDate,
    periodEnd: inv.periodEnd,
    invoiceDate: inv.invoiceDate,
    dueDate: inv.dueDate,
    billToName: inv.billToName,
    billToEmail: inv.billToEmail,
    billToAddress: inv.billToAddress,
    billToGstin: inv.billToGstin,
    paymentTermName: inv.paymentTermName,
    subtotal: toDecimal(inv.subtotal).toNumber(),
    discountAmount: toDecimal(inv.discountAmount).toNumber(),
    taxAmount: toDecimal(inv.taxAmount).toNumber(),
    totalAmount: toDecimal(inv.totalAmount).toNumber(),
    amountPaid: toDecimal(inv.amountPaid).toNumber(),
    amountDue: toDecimal(inv.amountDue).toNumber(),
    isOverdue,
    confirmedAt: inv.confirmedAt,
    sentAt: inv.sentAt,
    paidAt: inv.paidAt,
    cancelledAt: inv.cancelledAt,
    notes: inv.notes,
    lines: (inv.lines ?? []).map((l: any) => ({
      id: l.id,
      description: l.description,
      quantity: l.quantity,
      unitPrice: toDecimal(l.unitPrice).toNumber(),
      amount: toDecimal(l.amount).toNumber(),
      discountAmount: toDecimal(l.discountAmount).toNumber(),
      taxableAmount: toDecimal(l.taxableAmount).toNumber(),
      taxName: l.taxName,
      taxRate: toDecimal(l.taxRate).toNumber(),
      taxAmount: toDecimal(l.taxAmount).toNumber(),
      lineTotal: toDecimal(l.lineTotal).toNumber(),
    })),
    discounts: (inv.discounts ?? []).map((d: any) => ({
      discountId: d.discountId,
      amount: toDecimal(d.amount).toNumber(),
      discount: d.discount ? { id: d.discount.id, name: d.discount.name } : null,
    })),
    payments: (inv.payments ?? []).map((p: any) => ({
      id: p.id,
      method: p.method,
      amount: toDecimal(p.amount).toNumber(),
      paymentDate: p.paymentDate,
      note: p.note,
    })),
    allowedActions,
    createdAt: inv.createdAt,
    updatedAt: inv.updatedAt,
  };
}

const FULL_INCLUDE = {
  subscription: { select: { id: true, subNumber: true } },
  customer: { select: { id: true, name: true, email: true } },
  lines: { orderBy: { sortOrder: 'asc' as const } },
  discounts: { include: { discount: { select: { id: true, name: true } } } },
  payments: { orderBy: { paymentDate: 'asc' as const } },
} as const;

// ─── InvoiceService ───────────────────────────────────────────────────────────

export class InvoiceService {
  // ─── List ─────────────────────────────────────────────────────────────

  static async list(
    params: PaginationParams & {
      status?: string;
      overdue?: string;
      customerId?: string;
      subscriptionId?: string;
      from?: string;
      to?: string;
    },
    session: SessionPayload
  ) {
    const today = new Date();
    const isCustomer = session.role === 'CUSTOMER';

    const where: any = {
      ...(isCustomer ? { customer: { userId: session.userId } } : {}),
      ...(params.status ? { status: params.status as InvoiceStatus } : {}),
      ...(params.customerId && !isCustomer ? { customerId: params.customerId } : {}),
      ...(params.subscriptionId ? { subscriptionId: params.subscriptionId } : {}),
      ...(params.from ? { invoiceDate: { gte: new Date(params.from) } } : {}),
      ...(params.to ? { invoiceDate: { lte: new Date(params.to) } } : {}),
      ...(params.overdue === 'true'
        ? { status: { in: ['CONFIRMED'] }, dueDate: { lt: today } }
        : {}),
      ...(params.q
        ? {
            OR: [
              { invoiceNumber: { contains: params.q, mode: 'insensitive' } },
              { billToName: { contains: params.q, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [total, invoices] = await Promise.all([
      prisma.invoice.count({ where }),
      prisma.invoice.findMany({
        where,
        skip: params.skip,
        take: params.take,
        orderBy: { invoiceDate: 'desc' },
        include: FULL_INCLUDE,
      }),
    ]);

    return {
      invoices: invoices.map((inv) => formatInvoice(inv, session)),
      meta: buildPaginationMeta(total, params.page, params.pageSize),
    };
  }

  // ─── Get by ID ────────────────────────────────────────────────────────

  static async getById(id: string, session: SessionPayload) {
    const isCustomer = session.role === 'CUSTOMER';

    const inv = await prisma.invoice.findUnique({ where: { id }, include: FULL_INCLUDE });
    if (!inv) throw AppError.notFound('Invoice not found');

    if (isCustomer) {
      const customer = await prisma.customer.findUnique({ where: { userId: session.userId } });
      if (!customer || inv.customerId !== customer.id) {
        throw AppError.notFound('Invoice not found');
      }
    }

    return formatInvoice(inv, session);
  }

  // ─── Confirm ──────────────────────────────────────────────────────────

  static async confirm(id: string, session: SessionPayload) {
    const inv = await prisma.invoice.findUnique({ where: { id } });
    if (!inv) throw AppError.notFound('Invoice not found');
    if (inv.status !== 'DRAFT') {
      throw AppError.businessRule(`Invoice is not in DRAFT status (current: ${inv.status})`);
    }

    const updated = await prisma.$transaction(async (tx) => {
      const res = await tx.invoice.update({
        where: { id },
        data: { status: 'CONFIRMED', confirmedAt: new Date() },
        include: FULL_INCLUDE,
      });

      await recordAuditLog(
        { actorId: session.userId, entity: 'invoice', entityId: id, action: 'confirm_invoice' },
        tx
      );

      return res;
    });

    return formatInvoice(updated, session);
  }

  // ─── Cancel ───────────────────────────────────────────────────────────

  static async cancel(id: string, session: SessionPayload) {
    const inv = await prisma.invoice.findUnique({
      where: { id },
      include: { payments: { select: { id: true } } },
    });
    if (!inv) throw AppError.notFound('Invoice not found');

    if (!['DRAFT', 'CONFIRMED'].includes(inv.status)) {
      throw AppError.businessRule(`Cannot cancel invoice in status '${inv.status}'`);
    }

    if (inv.status === 'CONFIRMED' && (inv as any).payments?.length > 0) {
      throw AppError.businessRule('Cannot cancel a confirmed invoice that has payments recorded');
    }

    const updated = await prisma.$transaction(async (tx) => {
      const res = await tx.invoice.update({
        where: { id },
        data: { status: 'CANCELLED', cancelledAt: new Date() },
        include: FULL_INCLUDE,
      });

      await recordAuditLog(
        { actorId: session.userId, entity: 'invoice', entityId: id, action: 'cancel_invoice' },
        tx
      );

      return res;
    });

    return formatInvoice(updated, session);
  }

  // ─── Send (email mock) ────────────────────────────────────────────────

  static async send(id: string, session: SessionPayload) {
    const inv = await prisma.invoice.findUnique({ where: { id } });
    if (!inv) throw AppError.notFound('Invoice not found');
    if (inv.status !== 'CONFIRMED') {
      throw AppError.businessRule('Only CONFIRMED invoices can be sent');
    }

    const updated = await prisma.$transaction(async (tx) => {
      const res = await tx.invoice.update({
        where: { id },
        data: { sentAt: new Date() },
        include: FULL_INCLUDE,
      });

      await recordAuditLog(
        { actorId: session.userId, entity: 'invoice', entityId: id, action: 'send_invoice' },
        tx
      );

      return res;
    });

    // Attempt email mock — non-blocking
    try {
      const { EmailService } = await import('@/server/email/email.service');
      await EmailService.send({
        to: inv.billToEmail,
        subject: `Invoice ${inv.invoiceNumber} from Brightloop`,
        template: 'invoice',
        html: `<p>Dear ${inv.billToName},</p><p>Please find your invoice <strong>${inv.invoiceNumber}</strong> attached. Amount due: ₹${inv.amountDue} by ${inv.dueDate?.toISOString?.().slice(0, 10)}.</p>`,
      });
    } catch {
      // Email failure is non-fatal
      console.warn(`[invoice] Email mock failed for invoice ${id}`);
    }

    return formatInvoice(updated, session);
  }

  // ─── Print data ───────────────────────────────────────────────────────

  static async getPrintData(id: string, session: SessionPayload) {
    return this.getById(id, session);
  }
}

