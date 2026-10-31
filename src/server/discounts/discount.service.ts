/**
 * Discount Service — CRUD for discounts + read helpers used by billing.
 */

import prisma from '@/lib/db';
import { AppError } from '@/lib/errors';
import { PaginationParams, buildPaginationMeta } from '@/lib/pagination';
import { recordAuditLog } from '@/lib/audit';
import { toCalendarDate } from '@/lib/dates';
import { DiscountScope, DiscountType } from '@/lib/constants/enums';
import { DiscountCandidate } from './discount.engine';

// ─── Serialiser ──────────────────────────────────────────────────────────────

function serialise(d: {
  id: string;
  name: string;
  code: string | null;
  type: DiscountType;
  value: { toNumber: () => number };
  scope: DiscountScope;
  minPurchase: { toNumber: () => number } | null;
  minQuantity: number | null;
  startDate: Date;
  endDate: Date | null;
  maxUses: number | null;
  currentUses: number;
  autoApply: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  products: { productId: string }[];
}) {
  const now = new Date();
  const active =
    d.isActive &&
    d.startDate <= now &&
    (d.endDate === null || d.endDate >= now) &&
    (d.maxUses === null || d.currentUses < d.maxUses);

  return {
    id: d.id,
    name: d.name,
    code: d.code,
    type: d.type,
    value: d.value.toNumber(),
    scope: d.scope,
    minPurchase: d.minPurchase?.toNumber() ?? null,
    minQuantity: d.minQuantity,
    startDate: d.startDate,
    endDate: d.endDate,
    maxUses: d.maxUses,
    currentUses: d.currentUses,
    autoApply: d.autoApply,
    isActive: d.isActive,
    computedIsActive: active,
    productIds: d.products.map((p) => p.productId),
    createdAt: d.createdAt,
    updatedAt: d.updatedAt,
  };
}

const INCLUDE = {
  products: { select: { productId: true } },
} as const;

// ─── DiscountService ─────────────────────────────────────────────────────────

export class DiscountService {
  static async list(params: PaginationParams, includeInactive = false) {
    const where = {
      ...(includeInactive ? {} : { isActive: true }),
      ...(params.q
        ? { name: { contains: params.q, mode: 'insensitive' as const } }
        : {}),
    };

    const [total, rows] = await Promise.all([
      prisma.discount.count({ where }),
      prisma.discount.findMany({
        where,
        skip: params.skip,
        take: params.take,
        orderBy: { createdAt: 'desc' },
        include: INCLUDE,
      }),
    ]);

    return {
      discounts: rows.map(serialise),
      meta: buildPaginationMeta(total, params.page, params.pageSize),
    };
  }

  static async getById(id: string) {
    const row = await prisma.discount.findUnique({ where: { id }, include: INCLUDE });
    if (!row) throw AppError.notFound('Discount not found');
    return serialise(row);
  }

  static async create(
    actorId: string,
    data: {
      name: string;
      code?: string | null;
      type: DiscountType;
      value: number;
      scope: DiscountScope;
      minPurchase?: number | null;
      minQuantity?: number | null;
      startDate: string;
      endDate?: string | null;
      maxUses?: number | null;
      autoApply?: boolean;
      productIds?: string[];
    }
  ) {
    if (data.code) {
      const existing = await prisma.discount.findUnique({ where: { code: data.code } });
      if (existing) throw AppError.conflict('A discount with this code already exists');
    }

    const row = await prisma.$transaction(
      async (tx) => {
        const created = await tx.discount.create({
          data: {
            name: data.name.trim(),
            code: data.code ?? null,
            type: data.type,
            value: data.value,
            scope: data.scope,
            minPurchase: data.minPurchase ?? null,
            minQuantity: data.minQuantity ?? null,
            startDate: toCalendarDate(data.startDate),
            endDate: data.endDate ? toCalendarDate(data.endDate) : null,
            maxUses: data.maxUses ?? null,
            autoApply: data.autoApply ?? false,
            products: data.productIds?.length
              ? { create: data.productIds.map((pid) => ({ productId: pid })) }
              : undefined,
          },
          include: INCLUDE,
        });

        await recordAuditLog(
          { actorId, entity: 'discount', entityId: created.id, action: 'create_discount', meta: { name: created.name } },
          tx
        );
        return created;
      },
      { timeout: 30000, maxWait: 10000 }
    );

    return serialise(row);
  }

