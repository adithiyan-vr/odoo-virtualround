import { route } from '@/server/route-wrapper';
import { SubscriptionService } from '@/server/subscriptions/subscription.service';
import { ok } from '@/lib/api-envelope';
import { updateSubscriptionSchema } from '@/lib/validators/subscription.validator';
import { Role } from '@/lib/constants/enums';

export const GET = route(
  { roles: [Role.ADMIN, Role.STAFF, Role.CUSTOMER] },
  async ({ session, params }) => {
    const sub = await SubscriptionService.getById(params.id, session);
    return ok(sub);
  }
);

export const PATCH = route(
  { roles: [Role.ADMIN, Role.STAFF], body: updateSubscriptionSchema },
  async ({ session, params, body }) => {
    const sub = await SubscriptionService.update(session, params.id, body);
    return ok(sub);
  }
);

