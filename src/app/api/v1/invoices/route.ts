import { route } from '@/server/route-wrapper';
import { InvoiceService } from '@/server/billing/invoice.service';
import { parsePagination } from '@/lib/pagination';
import { ok } from '@/lib/api-envelope';
import { invoiceQuerySchema } from '@/lib/validators/subscription.validator';
import { Role } from '@/lib/constants/enums';

export const GET = route(
  { roles: [Role.ADMIN, Role.STAFF, Role.CUSTOMER], query: invoiceQuerySchema },
  async ({ req, session, query }) => {
    const pagination = parsePagination(req);
    const result = await InvoiceService.list(
      {
        ...pagination,
        status: query.status,
        overdue: query.overdue,
        customerId: query.customerId,
        subscriptionId: query.subscriptionId,
        from: query.from,
        to: query.to,
      },
      session
    );
    return ok(result);
  }
);

