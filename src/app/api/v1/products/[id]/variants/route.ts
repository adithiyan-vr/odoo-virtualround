import { route } from '@/server/route-wrapper';
import { ok, created } from '@/lib/api-envelope';
import { createVariantSchema } from '@/lib/validators/catalog.validator';
import { ProductService } from '@/server/catalog/product.service';
import { Role } from '@/lib/constants/enums';

export const GET = route(
  { roles: [Role.ADMIN, Role.STAFF] },
  async ({ params }) => {
    const variants = await ProductService.listVariants(params.id);
    return ok(variants);
  }
);

export const POST = route(
  { roles: [Role.ADMIN], body: createVariantSchema },
  async ({ session, params, body }) => {
    const variant = await ProductService.createVariant(session.userId, params.id, body);
    return created(variant);
  }
);
