import { route } from '@/server/route-wrapper';
import { PortalService } from '@/server/portal/portal.service';
import { parsePagination } from '@/lib/pagination';
import { ok } from '@/lib/api-envelope';
import { portalInvoicesQuerySchema } from '@/lib/validators/portal.validator';
import { Role } from '@/lib/constants/enums';

export const GET = route(
  {
    roles: [Role.CUSTOMER],
    query: portalInvoicesQuerySchema,
  },
  async ({ req, session, query }) => {
    const pagination = parsePagination(req);
    const result = await PortalService.getInvoices(
      {
        ...pagination,
        status: query.status,
      },
      session
    );
    return ok(result);
  }
);

