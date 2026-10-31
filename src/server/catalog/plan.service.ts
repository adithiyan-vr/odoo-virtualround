import prisma from '@/lib/db';
import { AppError } from '@/lib/errors';
import { PaginationParams, buildPaginationMeta } from '@/lib/pagination';
import { Decimal } from '@/lib/money';
import { toCalendarDate } from '@/lib/dates';
import { recordAuditLog } from '@/lib/audit';
import { BillingInterval } from '@/lib/constants/enums';

export class PlanService {
  static async list(params: PaginationParams, includeInactive = false, interval?: BillingInterval) {
    const where = {
      ...(includeInactive ? {} : { isActive: true }),
      ...(interval ? { billingInterval: interval } : {}),
      ...(params.q ? { name: { contains: params.q, mode: 'insensitive' as const } } : {}),
    };

    const [total, plans] = await Promise.all([
      prisma.plan.count({ where }),
      prisma.plan.findMany({
        where,
        skip: params.skip,
        take: params.take,
        orderBy: params.sortBy ? { [params.sortBy]: params.sortOrder || 'asc' } : { price: 'asc' },
      }),
    ]);

    const formattedPlans = plans.map((p) => ({
      ...p,
      price: p.price.toNumber(),
    }));

    return {
      plans: formattedPlans,
      meta: buildPaginationMeta(total, params.page, params.pageSize),
    };
  }

  static async getById(id: string) {
    const plan = await prisma.plan.findUnique({ where: { id } });
    if (!plan) {
      throw AppError.notFound('Plan not found');
    }
    return {
      ...plan,
      price: plan.price.toNumber(),
    };
  }

  static async create(
    actorId: string,
    data: {
      name: string;
      description?: string;
      price?: number;
      billingInterval: BillingInterval;
      minQuantity?: number;
      validFrom: string;
      validTo?: string | null;
      autoClose?: boolean;
      canCloseEarly?: boolean;
      canPause?: boolean;
      canRenew?: boolean;
    }
  ) {
    const validFromDate = toCalendarDate(data.validFrom);
    const validToDate = data.validTo ? toCalendarDate(data.validTo) : null;

    if (validToDate && validToDate < validFromDate) {
      throw AppError.badRequest('Valid to date cannot be earlier than valid from date');
    }

    const plan = await prisma.plan.create({
      data: {
        name: data.name.trim(),
        description: data.description || null,
        price: new Decimal(data.price ?? 0),
        billingInterval: data.billingInterval,
        minQuantity: data.minQuantity ?? 1,
        validFrom: validFromDate,
        validTo: validToDate,
        autoClose: data.autoClose ?? false,
        canCloseEarly: data.canCloseEarly ?? true,
        canPause: data.canPause ?? true,
        canRenew: data.canRenew ?? true,
      },
    });

    await recordAuditLog({
      actorId,
      entity: 'plan',
      entityId: plan.id,
      action: 'create_plan',
      meta: { name: plan.name, interval: plan.billingInterval },
    });

    return {
      ...plan,
      price: plan.price.toNumber(),
    };
  }

  static async update(
    actorId: string,
    id: string,
    data: {
      name?: string;
      description?: string;
      price?: number;
      billingInterval?: BillingInterval;
      minQuantity?: number;
      validFrom?: string;
      validTo?: string | null;
      autoClose?: boolean;
      canCloseEarly?: boolean;
      canPause?: boolean;
      canRenew?: boolean;
      isActive?: boolean;
    }
  ) {
    const existing = await prisma.plan.findUnique({ where: { id } });
    if (!existing) {
      throw AppError.notFound('Plan not found');
    }

    const validFrom = data.validFrom ? toCalendarDate(data.validFrom) : existing.validFrom;
    const validTo =
      data.validTo !== undefined
        ? data.validTo
          ? toCalendarDate(data.validTo)
          : null
        : existing.validTo;

    if (validTo && validTo < validFrom) {
      throw AppError.badRequest('Valid to date cannot be earlier than valid from date');
    }

    const updated = await prisma.plan.update({
      where: { id },
      data: {
        ...(data.name ? { name: data.name.trim() } : {}),
        ...(data.description !== undefined ? { description: data.description } : {}),
        ...(data.price !== undefined ? { price: new Decimal(data.price) } : {}),
        ...(data.billingInterval ? { billingInterval: data.billingInterval } : {}),
        ...(data.minQuantity !== undefined ? { minQuantity: data.minQuantity } : {}),
        ...(data.validFrom ? { validFrom } : {}),
        ...(data.validTo !== undefined ? { validTo } : {}),
        ...(data.autoClose !== undefined ? { autoClose: data.autoClose } : {}),
        ...(data.canCloseEarly !== undefined ? { canCloseEarly: data.canCloseEarly } : {}),
        ...(data.canPause !== undefined ? { canPause: data.canPause } : {}),
        ...(data.canRenew !== undefined ? { canRenew: data.canRenew } : {}),
        ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
      },
    });

    await recordAuditLog({
      actorId,
      entity: 'plan',
      entityId: id,
      action: 'update_plan',
      meta: data,
    });

    return {
      ...updated,
      price: updated.price.toNumber(),
    };
  }

  static async archive(actorId: string, id: string) {
    const existing = await prisma.plan.findUnique({ where: { id } });
    if (!existing) {
      throw AppError.notFound('Plan not found');
    }

    const archived = await prisma.plan.update({
      where: { id },
      data: { isActive: false },
    });

    await recordAuditLog({
      actorId,
      entity: 'plan',
      entityId: id,
      action: 'archive_plan',
    });

    return { id: archived.id, isActive: false };
  }
}
