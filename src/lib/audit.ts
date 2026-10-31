import prisma from './db';
import { Prisma } from '@prisma/client';

export interface AuditLogParams {
  actorId?: string | null;
  entity: string;
  entityId: string;
  action: string;
  meta?: Record<string, unknown> | null;
}

export async function recordAuditLog(
  params: AuditLogParams,
  tx?: Prisma.TransactionClient
): Promise<void> {
  const client = tx || prisma;
  try {
    await client.auditLog.create({
      data: {
        actorId: params.actorId || null,
        entity: params.entity,
        entityId: params.entityId,
        action: params.action,
        meta: params.meta ? (params.meta as Prisma.InputJsonValue) : Prisma.JsonNull,
      },
    });
  } catch (error) {
    // Non-blocking in case audit logging fails
    console.error('Failed to write audit log:', error);
  }
}
