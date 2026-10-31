import { route } from '@/server/route-wrapper';
import { resetPasswordSchema } from '@/lib/validators/auth.validator';
import { AuthService } from '@/server/auth/auth.service';
import { ok } from '@/lib/api-envelope';

export const POST = route(
  { body: resetPasswordSchema },
  async ({ body }) => {
    const result = await AuthService.resetPassword({
      token: body.token,
      newPassword: body.newPassword,
    });

    return ok(result);
  }
);
