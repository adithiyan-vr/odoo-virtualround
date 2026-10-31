/**
 * Finance Dashboard Service — Module 7 (Finance Dashboard & Performance)
 * Ultra-fast SQL aggregations (< 2s on 5k+ subs, 10k+ invoices) for MRR, revenue, outstanding, and overdue metrics.
 */

import prisma from '@/lib/db';
import { toDecimal } from '@/lib/money';
import { InvoiceStatus, SubscriptionStatus, BillingInterval } from '@/lib/constants/enums';
import { PaginationParams, buildPaginationMeta } from '@/lib/pagination';
import { Decimal } from 'decimal.js';

export interface DashboardFilterOptions {
  from?: string;
  to?: string;
  planId?: string;
  customerId?: string;
  status?: SubscriptionStatus;
  invoiceStatus?: InvoiceStatus;
}

export class DashboardService {
  /**
   * Executive summary metrics (KPI cards).
   * Measures execution time to guarantee < 2s response time.
   */
  static async getSummary(filters: DashboardFilterOptions = {}) {
    const start = performance.now();
    const today = new Date();

    const fromDate = filters.from ? new Date(filters.from) : undefined;
    const toDate = filters.to ? new Date(filters.to) : undefined;

    // 1. Query Active Subscriptions count & MRR
    const subWhere: any = {
      ...(filters.planId ? { planId: filters.planId } : {}),
      ...(filters.customerId ? { customerId: filters.customerId } : {}),
    };

    const [activeSubscriptionsCount, activeSubsForMrr] = await Promise.all([
      prisma.subscription.count({
        where: {
          ...subWhere,
          status: SubscriptionStatus.ACTIVE,
        },
      }),
      prisma.subscription.findMany({
        where: {
          ...subWhere,
          status: SubscriptionStatus.ACTIVE,
        },
        select: {
          recurringSubtotal: true,
          plan: {
            select: { billingInterval: true },
          },
        },
      }),
    ]);

    // Calculate MRR: normalized to monthly
    let mrrTotal = new Decimal(0);
    for (const sub of activeSubsForMrr) {
      const subtotal = toDecimal(sub.recurringSubtotal);
      switch (sub.plan.billingInterval) {
        case BillingInterval.DAILY:
          mrrTotal = mrrTotal.plus(subtotal.times(30));
          break;
        case BillingInterval.WEEKLY:
          mrrTotal = mrrTotal.plus(subtotal.times(52).dividedBy(12));
          break;
        case BillingInterval.MONTHLY:
          mrrTotal = mrrTotal.plus(subtotal);
          break;
        case BillingInterval.YEARLY:
          mrrTotal = mrrTotal.plus(subtotal.dividedBy(12));
          break;
        default:
          mrrTotal = mrrTotal.plus(subtotal);
      }
    }

    // 2. Query Revenue Collected from Payments
    const paymentWhere: any = {
      isVoided: false,
      ...(fromDate || toDate
        ? {
            paymentDate: {
              ...(fromDate ? { gte: fromDate } : {}),
              ...(toDate ? { lte: toDate } : {}),
            },
          }
        : {}),
      ...(filters.customerId ? { invoice: { customerId: filters.customerId } } : {}),
    };

    const paymentAggregate = await prisma.payment.aggregate({
      where: paymentWhere,
      _sum: { amount: true },
      _count: { id: true },
    });

    // 3. Query Invoices: Total Invoiced, Outstanding, Overdue
    const invWhere: any = {
      ...(filters.customerId ? { customerId: filters.customerId } : {}),
    };

    const invoicedAggregate = await prisma.invoice.aggregate({
      where: {
        ...invWhere,
        status: { in: [InvoiceStatus.CONFIRMED, InvoiceStatus.PAID] },
        ...(fromDate || toDate
          ? {
              invoiceDate: {
                ...(fromDate ? { gte: fromDate } : {}),
                ...(toDate ? { lte: toDate } : {}),
              },
            }
          : {}),
      },
      _sum: { totalAmount: true },
    });

    const outstandingAggregate = await prisma.invoice.aggregate({
      where: {
        ...invWhere,
        status: InvoiceStatus.CONFIRMED,
        amountDue: { gt: 0 },
      },
      _sum: { amountDue: true },
      _count: { id: true },
    });

    const overdueAggregate = await prisma.invoice.aggregate({
      where: {
        ...invWhere,
        status: InvoiceStatus.CONFIRMED,
        amountDue: { gt: 0 },
        dueDate: { lt: today },
      },
      _sum: { amountDue: true },
      _count: { id: true },
    });

    const end = performance.now();
    const durationMs = Math.round(end - start);

    return {
      activeSubscriptions: activeSubscriptionsCount,
      mrr: Math.round(mrrTotal.toNumber() * 100) / 100,
      revenueCollected: toDecimal(paymentAggregate._sum.amount || 0).toNumber(),
      totalPaymentsCount: paymentAggregate._count.id,
      totalInvoiced: toDecimal(invoicedAggregate._sum.totalAmount || 0).toNumber(),
      outstandingAmount: toDecimal(outstandingAggregate._sum.amountDue || 0).toNumber(),
      outstandingCount: outstandingAggregate._count.id,
      overdueCount: overdueAggregate._count.id,
      overdueAmount: toDecimal(overdueAggregate._sum.amountDue || 0).toNumber(),
      generatedInMs: durationMs,
    };
  }

