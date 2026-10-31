import { route } from '@/server/route-wrapper';
import { DiscountService } from '@/server/discounts/discount.service';
import { parsePagination } from '@/lib/pagination';
import { ok, created } from '@/lib/api-envelope';
import { createDiscountSchema } from '@/lib/validators/subscription.validator';
import { Role } from '@/lib/constants/enums';

export const GET = route(
  { roles: [Role.ADMIN] },
  async ({ req }) => {
    const params = parsePagination(req);
    const result = await DiscountService.list(params, true);
    return ok(result);
  }
);

export const POST = route(
  { roles: [Role.ADMIN], body: createDiscountSchema },
  async ({ session, body }) => {
    const discount = await DiscountService.create(session.userId, body);
    return created(discount);
  }
);

