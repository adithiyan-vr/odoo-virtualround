import { route } from '@/server/route-wrapper';
import { PortalService } from '@/server/portal/portal.service';
import { ok } from '@/lib/api-envelope';
import { portalRequestActionSchema } from '@/lib/validators/portal.validator';
import { Role } from '@/lib/constants/enums';

export const POST = route(
  {
    roles: [Role.CUSTOMER],
    body: portalRequestActionSchema,
  },
  async ({ params, body, session }) => {
    const result = await PortalService.requestSubscriptionAction(
      params.id,
      body.action,
      session
    );
    return ok(result);
  }
);
