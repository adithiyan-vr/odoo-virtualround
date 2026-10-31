import { route } from '@/server/route-wrapper';
import { signupSchema } from '@/lib/validators/auth.validator';
import { AuthService } from '@/server/auth/auth.service';
import { created } from '@/lib/api-envelope';
import { getSessionCookieHeader } from '@/lib/auth-session';

export const POST = route(
  { body: signupSchema },
  async ({ body }) => {
    const { user, token } = await AuthService.signup(body);
    const headers = new Headers();
    headers.append('Set-Cookie', getSessionCookieHeader(token));

    return created(
      {
        id: user.id,
        email: user.email,
        role: user.role,
        name: user.name,
      },
      headers
    );
  }
);
