/**
 * Customer Portal Service — Module 6, 7 & Customer-facing operations
 * Enforces customer row-scoping: Customers can ONLY view and act on their own data.
 * Accessing any other customer's record strictly returns 404 NOT_FOUND.
 */

import prisma from '@/lib/db';
import { AppError } from '@/lib/errors';
import { toDecimal } from '@/lib/money';
import { SessionPayload } from '@/lib/session';
import { PaginationParams, buildPaginationMeta } from '@/lib/pagination';
import { SubscriptionService } from '@/server/subscriptions/subscription.service';
import { PaymentService } from '@/server/payments/payment.service';
import { InvoiceService } from '@/server/billing/invoice.service';
import { InvoiceStatus, SubscriptionStatus, PaymentMethod } from '@/lib/constants/enums';

export class PortalService {
  /**
   * Helper: Resolve Customer record for the logged in user.
   */
  private static async getCustomerForUser(userId: string) {
    const customer = await prisma.customer.findUnique({
      where: { userId },
    });

    if (!customer) {
      throw AppError.notFound('Customer profile not found for this user account.');
    }

    return customer;
  }

  /**
   * List customer's own subscriptions with server pagination.
   */
  static async getSubscriptions(params: PaginationParams, session: SessionPayload) {
    const customer = await this.getCustomerForUser(session.userId);

    const where = { customerId: customer.id };

    const [total, subscriptions] = await Promise.all([
      prisma.subscription.count({ where }),
      prisma.subscription.findMany({
        where,
        skip: params.skip,
        take: params.take,
        orderBy: { createdAt: 'desc' },
        include: {
          plan: {
            select: {
              id: true,
              name: true,
              billingInterval: true,
              canPause: true,
              canCloseEarly: true,
              canRenew: true,
            },
          },
          lines: {
            orderBy: { sortOrder: 'asc' },
            select: {
              id: true,
              description: true,
              quantity: true,
              unitPrice: true,
              subtotal: true,
              isPlanFee: true,
            },
          },
          invoices: {
            select: { id: true, invoiceNumber: true, status: true, totalAmount: true, amountDue: true },
            orderBy: { invoiceDate: 'desc' },
            take: 5,
          },
        },
      }),
    ]);

    return {
      subscriptions: subscriptions.map((s) => ({
        id: s.id,
        subNumber: s.subNumber,
        status: s.status,
        plan: s.plan,
        startDate: s.startDate,
        expiryDate: s.expiryDate,
        nextBillingDate: s.nextBillingDate,
        recurringSubtotal: toDecimal(s.recurringSubtotal).toNumber(),
        lines: s.lines.map((l) => ({
          ...l,
          unitPrice: toDecimal(l.unitPrice).toNumber(),
          subtotal: toDecimal(l.subtotal).toNumber(),
        })),
        recentInvoices: s.invoices.map((i) => ({
          ...i,
          totalAmount: toDecimal(i.totalAmount).toNumber(),
          amountDue: toDecimal(i.amountDue).toNumber(),
        })),
        createdAt: s.createdAt,
      })),
      meta: buildPaginationMeta(total, params.page, params.pageSize),
    };
  }

  /**
   * Get single subscription detail. If not owned by this customer -> 404 NOT_FOUND.
   */
  static async getSubscriptionDetail(id: string, session: SessionPayload) {
    const customer = await this.getCustomerForUser(session.userId);

    const sub = await prisma.subscription.findUnique({
      where: { id },
      include: {
        plan: true,
        template: { select: { id: true, name: true } },
        discount: { select: { id: true, name: true, type: true, value: true } },
        paymentTerm: true,
        lines: {
          orderBy: { sortOrder: 'asc' },
          include: {
            product: { select: { id: true, name: true, sku: true } },
            variant: { select: { id: true, attributeName: true, attributeValue: true, priceSurcharge: true } },
            tax: { select: { id: true, name: true, ratePercent: true } },
          },
        },
        invoices: {
          orderBy: { invoiceDate: 'desc' },
          select: {
            id: true,
            invoiceNumber: true,
            status: true,
            invoiceDate: true,
            dueDate: true,
            totalAmount: true,
            amountPaid: true,
            amountDue: true,
          },
        },
      },
    });

    if (!sub || sub.customerId !== customer.id) {
      throw AppError.notFound('Subscription not found');
    }

    return {
      id: sub.id,
      subNumber: sub.subNumber,
      status: sub.status,
      plan: {
        id: sub.plan.id,
        name: sub.plan.name,
        price: toDecimal(sub.plan.price).toNumber(),
        billingInterval: sub.plan.billingInterval,
        canPause: sub.plan.canPause,
        canCloseEarly: sub.plan.canCloseEarly,
        canRenew: sub.plan.canRenew,
      },
      paymentTerm: sub.paymentTerm.name,
      startDate: sub.startDate,
      expiryDate: sub.expiryDate,
      nextBillingDate: sub.nextBillingDate,
      pausedAt: sub.pausedAt,
      closedAt: sub.closedAt,
      closeReason: sub.closeReason,
      recurringSubtotal: toDecimal(sub.recurringSubtotal).toNumber(),
      lines: sub.lines.map((l) => ({
        id: l.id,
        description: l.description,
        isPlanFee: l.isPlanFee,
        quantity: l.quantity,
        unitPrice: toDecimal(l.unitPrice).toNumber(),
        subtotal: toDecimal(l.subtotal).toNumber(),
        product: l.product,
        variant: l.variant
          ? {
              ...l.variant,
              priceSurcharge: toDecimal(l.variant.priceSurcharge).toNumber(),
            }
          : null,
        tax: l.tax
          ? {
              ...l.tax,
              ratePercent: toDecimal(l.tax.ratePercent).toNumber(),
            }
          : null,
      })),
      invoices: sub.invoices.map((inv) => ({
        ...inv,
        totalAmount: toDecimal(inv.totalAmount).toNumber(),
        amountPaid: toDecimal(inv.amountPaid).toNumber(),
        amountDue: toDecimal(inv.amountDue).toNumber(),
      })),
      createdAt: sub.createdAt,
    };
  }

