import { route } from '@/server/route-wrapper';
import { PortalService } from '@/server/portal/portal.service';
import { ok } from '@/lib/api-envelope';
import { Role } from '@/lib/constants/enums';

export const GET = route(
  {
    roles: [Role.CUSTOMER],
  },
  async ({ params, session }) => {
    const result = await PortalService.getSubscriptionDetail(params.id, session);
    return ok(result);
  }
);
