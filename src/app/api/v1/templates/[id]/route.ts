import { route } from '@/server/route-wrapper';
import { ok } from '@/lib/api-envelope';
import { updateTemplateSchema } from '@/lib/validators/catalog.validator';
import { TemplateService } from '@/server/catalog/template.service';
import { Role } from '@/lib/constants/enums';

export const GET = route(
  { roles: [Role.ADMIN, Role.STAFF] },
  async ({ params }) => {
    const template = await TemplateService.getById(params.id);
    return ok(template);
  }
);

export const PATCH = route(
  { roles: [Role.ADMIN], body: updateTemplateSchema },
  async ({ session, params, body }) => {
    const template = await TemplateService.update(session.userId, params.id, body);
    return ok(template);
  }
);

export const DELETE = route(
  { roles: [Role.ADMIN] },
  async ({ session, params }) => {
    const result = await TemplateService.archive(session.userId, params.id);
    return ok(result);
  }
);
