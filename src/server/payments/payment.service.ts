/**
 * Payment Service — Module 6 (Payments & Overdue)
 * Handles payment recording, overpayment protection, auto-settlement, and payment listing.
 */

import prisma from '@/lib/db';
import { AppError } from '@/lib/errors';
import { PaginationParams, buildPaginationMeta } from '@/lib/pagination';
import { recordAuditLog } from '@/lib/audit';
import { toDecimal } from '@/lib/money';
import { InvoiceStatus, PaymentMethod } from '@/lib/constants/enums';
import { SessionPayload } from '@/lib/session';
import { Decimal } from 'decimal.js';

export interface RecordPaymentParams {
  invoiceId: string;
  amount: number | Decimal;
  method: PaymentMethod;
  paymentDate: Date;
  reference?: string | null;
  note?: string | null;
}

export class PaymentService {
  /**
   * Record a payment against an invoice (Module 6).
   * Enforces:
   * - Invoice must be in CONFIRMED status
   * - Amount must be > 0
   * - Amount cannot exceed balance due (Overpayment blocked -> 422 OVERPAYMENT)
   * - Auto-flips invoice to PAID when cumulative payments = totalAmount
   * - Customer row scoping
   */
  static async recordPayment(params: RecordPaymentParams, session: SessionPayload) {
    const isCustomer = session.role === 'CUSTOMER';

    const invoice = await prisma.invoice.findUnique({
      where: { id: params.invoiceId },
      include: {
        customer: true,
      },
    });

    if (!invoice) {
      throw AppError.notFound('Invoice not found');
    }

    // Customer scoping: must own the invoice
    if (isCustomer) {
      const customer = await prisma.customer.findUnique({
        where: { userId: session.userId },
      });
      if (!customer || invoice.customerId !== customer.id) {
        throw AppError.notFound('Invoice not found');
      }
    }

    // Status check
    if (invoice.status === InvoiceStatus.PAID) {
      throw AppError.businessRule('Invoice is already fully settled (PAID).');
    }

    if (invoice.status !== InvoiceStatus.CONFIRMED) {
      throw AppError.businessRule(
        `Payments can only be recorded against CONFIRMED invoices (current status: ${invoice.status}).`
      );
    }

    const payAmount = toDecimal(params.amount);
    if (payAmount.lte(0)) {
      throw AppError.badRequest('Payment amount must be greater than zero.', [
        { field: 'amount', issue: 'Payment amount must be greater than zero.' },
      ]);
    }

    const currentBalanceDue = toDecimal(invoice.amountDue);
    if (payAmount.gt(currentBalanceDue)) {
      throw AppError.businessRule(
        `Payment amount of ₹${payAmount.toFixed(2)} exceeds remaining balance due of ₹${currentBalanceDue.toFixed(2)}.`,
        [{ field: 'amount', issue: 'OVERPAYMENT' }]
      );
    }

    // Atomic transaction: create payment & adjust invoice totals/status
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create Payment record
      const payment = await tx.payment.create({
        data: {
          invoiceId: invoice.id,
          amount: payAmount,
          method: params.method,
          paymentDate: params.paymentDate,
          reference: params.reference || null,
          note: params.note || null,
          recordedById: session.userId,
        },
      });

      // 2. Compute updated balances
      const newAmountPaid = toDecimal(invoice.amountPaid).plus(payAmount);
      const newAmountDue = toDecimal(invoice.totalAmount).minus(newAmountPaid);
      const isFullyPaid = newAmountDue.lte(0);

      // 3. Update invoice
      const updatedInvoice = await tx.invoice.update({
        where: { id: invoice.id },
        data: {
          amountPaid: newAmountPaid,
          amountDue: Decimal.max(0, newAmountDue),
          status: isFullyPaid ? InvoiceStatus.PAID : InvoiceStatus.CONFIRMED,
          paidAt: isFullyPaid ? params.paymentDate : null,
        },
        include: {
          customer: { select: { id: true, name: true, email: true } },
          payments: { orderBy: { paymentDate: 'asc' } },
        },
      });

      // 4. Audit log
      await recordAuditLog(
        {
          actorId: session.userId,
          entity: 'invoice',
          entityId: invoice.id,
          action: 'record_payment',
          meta: {
            paymentId: payment.id,
            amount: payAmount.toNumber(),
            method: params.method,
            isFullyPaid,
            newBalanceDue: newAmountDue.toNumber(),
          },
        },
        tx
      );

      return {
        payment,
        invoice: updatedInvoice,
      };
    });

    return {
      id: result.payment.id,
      invoiceId: result.invoice.id,
      invoiceNumber: result.invoice.invoiceNumber,
      amount: toDecimal(result.payment.amount).toNumber(),
      method: result.payment.method,
      paymentDate: result.payment.paymentDate,
      reference: result.payment.reference,
      note: result.payment.note,
      invoiceStatus: result.invoice.status,
      amountPaid: toDecimal(result.invoice.amountPaid).toNumber(),
      balanceDue: toDecimal(result.invoice.amountDue).toNumber(),
      isFullyPaid: result.invoice.status === InvoiceStatus.PAID,
    };
  }

  /**
   * List recorded payments with pagination, customer scoping & filters.
   */
  static async listPayments(
    params: PaginationParams & {
      invoiceId?: string;
      customerId?: string;
      method?: PaymentMethod;
      from?: string;
      to?: string;
    },
    session: SessionPayload
  ) {
    const isCustomer = session.role === 'CUSTOMER';

    const where: any = {
      isVoided: false,
      ...(params.invoiceId ? { invoiceId: params.invoiceId } : {}),
      ...(params.method ? { method: params.method } : {}),
      ...(params.from ? { paymentDate: { gte: new Date(params.from) } } : {}),
      ...(params.to ? { paymentDate: { lte: new Date(params.to) } } : {}),
    };

    if (isCustomer) {
      where.invoice = {
        customer: { userId: session.userId },
      };
    } else if (params.customerId) {
      where.invoice = {
        customerId: params.customerId,
      };
    }

    if (params.q) {
      where.OR = [
        { reference: { contains: params.q, mode: 'insensitive' } },
        { invoice: { invoiceNumber: { contains: params.q, mode: 'insensitive' } } },
        { invoice: { customer: { name: { contains: params.q, mode: 'insensitive' } } } },
      ];
    }

    const [total, payments] = await Promise.all([
      prisma.payment.count({ where }),
      prisma.payment.findMany({
        where,
        skip: params.skip,
        take: params.take,
        orderBy: { paymentDate: 'desc' },
        include: {
          invoice: {
            select: {
              id: true,
              invoiceNumber: true,
              totalAmount: true,
              amountPaid: true,
              amountDue: true,
              status: true,
              customer: { select: { id: true, name: true, email: true } },
            },
          },
          recordedBy: {
            select: { id: true, name: true, email: true },
          },
        },
      }),
    ]);

    return {
      payments: payments.map((p) => ({
        id: p.id,
        invoiceId: p.invoiceId,
        invoiceNumber: p.invoice.invoiceNumber,
        customer: p.invoice.customer,
        amount: toDecimal(p.amount).toNumber(),
        method: p.method,
        paymentDate: p.paymentDate,
        reference: p.reference,
        note: p.note,
        invoiceStatus: p.invoice.status,
        recordedBy: p.recordedBy,
        createdAt: p.createdAt,
      })),
      meta: buildPaginationMeta(total, params.page, params.pageSize),
    };
  }

  /**
   * Get payments for a specific invoice.
   */
  static async getInvoicePayments(invoiceId: string, session: SessionPayload) {
    const isCustomer = session.role === 'CUSTOMER';

    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      select: {
        id: true,
        customerId: true,
        customer: { select: { userId: true } },
      },
    });

    if (!invoice) throw AppError.notFound('Invoice not found');

    if (isCustomer && invoice.customer.userId !== session.userId) {
      throw AppError.notFound('Invoice not found');
    }

    const payments = await prisma.payment.findMany({
      where: {
        invoiceId,
        isVoided: false,
      },
      orderBy: { paymentDate: 'asc' },
      include: {
        recordedBy: { select: { id: true, name: true } },
      },
    });

    return payments.map((p) => ({
      id: p.id,
      amount: toDecimal(p.amount).toNumber(),
      method: p.method,
      paymentDate: p.paymentDate,
      reference: p.reference,
      note: p.note,
      recordedBy: p.recordedBy,
      createdAt: p.createdAt,
    }));
  }

  /**
   * Void a payment (Admin only). Reverts invoice balances and reverts status to CONFIRMED.
   */
  static async voidPayment(paymentId: string, session: SessionPayload) {
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: { invoice: true },
    });

    if (!payment) throw AppError.notFound('Payment not found');
    if (payment.isVoided) {
      throw AppError.businessRule('Payment has already been voided.');
    }

    const updated = await prisma.$transaction(async (tx) => {
      // 1. Mark payment as voided
      const voidedPayment = await tx.payment.update({
        where: { id: paymentId },
        data: {
          isVoided: true,
          voidedAt: new Date(),
          voidedById: session.userId,
        },
      });

      // 2. Adjust invoice balances
      const restoredAmountPaid = Decimal.max(
        0,
        toDecimal(payment.invoice.amountPaid).minus(toDecimal(payment.amount))
      );
      const restoredAmountDue = toDecimal(payment.invoice.totalAmount).minus(restoredAmountPaid);

      // Revert status to CONFIRMED if it was marked PAID
      const currentInvoiceStatus = payment.invoice.status as string;
      const newStatus =
        currentInvoiceStatus === 'PAID'
          ? InvoiceStatus.CONFIRMED
          : (payment.invoice.status as InvoiceStatus);

      const updatedInvoice = await tx.invoice.update({
        where: { id: payment.invoiceId },
        data: {
          amountPaid: restoredAmountPaid,
          amountDue: restoredAmountDue,
          status: newStatus,
          paidAt: (newStatus as string) === 'PAID' ? payment.invoice.paidAt : null,
        },
      });

      // 3. Audit log
      await recordAuditLog(
        {
          actorId: session.userId,
          entity: 'payment',
          entityId: paymentId,
          action: 'void_payment',
          meta: {
            invoiceId: payment.invoiceId,
            voidedAmount: toDecimal(payment.amount).toNumber(),
            restoredBalanceDue: restoredAmountDue.toNumber(),
          },
        },
        tx
      );

      return { voidedPayment, updatedInvoice };
    });

    return {
      paymentId: updated.voidedPayment.id,
      invoiceId: updated.updatedInvoice.id,
      invoiceStatus: updated.updatedInvoice.status,
      amountPaid: toDecimal(updated.updatedInvoice.amountPaid).toNumber(),
      balanceDue: toDecimal(updated.updatedInvoice.amountDue).toNumber(),
    };
  }
}
