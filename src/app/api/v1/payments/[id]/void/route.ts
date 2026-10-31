import { route } from '@/server/route-wrapper';
import { PaymentService } from '@/server/payments/payment.service';
import { ok } from '@/lib/api-envelope';
import { Role } from '@/lib/constants/enums';

export const POST = route(
  {
    roles: [Role.ADMIN],
  },
  async ({ params, session }) => {
    const result = await PaymentService.voidPayment(params.id, session);
    return ok(result);
  }
);
