import { route } from '@/server/route-wrapper';
import { ok } from '@/lib/api-envelope';
import { updateVariantSchema } from '@/lib/validators/catalog.validator';
import { ProductService } from '@/server/catalog/product.service';
import { Role } from '@/lib/constants/enums';

export const PATCH = route(
  { roles: [Role.ADMIN], body: updateVariantSchema },
  async ({ session, params, body }) => {
    const variant = await ProductService.updateVariant(session.userId, params.id, body);
    return ok(variant);
  }
);

export const DELETE = route(
  { roles: [Role.ADMIN] },
  async ({ session, params }) => {
    const result = await ProductService.deleteVariant(session.userId, params.id);
    return ok(result);
  }
);
