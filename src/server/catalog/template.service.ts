import prisma from '@/lib/db';
import { AppError } from '@/lib/errors';
import { PaginationParams, buildPaginationMeta } from '@/lib/pagination';
import { recordAuditLog } from '@/lib/audit';

export class TemplateService {
  static async list(params: PaginationParams, includeInactive = false) {
    const where = {
      ...(includeInactive ? {} : { isActive: true }),
      ...(params.q ? { name: { contains: params.q, mode: 'insensitive' as const } } : {}),
    };

    const [total, templates] = await Promise.all([
      prisma.quotationTemplate.count({ where }),
      prisma.quotationTemplate.findMany({
        where,
        skip: params.skip,
        take: params.take,
        orderBy: params.sortBy ? { [params.sortBy]: params.sortOrder || 'asc' } : { name: 'asc' },
        include: {
          plan: true,
          lines: {
            orderBy: { sortOrder: 'asc' },
            include: {
              product: true,
              variant: true,
            },
          },
        },
      }),
    ]);

    const formatted = templates.map((t) => ({
      ...t,
      plan: {
        ...t.plan,
        price: t.plan.price.toNumber(),
      },
      lines: t.lines.map((l) => ({
        ...l,
        product: {
          ...l.product,
          salesPrice: l.product.salesPrice.toNumber(),
          costPrice: l.product.costPrice.toNumber(),
        },
        variant: l.variant
          ? {
              ...l.variant,
              priceSurcharge: l.variant.priceSurcharge.toNumber(),
            }
          : null,
      })),
    }));

    return {
      templates: formatted,
      meta: buildPaginationMeta(total, params.page, params.pageSize),
    };
  }

  static async getById(id: string) {
    const template = await prisma.quotationTemplate.findUnique({
      where: { id },
      include: {
        plan: true,
        lines: {
          orderBy: { sortOrder: 'asc' },
          include: {
            product: true,
            variant: true,
          },
        },
      },
    });

    if (!template) {
      throw AppError.notFound('Quotation template not found');
    }

    return {
      ...template,
      plan: {
        ...template.plan,
        price: template.plan.price.toNumber(),
      },
      lines: template.lines.map((l) => ({
        ...l,
        product: {
          ...l.product,
          salesPrice: l.product.salesPrice.toNumber(),
          costPrice: l.product.costPrice.toNumber(),
        },
        variant: l.variant
          ? {
              ...l.variant,
              priceSurcharge: l.variant.priceSurcharge.toNumber(),
            }
          : null,
      })),
    };
  }

  static async create(
    actorId: string,
    data: {
      name: string;
      planId: string;
      validityDays?: number;
      notes?: string;
      lines: Array<{
        productId: string;
        variantId?: string | null;
        quantity?: number;
        sortOrder?: number;
      }>;
    }
  ) {
    const plan = await prisma.plan.findUnique({ where: { id: data.planId } });
    if (!plan) {
      throw AppError.badRequest('Referenced plan does not exist');
    }

    const template = await prisma.$transaction(async (tx) => {
      const created = await tx.quotationTemplate.create({
        data: {
          name: data.name.trim(),
          planId: data.planId,
          validityDays: data.validityDays ?? 30,
          notes: data.notes || null,
          lines: {
            create: data.lines.map((l, index) => ({
              productId: l.productId,
              variantId: l.variantId || null,
              quantity: l.quantity ?? 1,
              sortOrder: l.sortOrder ?? index,
            })),
          },
        },
        include: {
          plan: true,
          lines: {
            include: { product: true, variant: true },
          },
        },
      });

      await recordAuditLog(
        {
          actorId,
          entity: 'quotation_template',
          entityId: created.id,
          action: 'create_template',
          meta: { name: created.name, planId: created.planId },
        },
        tx
      );

      return created;
    });

    return {
      ...template,
      plan: {
        ...template.plan,
        price: template.plan.price.toNumber(),
      },
      lines: template.lines.map((l) => ({
        ...l,
        product: {
          ...l.product,
          salesPrice: l.product.salesPrice.toNumber(),
          costPrice: l.product.costPrice.toNumber(),
        },
        variant: l.variant
          ? {
              ...l.variant,
              priceSurcharge: l.variant.priceSurcharge.toNumber(),
            }
          : null,
      })),
    };
  }

  static async update(
    actorId: string,
    id: string,
    data: {
      name?: string;
      planId?: string;
      validityDays?: number;
      notes?: string;
      isActive?: boolean;
      lines?: Array<{
        productId: string;
        variantId?: string | null;
        quantity?: number;
        sortOrder?: number;
      }>;
    }
  ) {
    const existing = await prisma.quotationTemplate.findUnique({ where: { id } });
    if (!existing) {
      throw AppError.notFound('Quotation template not found');
    }

    if (data.planId) {
      const plan = await prisma.plan.findUnique({ where: { id: data.planId } });
      if (!plan) {
        throw AppError.badRequest('Referenced plan does not exist');
      }
    }

    const updated = await prisma.$transaction(async (tx) => {
      if (data.lines) {
        // Replace lines
        await tx.quotationTemplateLine.deleteMany({ where: { templateId: id } });
        await tx.quotationTemplateLine.createMany({
          data: data.lines.map((l, index) => ({
            templateId: id,
            productId: l.productId,
            variantId: l.variantId || null,
            quantity: l.quantity ?? 1,
            sortOrder: l.sortOrder ?? index,
          })),
        });
      }

      const res = await tx.quotationTemplate.update({
        where: { id },
        data: {
          ...(data.name ? { name: data.name.trim() } : {}),
          ...(data.planId ? { planId: data.planId } : {}),
          ...(data.validityDays !== undefined ? { validityDays: data.validityDays } : {}),
          ...(data.notes !== undefined ? { notes: data.notes } : {}),
          ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
        },
        include: {
          plan: true,
          lines: {
            orderBy: { sortOrder: 'asc' },
            include: { product: true, variant: true },
          },
        },
      });

      await recordAuditLog(
        {
          actorId,
          entity: 'quotation_template',
          entityId: id,
          action: 'update_template',
          meta: data,
        },
        tx
      );

      return res;
    });

    return {
      ...updated,
      plan: {
        ...updated.plan,
        price: updated.plan.price.toNumber(),
      },
      lines: updated.lines.map((l) => ({
        ...l,
        product: {
          ...l.product,
          salesPrice: l.product.salesPrice.toNumber(),
          costPrice: l.product.costPrice.toNumber(),
        },
        variant: l.variant
          ? {
              ...l.variant,
              priceSurcharge: l.variant.priceSurcharge.toNumber(),
            }
          : null,
      })),
    };
  }

  static async archive(actorId: string, id: string) {
    const existing = await prisma.quotationTemplate.findUnique({ where: { id } });
    if (!existing) {
      throw AppError.notFound('Quotation template not found');
    }

    const archived = await prisma.quotationTemplate.update({
      where: { id },
      data: { isActive: false },
    });

    await recordAuditLog({
      actorId,
      entity: 'quotation_template',
      entityId: id,
      action: 'archive_template',
    });

    return { id: archived.id, isActive: false };
  }
}
