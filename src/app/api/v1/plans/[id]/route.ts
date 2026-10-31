import { route } from '@/server/route-wrapper';
import { ok } from '@/lib/api-envelope';
import { updatePlanSchema } from '@/lib/validators/catalog.validator';
import { PlanService } from '@/server/catalog/plan.service';
import { Role } from '@/lib/constants/enums';

export const GET = route(
  { roles: [Role.ADMIN, Role.STAFF, Role.CUSTOMER] },
  async ({ params }) => {
    const plan = await PlanService.getById(params.id);
    return ok(plan);
  }
);

export const PATCH = route(
  { roles: [Role.ADMIN], body: updatePlanSchema },
  async ({ session, params, body }) => {
    const plan = await PlanService.update(session.userId, params.id, body);
    return ok(plan);
  }
);

export const DELETE = route(
  { roles: [Role.ADMIN] },
  async ({ session, params }) => {
    const result = await PlanService.archive(session.userId, params.id);
    return ok(result);
  }
);
