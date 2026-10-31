import { route } from '@/server/route-wrapper';
import { SubscriptionService } from '@/server/subscriptions/subscription.service';
import { ok } from '@/lib/api-envelope';
import { Role } from '@/lib/constants/enums';

export const POST = route(
  { roles: [Role.ADMIN, Role.STAFF] },
  async ({ session, params }) => {
    const sub = await SubscriptionService.renew(session, params.id);
    return ok(sub);
  }
);

