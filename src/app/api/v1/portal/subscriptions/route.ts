import { route } from '@/server/route-wrapper';
import { PortalService } from '@/server/portal/portal.service';
import { parsePagination } from '@/lib/pagination';
import { ok } from '@/lib/api-envelope';
import { Role } from '@/lib/constants/enums';

export const GET = route(
  {
    roles: [Role.CUSTOMER],
  },
  async ({ req, session }) => {
    const pagination = parsePagination(req);
    const result = await PortalService.getSubscriptions(pagination, session);
    return ok(result);
  }
);

