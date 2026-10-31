import { route } from '@/server/route-wrapper';
import { PortalService } from '@/server/portal/portal.service';
import { ok } from '@/lib/api-envelope';
import { portalProfileUpdateSchema } from '@/lib/validators/portal.validator';
import { Role } from '@/lib/constants/enums';

export const GET = route(
  {
    roles: [Role.CUSTOMER],
  },
  async ({ session }) => {
    const profile = await PortalService.getProfile(session);
    return ok(profile);
  }
);

export const PATCH = route(
  {
    roles: [Role.CUSTOMER],
    body: portalProfileUpdateSchema,
  },
  async ({ body, session }) => {
    const updated = await PortalService.updateProfile(body, session);
    return ok(updated);
  }
);

