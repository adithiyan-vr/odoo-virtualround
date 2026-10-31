import prisma from '@/lib/db';
import { AppError } from '@/lib/errors';
import { recordAuditLog } from '@/lib/audit';

export class PaymentTermService {
  static async list(includeInactive = false) {
    return prisma.paymentTerm.findMany({
      where: includeInactive ? {} : { isActive: true },
      orderBy: { days: 'asc' },
    });
  }

  static async getById(id: string) {
    const term = await prisma.paymentTerm.findUnique({ where: { id } });
    if (!term) {
      throw AppError.notFound('Payment term not found');
    }
    return term;
  }

  static async create(
    actorId: string,
    data: {
      name: string;
      days: number;
      isDefault?: boolean;
    }
  ) {
    const term = await prisma.$transaction(async (tx) => {
      if (data.isDefault) {
        await tx.paymentTerm.updateMany({
          where: { isDefault: true },
          data: { isDefault: false },
        });
      }

      return tx.paymentTerm.create({
        data: {
          name: data.name.trim(),
          days: data.days,
          isDefault: data.isDefault ?? false,
        },
      });
    });

    await recordAuditLog({
      actorId,
      entity: 'payment_term',
      entityId: term.id,
      action: 'create_payment_term',
      meta: { name: term.name, days: term.days },
    });

    return term;
  }

  static async update(
    actorId: string,
    id: string,
    data: {
      name?: string;
      days?: number;
      isDefault?: boolean;
      isActive?: boolean;
    }
  ) {
    const existing = await prisma.paymentTerm.findUnique({ where: { id } });
    if (!existing) {
      throw AppError.notFound('Payment term not found');
    }

    const updated = await prisma.$transaction(async (tx) => {
      if (data.isDefault) {
        await tx.paymentTerm.updateMany({
          where: { isDefault: true, id: { not: id } },
          data: { isDefault: false },
        });
      }

      return tx.paymentTerm.update({
        where: { id },
        data: {
          ...(data.name ? { name: data.name.trim() } : {}),
          ...(data.days !== undefined ? { days: data.days } : {}),
          ...(data.isDefault !== undefined ? { isDefault: data.isDefault } : {}),
          ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
        },
      });
    });

    await recordAuditLog({
      actorId,
      entity: 'payment_term',
      entityId: id,
      action: 'update_payment_term',
      meta: data,
    });

    return updated;
  }

  static async archive(actorId: string, id: string) {
    const existing = await prisma.paymentTerm.findUnique({ where: { id } });
    if (!existing) {
      throw AppError.notFound('Payment term not found');
    }

    const archived = await prisma.paymentTerm.update({
      where: { id },
      data: { isActive: false },
    });

    await recordAuditLog({
      actorId,
      entity: 'payment_term',
      entityId: id,
      action: 'archive_payment_term',
    });

    return { id: archived.id, isActive: false };
  }
}