  static async update(
    actorId: string,
    id: string,
    data: Partial<{
      name: string;
      code: string | null;
      type: DiscountType;
      value: number;
      scope: DiscountScope;
      minPurchase: number | null;
      minQuantity: number | null;
      startDate: string;
      endDate: string | null;
      maxUses: number | null;
      autoApply: boolean;
      isActive: boolean;
      productIds: string[];
    }>
  ) {
    const existing = await prisma.discount.findUnique({ where: { id } });
    if (!existing) throw AppError.notFound('Discount not found');

    const row = await prisma.$transaction(
      async (tx) => {
        // Replace product list if provided
        if (data.productIds !== undefined) {
          await tx.discountProduct.deleteMany({ where: { discountId: id } });
          if (data.productIds.length > 0) {
            await tx.discountProduct.createMany({
              data: data.productIds.map((pid) => ({ discountId: id, productId: pid })),
            });
          }
        }

        const updated = await tx.discount.update({
          where: { id },
          data: {
            ...(data.name !== undefined ? { name: data.name.trim() } : {}),
            ...(data.code !== undefined ? { code: data.code } : {}),
            ...(data.type !== undefined ? { type: data.type } : {}),
            ...(data.value !== undefined ? { value: data.value } : {}),
            ...(data.scope !== undefined ? { scope: data.scope } : {}),
            ...(data.minPurchase !== undefined ? { minPurchase: data.minPurchase } : {}),
            ...(data.minQuantity !== undefined ? { minQuantity: data.minQuantity } : {}),
            ...(data.startDate !== undefined ? { startDate: toCalendarDate(data.startDate) } : {}),
            ...(data.endDate !== undefined ? { endDate: data.endDate ? toCalendarDate(data.endDate) : null } : {}),
            ...(data.maxUses !== undefined ? { maxUses: data.maxUses } : {}),
            ...(data.autoApply !== undefined ? { autoApply: data.autoApply } : {}),
            ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
          },
          include: INCLUDE,
        });

        await recordAuditLog(
          { actorId, entity: 'discount', entityId: id, action: 'update_discount', meta: data },
          tx
        );
        return updated;
      },
      { timeout: 30000, maxWait: 10000 }
    );

    return serialise(row);
  }

  static async archive(actorId: string, id: string) {
    const existing = await prisma.discount.findUnique({ where: { id } });
    if (!existing) throw AppError.notFound('Discount not found');

    await prisma.discount.update({ where: { id }, data: { isActive: false } });
    await recordAuditLog({ actorId, entity: 'discount', entityId: id, action: 'archive_discount' });
    return { id, isActive: false };
  }

  // ─── Read helpers for billing engine ─────────────────────────────────────

  /**
   * Load discount candidates for a subscription billing run.
   * Returns both the attached discount (if any) and all autoApply discounts.
   */
  static async loadCandidates(
    attachedDiscountId: string | null,
    invoiceDate: Date
  ): Promise<DiscountCandidate[]> {
    const rows = await prisma.discount.findMany({
      where: {
        isActive: true,
        startDate: { lte: invoiceDate },
        AND: [
          { OR: [{ endDate: null }, { endDate: { gte: invoiceDate } }] },
          attachedDiscountId
            ? { OR: [{ id: attachedDiscountId }, { autoApply: true }] }
            : { autoApply: true },
        ],
      },
      include: INCLUDE,
    });

    return rows.map((d) => ({
      id: d.id,
      type: d.type as DiscountType,
      value: d.value,
      scope: d.scope as DiscountScope,
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
    }));
  }
}

