import { route } from '@/server/route-wrapper';
import { loginSchema } from '@/lib/validators/auth.validator';
import { AuthService } from '@/server/auth/auth.service';
import { ok } from '@/lib/api-envelope';
import { getSessionCookieHeader } from '@/lib/auth-session';
import { getClientIp } from '@/lib/rate-limiter';

export const POST = route(
  { body: loginSchema },
  async ({ req, body }) => {
    const ip = getClientIp(req);
    const { user, token } = await AuthService.login({
      email: body.email,
      password: body.password,
      ip,
    });

    const headers = new Headers();
    headers.append('Set-Cookie', getSessionCookieHeader(token));

    return ok(
      {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          customerId: user.customerId,
        },
      },
      headers
    );
  }
);
