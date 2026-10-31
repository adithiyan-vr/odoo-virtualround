import { route } from '@/server/route-wrapper';
import { SubscriptionService } from '@/server/subscriptions/subscription.service';
import { parsePagination } from '@/lib/pagination';
import { ok, created } from '@/lib/api-envelope';
import {
  createSubscriptionSchema,
  subscriptionQuerySchema,
} from '@/lib/validators/subscription.validator';
import { Role } from '@/lib/constants/enums';

export const GET = route(
  { roles: [Role.ADMIN, Role.STAFF, Role.CUSTOMER], query: subscriptionQuerySchema },
  async ({ req, session, query }) => {
    const pagination = parsePagination(req);
    const result = await SubscriptionService.list(
      {
        ...pagination,
        status: query.status,
        planId: query.planId,
        customerId: query.customerId,
        from: query.from,
        to: query.to,
      },
      session
    );
    return ok(result);
  }
);

export const POST = route(
  { roles: [Role.ADMIN, Role.STAFF], body: createSubscriptionSchema },
  async ({ session, body }) => {
    const sub = await SubscriptionService.create(session, body);
    return created(sub);
  }
);

