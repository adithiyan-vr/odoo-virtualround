import { route } from '@/server/route-wrapper';
import { DashboardService } from '@/server/dashboard/dashboard.service';
import { parsePagination } from '@/lib/pagination';
import { ok } from '@/lib/api-envelope';
import { Role } from '@/lib/constants/enums';

export const GET = route(
  {
    roles: [Role.ADMIN, Role.STAFF],
  },
  async ({ req }) => {
    const pagination = parsePagination(req);
    const overdue = await DashboardService.getOverdueInvoices(pagination);
    return ok(overdue);
  }
);