  /**
   * Request subscription action: PAUSE, RESUME, or CLOSE.
   * Gated strictly by plan policy flags.
   */
  static async requestSubscriptionAction(
    id: string,
    action: 'PAUSE' | 'RESUME' | 'CLOSE',
    session: SessionPayload
  ) {
    const customer = await this.getCustomerForUser(session.userId);

    const sub = await prisma.subscription.findUnique({
      where: { id },
      include: { plan: true },
    });

    if (!sub || sub.customerId !== customer.id) {
      throw AppError.notFound('Subscription not found');
    }

    let targetStatus: SubscriptionStatus;
    if (action === 'PAUSE') {
      if (!sub.plan.canPause) {
        throw AppError.businessRule('This plan policy does not permit pausing subscriptions.');
      }
      targetStatus = SubscriptionStatus.PAUSED;
    } else if (action === 'RESUME') {
      targetStatus = SubscriptionStatus.ACTIVE;
    } else if (action === 'CLOSE') {
      if (!sub.plan.canCloseEarly) {
        throw AppError.businessRule('This plan policy does not permit early cancellation.');
      }
      targetStatus = SubscriptionStatus.CLOSED;
    } else {
      throw AppError.conflict(`Invalid action '${action}'`);
    }

    return SubscriptionService.transition(session, id, targetStatus);
  }

  /**
   * List customer's own invoices with server pagination.
   */
  static async getInvoices(
    params: PaginationParams & { status?: InvoiceStatus },
    session: SessionPayload
  ) {
    const customer = await this.getCustomerForUser(session.userId);

    const where: any = {
      customerId: customer.id,
      ...(params.status ? { status: params.status } : {}),
    };

    const today = new Date();

    const [total, invoices] = await Promise.all([
      prisma.invoice.count({ where }),
      prisma.invoice.findMany({
        where,
        skip: params.skip,
        take: params.take,
        orderBy: { invoiceDate: 'desc' },
        include: {
          subscription: { select: { id: true, subNumber: true } },
          payments: { orderBy: { paymentDate: 'asc' } },
        },
      }),
    ]);

    return {
      invoices: invoices.map((inv) => ({
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        status: inv.status,
        subscription: inv.subscription,
        invoiceDate: inv.invoiceDate,
        dueDate: inv.dueDate,
        isOverdue: inv.status === InvoiceStatus.CONFIRMED && inv.dueDate < today,
        subtotal: toDecimal(inv.subtotal).toNumber(),
        discountAmount: toDecimal(inv.discountAmount).toNumber(),
        taxAmount: toDecimal(inv.taxAmount).toNumber(),
        totalAmount: toDecimal(inv.totalAmount).toNumber(),
        amountPaid: toDecimal(inv.amountPaid).toNumber(),
        amountDue: toDecimal(inv.amountDue).toNumber(),
        createdAt: inv.createdAt,
      })),
      meta: buildPaginationMeta(total, params.page, params.pageSize),
    };
  }

  /**
   * Get customer's invoice detail. If not owned -> 404 NOT_FOUND.
   */
  static async getInvoiceDetail(id: string, session: SessionPayload) {
    return InvoiceService.getById(id, session);
  }

  /**
   * Mock "Pay Now" on customer's own confirmed invoice.
   */
  static async payInvoice(
    invoiceId: string,
    params: {
      amount: number;
      method: PaymentMethod;
      reference?: string;
      note?: string;
    },
    session: SessionPayload
  ) {
    return PaymentService.recordPayment(
      {
        invoiceId,
        amount: params.amount,
        method: params.method,
        paymentDate: new Date(),
        reference: params.reference || `MOCK-${Date.now()}`,
        note: params.note || 'Self-service customer portal payment',
      },
      session
    );
  }

  /**
   * Get customer profile.
   */
  static async getProfile(session: SessionPayload) {
    const customer = await this.getCustomerForUser(session.userId);
    return customer;
  }

  /**
   * Update customer profile details.
   */
  static async updateProfile(
    data: {
      name?: string;
      company?: string | null;
      phone?: string | null;
      addressLine1?: string | null;
      addressLine2?: string | null;
      city?: string | null;
      state?: string | null;
      postalCode?: string | null;
      country?: string;
      gstin?: string | null;
      notes?: string | null;
    },
    session: SessionPayload
  ) {
    const customer = await this.getCustomerForUser(session.userId);

    const updated = await prisma.customer.update({
      where: { id: customer.id },
      data: {
        ...(data.name ? { name: data.name } : {}),
        company: data.company !== undefined ? data.company : customer.company,
        phone: data.phone !== undefined ? data.phone : customer.phone,
        addressLine1: data.addressLine1 !== undefined ? data.addressLine1 : customer.addressLine1,
        addressLine2: data.addressLine2 !== undefined ? data.addressLine2 : customer.addressLine2,
        city: data.city !== undefined ? data.city : customer.city,
        state: data.state !== undefined ? data.state : customer.state,
        postalCode: data.postalCode !== undefined ? data.postalCode : customer.postalCode,
        ...(data.country ? { country: data.country } : {}),
        gstin: data.gstin !== undefined ? data.gstin : customer.gstin,
        notes: data.notes !== undefined ? data.notes : customer.notes,
      },
    });

    return updated;
  }
}
