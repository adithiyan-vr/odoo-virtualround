import { route } from '@/server/route-wrapper';
import { ok, created } from '@/lib/api-envelope';
import { createTaxSchema } from '@/lib/validators/catalog.validator';
import { TaxService } from '@/server/catalog/tax.service';
import { Role } from '@/lib/constants/enums';

export const GET = route(
  { roles: [Role.ADMIN, Role.STAFF] },
  async () => {
    const taxes = await TaxService.list();
    return ok(taxes);
  }
);

export const POST = route(
  { roles: [Role.ADMIN], body: createTaxSchema },
  async ({ session, body }) => {
    const tax = await TaxService.create(session.userId, body);
    return created(tax);
  }
);
