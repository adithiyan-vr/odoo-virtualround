import { route } from '@/server/route-wrapper';
import { paginated, created } from '@/lib/api-envelope';
import { parsePagination } from '@/lib/pagination';
import { createPlanSchema } from '@/lib/validators/catalog.validator';
import { PlanService } from '@/server/catalog/plan.service';
import { Role, BillingInterval } from '@/lib/constants/enums';

export const GET = route(
  { roles: [Role.ADMIN, Role.STAFF, Role.CUSTOMER] },
  async ({ req, session }) => {
    const params = parsePagination(req);
    const url = new URL(req.url);
    const intervalParam = url.searchParams.get('interval') as BillingInterval | null;

    // Customers only see active plans
    const includeInactive = session.role === Role.ADMIN || session.role === Role.STAFF;
    const { plans, meta } = await PlanService.list(
      params,
      includeInactive,
      intervalParam || undefined
    );

    return paginated(plans, meta);
  }
);

export const POST = route(
  { roles: [Role.ADMIN], body: createPlanSchema },
  async ({ session, body }) => {
    const plan = await PlanService.create(session.userId, body);
    return created(plan);
  }
);
