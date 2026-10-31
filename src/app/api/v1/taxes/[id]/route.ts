import { route } from '@/server/route-wrapper';
import { ok } from '@/lib/api-envelope';
import { updateTaxSchema } from '@/lib/validators/catalog.validator';
import { TaxService } from '@/server/catalog/tax.service';
import { Role } from '@/lib/constants/enums';

export const GET = route(
  { roles: [Role.ADMIN, Role.STAFF] },
  async ({ params }) => {
    const tax = await TaxService.getById(params.id);
    return ok(tax);
  }
);

export const PATCH = route(
  { roles: [Role.ADMIN], body: updateTaxSchema },
  async ({ session, params, body }) => {
    const tax = await TaxService.update(session.userId, params.id, body);
    return ok(tax);
  }
);

export const DELETE = route(
  { roles: [Role.ADMIN] },
  async ({ session, params }) => {
    const result = await TaxService.archive(session.userId, params.id);
    return ok(result);
  }
);
