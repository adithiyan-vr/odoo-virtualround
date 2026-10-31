import { route } from '@/server/route-wrapper';
import { autoClose } from '@/server/billing/billing.service';
import { ok } from '@/lib/api-envelope';
import { Role } from '@/lib/constants/enums';
import { todayInAppTz } from '@/lib/dates';

export const POST = route(
  { roles: [Role.ADMIN] },
  async ({ session }) => {
    const result = await autoClose(session, todayInAppTz());
    return ok(result);
  }
);

