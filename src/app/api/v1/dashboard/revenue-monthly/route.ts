import { route } from '@/server/route-wrapper';
import { DashboardService } from '@/server/dashboard/dashboard.service';
import { ok } from '@/lib/api-envelope';
import { Role } from '@/lib/constants/enums';

export const GET = route(
  {
    roles: [Role.ADMIN, Role.STAFF],
  },
  async () => {
    const monthly = await DashboardService.getMonthlyRevenue(6);
    return ok(monthly);
  }
);

