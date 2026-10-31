import { route } from '@/server/route-wrapper';
import { runBilling } from '@/server/billing/billing.service';
import { ok } from '@/lib/api-envelope';
import { billingRunSchema } from '@/lib/validators/subscription.validator';
import { Role } from '@/lib/constants/enums';
import { todayInAppTz, toCalendarDate } from '@/lib/dates';

export const POST = route(
  { roles: [Role.ADMIN, Role.STAFF], body: billingRunSchema },
  async ({ session, body }) => {
    const asOfDate = body.asOfDate
      ? toCalendarDate(body.asOfDate)
      : todayInAppTz();

    const result = await runBilling(session, {
      asOfDate,
      autoConfirm: body.autoConfirm ?? false,
      subscriptionIds: body.subscriptionIds,
    });

    return ok(result);
  }
);

