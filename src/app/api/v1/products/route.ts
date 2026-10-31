import { route } from '@/server/route-wrapper';
import { paginated, created } from '@/lib/api-envelope';
import { parsePagination } from '@/lib/pagination';
import { createProductSchema } from '@/lib/validators/catalog.validator';
import { ProductService } from '@/server/catalog/product.service';
import { Role } from '@/lib/constants/enums';

export const GET = route(
  { roles: [Role.ADMIN, Role.STAFF] },
  async ({ req }) => {
    const params = parsePagination(req);
    const { products, meta } = await ProductService.list(params);
    return paginated(products, meta);
  }
);

export const POST = route(
  { roles: [Role.ADMIN], body: createProductSchema },
  async ({ session, body }) => {
    const product = await ProductService.create(session.userId, body);
    return created(product);
  }
);
