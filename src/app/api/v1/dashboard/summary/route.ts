import { route } from '@/server/route-wrapper';
import { DashboardService } from '@/server/dashboard/dashboard.service';
import { ok } from '@/lib/api-envelope';
import { dashboardQuerySchema } from '@/lib/validators/dashboard.validator';
import { Role } from '@/lib/constants/enums';

export const GET = route(
  {
    roles: [Role.ADMIN, Role.STAFF],
    query: dashboardQuerySchema,
  },
  async ({ query }) => {
    const summary = await DashboardService.getSummary({
      from: query.from,
      to: query.to,
      planId: query.planId,
      customerId: query.customerId,
      status: query.status,
    });
    return ok(summary);
  }
);
