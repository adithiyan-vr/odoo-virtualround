import prisma from '@/lib/db';
import { AppError } from '@/lib/errors';
import { Decimal } from '@/lib/money';
import { recordAuditLog } from '@/lib/audit';

export class TaxService {
  static async list(includeInactive = false) {
    const taxes = await prisma.tax.findMany({
      where: includeInactive ? {} : { isActive: true },
      orderBy: { ratePercent: 'asc' },
    });

    return taxes.map((t) => ({
      ...t,
      ratePercent: t.ratePercent.toNumber(),
    }));
  }

  static async getById(id: string) {
    const tax = await prisma.tax.findUnique({ where: { id } });
    if (!tax) {
      throw AppError.notFound('Tax rule not found');
    }
    return {
      ...tax,
      ratePercent: tax.ratePercent.toNumber(),
    };
  }

  static async create(
    actorId: string,
    data: {
      name: string;
      ratePercent: number;
      isDefault?: boolean;
    }
  ) {
    const tax = await prisma.$transaction(async (tx) => {
      if (data.isDefault) {
        await tx.tax.updateMany({
          where: { isDefault: true },
          data: { isDefault: false },
        });
      }

      return tx.tax.create({
        data: {
          name: data.name.trim(),
          ratePercent: new Decimal(data.ratePercent),
          isDefault: data.isDefault ?? false,
        },
      });
    });

    await recordAuditLog({
      actorId,
      entity: 'tax',
      entityId: tax.id,
      action: 'create_tax',
      meta: { name: tax.name, rate: tax.ratePercent.toNumber() },
    });

    return {
      ...tax,
      ratePercent: tax.ratePercent.toNumber(),
    };
  }

  static async update(
    actorId: string,
    id: string,
    data: {
      name?: string;
      ratePercent?: number;
      isDefault?: boolean;
      isActive?: boolean;
    }
  ) {
    const existing = await prisma.tax.findUnique({ where: { id } });
    if (!existing) {
      throw AppError.notFound('Tax rule not found');
    }

    const updated = await prisma.$transaction(async (tx) => {
      if (data.isDefault) {
        await tx.tax.updateMany({
          where: { isDefault: true, id: { not: id } },
          data: { isDefault: false },
        });
      }

      return tx.tax.update({
        where: { id },
        data: {
          ...(data.name ? { name: data.name.trim() } : {}),
          ...(data.ratePercent !== undefined ? { ratePercent: new Decimal(data.ratePercent) } : {}),
          ...(data.isDefault !== undefined ? { isDefault: data.isDefault } : {}),
          ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
        },
      });
    });

    await recordAuditLog({
      actorId,
      entity: 'tax',
      entityId: id,
      action: 'update_tax',
      meta: data,
    });

    return {
      ...updated,
      ratePercent: updated.ratePercent.toNumber(),
    };
  }

  static async archive(actorId: string, id: string) {
    const existing = await prisma.tax.findUnique({ where: { id } });
    if (!existing) {
      throw AppError.notFound('Tax rule not found');
    }

    const archived = await prisma.tax.update({
      where: { id },
      data: { isActive: false },
    });

    await recordAuditLog({
      actorId,
      entity: 'tax',
      entityId: id,
      action: 'archive_tax',
    });

    return { id: archived.id, isActive: false };
  }
}
