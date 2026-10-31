import { route } from '@/server/route-wrapper';
import { createStaffSchema } from '@/lib/validators/auth.validator';
import { AuthService } from '@/server/auth/auth.service';
import { created } from '@/lib/api-envelope';
import { Role } from '@/lib/constants/enums';

export const POST = route(
  { roles: [Role.ADMIN], body: createStaffSchema },
  async ({ session, body }) => {
    const user = await AuthService.createStaff(session.userId, body);
    return created(user);
  }
);
