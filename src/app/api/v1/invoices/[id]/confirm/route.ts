import { route } from '@/server/route-wrapper';
import { InvoiceService } from '@/server/billing/invoice.service';
import { ok } from '@/lib/api-envelope';
import { Role } from '@/lib/constants/enums';

export const POST = route(
  { roles: [Role.ADMIN, Role.STAFF] },
  async ({ session, params }) => {
    const invoice = await InvoiceService.confirm(params.id, session);
    return ok(invoice);
  }
);

