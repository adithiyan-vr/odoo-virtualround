import { route } from '@/server/route-wrapper';
import { paginated, created } from '@/lib/api-envelope';
import { parsePagination, buildPaginationMeta } from '@/lib/pagination';
import { createCustomerSchema } from '@/lib/validators/auth.validator';
import { Role } from '@/lib/constants/enums';
import { AppError } from '@/lib/errors';
import prisma from '@/lib/db';
import { recordAuditLog } from '@/lib/audit';

export const GET = route(
  { roles: [Role.ADMIN, Role.STAFF] },
  async ({ req }) => {
    const params = parsePagination(req);

    const where = {
      isActive: true,
      ...(params.q
        ? {
            OR: [
              { name: { contains: params.q, mode: 'insensitive' as const } },
              { email: { contains: params.q, mode: 'insensitive' as const } },
              { company: { contains: params.q, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };

    const [total, customers] = await Promise.all([
      prisma.customer.count({ where }),
      prisma.customer.findMany({
        where,
        skip: params.skip,
        take: params.take,
        orderBy: { name: 'asc' },
      }),
    ]);

    return paginated(customers, buildPaginationMeta(total, params.page, params.pageSize));
  }
);

export const POST = route(
  { roles: [Role.ADMIN, Role.STAFF], body: createCustomerSchema },
  async ({ session, body }) => {
    const existing = await prisma.customer.findUnique({
      where: { email: body.email.toLowerCase().trim() },
    });

    if (existing) {
      throw AppError.conflict('Customer with this email already exists');
    }

    const customer = await prisma.customer.create({
      data: {
        name: body.name.trim(),
        email: body.email.toLowerCase().trim(),
        company: body.company || null,
        phone: body.phone || null,
        addressLine1: body.addressLine1 || null,
        addressLine2: body.addressLine2 || null,
        city: body.city || null,
        state: body.state || null,
        postalCode: body.postalCode || null,
        country: body.country || 'IN',
        gstin: body.gstin || null,
        notes: body.notes || null,
      },
    });

    await recordAuditLog({
      actorId: session.userId,
      entity: 'customer',
      entityId: customer.id,
      action: 'create_customer',
      meta: { name: customer.name, email: customer.email },
    });

    return created(customer);
  }
);
