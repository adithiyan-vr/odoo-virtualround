import { z } from 'zod';
import { route } from '@/server/route-wrapper';
import { SubscriptionService } from '@/server/subscriptions/subscription.service';
import { ok } from '@/lib/api-envelope';
import { Role, SubscriptionStatus } from '@/lib/constants/enums';

const transitionBody = z.object({
  to: z.nativeEnum(SubscriptionStatus),
});

export const POST = route(
  { roles: [Role.ADMIN, Role.STAFF, Role.CUSTOMER], body: transitionBody },
  async ({ session, params, body }) => {
    const sub = await SubscriptionService.transition(session, params.id, body.to);
    return ok(sub);
  }
);

