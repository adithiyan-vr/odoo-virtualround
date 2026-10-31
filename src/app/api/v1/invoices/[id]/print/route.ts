import { route } from '@/server/route-wrapper';
import { InvoiceService } from '@/server/billing/invoice.service';
import { ok } from '@/lib/api-envelope';
import { Role } from '@/lib/constants/enums';

export const GET = route(
  { roles: [Role.ADMIN, Role.STAFF, Role.CUSTOMER] },
  async ({ session, params }) => {
    const data = await InvoiceService.getPrintData(params.id, session);
    return ok(data);
  }
);

