import { route } from '@/server/route-wrapper';
import { DiscountService } from '@/server/discounts/discount.service';
import { parsePagination } from '@/lib/pagination';
import { paginated, created } from '@/lib/api-envelope';
import { createDiscountSchema } from '@/lib/validators/subscription.validator';
import { Role } from '@/lib/constants/enums';

export const GET = route(
  { roles: [Role.ADMIN, Role.STAFF] },
  async ({ req }) => {
    const params = parsePagination(req);
    const result = await DiscountService.list(params, true);
    return paginated(result.discounts, result.meta);
  }
);

export const POST = route(
  { roles: [Role.ADMIN], body: createDiscountSchema },
  async ({ session, body }) => {
    const discount = await DiscountService.create(session.userId, body);
    return created(discount);
  }
);

