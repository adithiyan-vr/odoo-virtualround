import { route } from '@/server/route-wrapper';
import { PaymentService } from '@/server/payments/payment.service';
import { ok } from '@/lib/api-envelope';
import { Role } from '@/lib/constants/enums';

export const GET = route(
  {
    roles: [Role.ADMIN, Role.STAFF, Role.CUSTOMER],
  },
  async ({ params, session }) => {
    const payments = await PaymentService.getInvoicePayments(params.id, session);
    return ok(payments);
  }
);

