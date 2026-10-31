import { route } from '@/server/route-wrapper';
import { forgotPasswordSchema } from '@/lib/validators/auth.validator';
import { AuthService } from '@/server/auth/auth.service';
import { ok } from '@/lib/api-envelope';
import { getClientIp } from '@/lib/rate-limiter';

export const POST = route(
  { body: forgotPasswordSchema },
  async ({ req, body }) => {
    const ip = getClientIp(req);
    const origin = req.headers.get('origin') || undefined;

    const result = await AuthService.forgotPassword({
      email: body.email,
      ip,
      appUrl: origin,
    });

    return ok(result);
  }
);
