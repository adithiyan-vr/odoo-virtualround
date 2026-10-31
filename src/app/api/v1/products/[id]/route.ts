import { route } from '@/server/route-wrapper';
import { ok } from '@/lib/api-envelope';
import { updateProductSchema } from '@/lib/validators/catalog.validator';
import { ProductService } from '@/server/catalog/product.service';
import { Role } from '@/lib/constants/enums';

export const GET = route(
  { roles: [Role.ADMIN, Role.STAFF] },
  async ({ params }) => {
    const product = await ProductService.getById(params.id);
    return ok(product);
  }
);

export const PATCH = route(
  { roles: [Role.ADMIN], body: updateProductSchema },
  async ({ session, params, body }) => {
    const product = await ProductService.update(session.userId, params.id, body);
    return ok(product);
  }
);

export const DELETE = route(
  { roles: [Role.ADMIN] },
  async ({ session, params }) => {
    const result = await ProductService.archive(session.userId, params.id);
    return ok(result);
  }
);
