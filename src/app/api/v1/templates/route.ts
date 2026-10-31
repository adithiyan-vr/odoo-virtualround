import { route } from '@/server/route-wrapper';
import { paginated, created } from '@/lib/api-envelope';
import { parsePagination } from '@/lib/pagination';
import { createTemplateSchema } from '@/lib/validators/catalog.validator';
import { TemplateService } from '@/server/catalog/template.service';
import { Role } from '@/lib/constants/enums';

export const GET = route(
  { roles: [Role.ADMIN, Role.STAFF] },
  async ({ req }) => {
    const params = parsePagination(req);
    const { templates, meta } = await TemplateService.list(params);
    return paginated(templates, meta);
  }
);

export const POST = route(
  { roles: [Role.ADMIN], body: createTemplateSchema },
  async ({ session, body }) => {
    const template = await TemplateService.create(session.userId, body);
    return created(template);
  }
);
