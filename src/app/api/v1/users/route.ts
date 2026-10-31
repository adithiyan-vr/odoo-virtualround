import { route } from '@/server/route-wrapper';
import { paginated } from '@/lib/api-envelope';
import { parsePagination, buildPaginationMeta } from '@/lib/pagination';
import { Role } from '@/lib/constants/enums';
import prisma from '@/lib/db';

export const GET = route(
  { roles: [Role.ADMIN] },
  async ({ req }) => {
    const params = parsePagination(req);
    const url = new URL(req.url);
    const roleParam = url.searchParams.get('role') as Role | null;

    const where = {
      ...(roleParam && Object.values(Role).includes(roleParam) ? { role: roleParam } : {}),
      ...(params.q
        ? {
            OR: [
              { name: { contains: params.q, mode: 'insensitive' as const } },
              { email: { contains: params.q, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };

    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        skip: params.skip,
        take: params.take,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          isActive: true,
          lastLoginAt: true,
          createdAt: true,
        },
      }),
    ]);

    return paginated(users, buildPaginationMeta(total, params.page, params.pageSize));
  }
);
