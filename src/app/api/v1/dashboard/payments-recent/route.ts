import { route } from '@/server/route-wrapper';
import { DashboardService } from '@/server/dashboard/dashboard.service';
import { ok } from '@/lib/api-envelope';
import { Role } from '@/lib/constants/enums';

export const GET = route(
  {
    roles: [Role.ADMIN, Role.STAFF],
  },
  async ({ req }) => {
    const url = new URL(req.url);
    const limit = parseInt(url.searchParams.get('limit') || '10', 10);
    const recent = await DashboardService.getRecentPayments(limit);
    return ok(recent);
  }
);

