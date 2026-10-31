import { route } from '@/server/route-wrapper';
import { ok, created } from '@/lib/api-envelope';
import { createPaymentTermSchema } from '@/lib/validators/catalog.validator';
import { PaymentTermService } from '@/server/catalog/payment-term.service';
import { Role } from '@/lib/constants/enums';

export const GET = route(
  { roles: [Role.ADMIN, Role.STAFF] },
  async () => {
    const terms = await PaymentTermService.list();
    return ok(terms);
  }
);

export const POST = route(
  { roles: [Role.ADMIN], body: createPaymentTermSchema },
  async ({ session, body }) => {
    const term = await PaymentTermService.create(session.userId, body);
    return created(term);
  }
);
