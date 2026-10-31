import { route } from '@/server/route-wrapper';
import { DiscountService } from '@/server/discounts/discount.service';
import { ok, noContent } from '@/lib/api-envelope';
import { updateDiscountSchema } from '@/lib/validators/subscription.validator';
import { Role } from '@/lib/constants/enums';

export const GET = route(
  { roles: [Role.ADMIN, Role.STAFF] },
  async ({ params }) => {
    const discount = await DiscountService.getById(params.id);
    return ok(discount);
  }
);

export const PATCH = route(
  { roles: [Role.ADMIN], body: updateDiscountSchema },
  async ({ session, params, body }) => {
    const discount = await DiscountService.update(session.userId, params.id, body);
    return ok(discount);
  }
);

export const DELETE = route(
  { roles: [Role.ADMIN] },
  async ({ session, params }) => {
    await DiscountService.archive(session.userId, params.id);
    return noContent();
  }
);

