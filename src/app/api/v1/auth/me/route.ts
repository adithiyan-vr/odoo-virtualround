import { route } from '@/server/route-wrapper';
import { ok } from '@/lib/api-envelope';
import { Role } from '@/lib/constants/enums';

export const GET = route(
  { roles: [Role.ADMIN, Role.STAFF, Role.CUSTOMER] },
  async ({ session }) => {
    return ok({
      id: session.userId,
      name: session.name,
      email: session.email,
      role: session.role,
      customerId: session.customerId || null,
    });
  }
);
