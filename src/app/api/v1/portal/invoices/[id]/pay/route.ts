import { route } from '@/server/route-wrapper';
import { PortalService } from '@/server/portal/portal.service';
import { ok } from '@/lib/api-envelope';
import { portalPayInvoiceSchema } from '@/lib/validators/portal.validator';
import { Role, PaymentMethod } from '@/lib/constants/enums';

export const POST = route(
  {
    roles: [Role.CUSTOMER],
    body: portalPayInvoiceSchema,
  },
  async ({ params, body, session }) => {
    const result = await PortalService.payInvoice(
      params.id,
      {
        amount: body.amount,
        method: body.method as PaymentMethod,
        reference: body.reference,
        note: body.note,
      },
      session
    );
    return ok(result);
  }
);