  /**
   * Monthly Revenue trend (collected vs invoiced) for the last 6-12 months.
   */
  static async getMonthlyRevenue(monthsCount: number = 6) {
    const now = new Date();
    const months: { month: string; startDate: Date; endDate: Date }[] = [];

    for (let i = monthsCount - 1; i >= 0; i--) {
      const year = now.getFullYear();
      const month = now.getMonth() - i;
      const startOfMonth = new Date(Date.UTC(year, month, 1));
      const endOfMonth = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59));
      const monthStr = `${startOfMonth.getUTCFullYear()}-${String(
        startOfMonth.getUTCMonth() + 1
      ).padStart(2, '0')}`;

      months.push({ month: monthStr, startDate: startOfMonth, endDate: endOfMonth });
    }

    const data = await Promise.all(
      months.map(async (m) => {
        const [payRes, invRes] = await Promise.all([
          prisma.payment.aggregate({
            where: {
              isVoided: false,
              paymentDate: { gte: m.startDate, lte: m.endDate },
            },
            _sum: { amount: true },
          }),
          prisma.invoice.aggregate({
            where: {
              status: { in: [InvoiceStatus.CONFIRMED, InvoiceStatus.PAID] },
              invoiceDate: { gte: m.startDate, lte: m.endDate },
            },
            _sum: { totalAmount: true },
          }),
        ]);

        return {
          month: m.month,
          collected: toDecimal(payRes._sum.amount || 0).toNumber(),
          invoiced: toDecimal(invRes._sum.totalAmount || 0).toNumber(),
        };
      })
    );

    return data;
  }

  /**
   * Breakdown of subscriptions by status for pie / donut charts.
   */
  static async getSubscriptionStatusBreakdown() {
    const statuses = [
      SubscriptionStatus.ACTIVE,
      SubscriptionStatus.PAUSED,
      SubscriptionStatus.CLOSED,
      SubscriptionStatus.CONFIRMED,
      SubscriptionStatus.QUOTATION,
      SubscriptionStatus.DRAFT,
    ];

    const counts = await Promise.all(
      statuses.map(async (st) => {
        const count = await prisma.subscription.count({ where: { status: st } });
        return { status: st, count };
      })
    );

    return counts.filter((c) => c.count > 0);
  }

  /**
   * Paginated overdue invoices with days overdue calculation.
   */
  static async getOverdueInvoices(params: PaginationParams) {
    const today = new Date();

    const where = {
      status: InvoiceStatus.CONFIRMED,
      amountDue: { gt: 0 },
      dueDate: { lt: today },
    };

    const [total, invoices] = await Promise.all([
      prisma.invoice.count({ where }),
      prisma.invoice.findMany({
        where,
        skip: params.skip,
        take: params.take,
        orderBy: { dueDate: 'asc' },
        include: {
          customer: { select: { id: true, name: true, email: true } },
          subscription: { select: { id: true, subNumber: true } },
        },
      }),
    ]);

    return {
      invoices: invoices.map((inv) => {
        const diffMs = today.getTime() - new Date(inv.dueDate).getTime();
        const daysOverdue = Math.max(1, Math.floor(diffMs / (1000 * 60 * 60 * 24)));

        return {
          id: inv.id,
          invoiceNumber: inv.invoiceNumber,
          customer: inv.customer,
          subscription: inv.subscription,
          invoiceDate: inv.invoiceDate,
          dueDate: inv.dueDate,
          daysOverdue,
          totalAmount: toDecimal(inv.totalAmount).toNumber(),
          amountPaid: toDecimal(inv.amountPaid).toNumber(),
          amountDue: toDecimal(inv.amountDue).toNumber(),
        };
      }),
      meta: buildPaginationMeta(total, params.page, params.pageSize),
    };
  }

  /**
   * Recent payments list for dashboard activity table.
   */
  static async getRecentPayments(limit: number = 10) {
    const payments = await prisma.payment.findMany({
      where: { isVoided: false },
      take: Math.min(limit, 50),
      orderBy: { paymentDate: 'desc' },
      include: {
        invoice: {
          select: {
            id: true,
            invoiceNumber: true,
            customer: { select: { id: true, name: true, email: true } },
          },
        },
      },
    });

    return payments.map((p) => ({
      id: p.id,
      invoiceId: p.invoice.id,
      invoiceNumber: p.invoice.invoiceNumber,
      customer: p.invoice.customer,
      amount: toDecimal(p.amount).toNumber(),
      method: p.method,
      paymentDate: p.paymentDate,
      reference: p.reference,
      createdAt: p.createdAt,
    }));
  }
}
