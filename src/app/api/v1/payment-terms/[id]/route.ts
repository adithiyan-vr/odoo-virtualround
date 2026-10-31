import { route } from '@/server/route-wrapper';
import { ok } from '@/lib/api-envelope';
import { updatePaymentTermSchema } from '@/lib/validators/catalog.validator';
import { PaymentTermService } from '@/server/catalog/payment-term.service';
import { Role } from '@/lib/constants/enums';

export const GET = route(
  { roles: [Role.ADMIN, Role.STAFF] },
  async ({ params }) => {
    const term = await PaymentTermService.getById(params.id);
    return ok(term);
  }
);

export const PATCH = route(
  { roles: [Role.ADMIN], body: updatePaymentTermSchema },
  async ({ session, params, body }) => {
    const term = await PaymentTermService.update(session.userId, params.id, body);
    return ok(term);
  }
);

export const DELETE = route(
  { roles: [Role.ADMIN] },
  async ({ session, params }) => {
    const result = await PaymentTermService.archive(session.userId, params.id);
    return ok(result);
  }
);
