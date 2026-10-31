import { route } from '@/server/route-wrapper';
import { ok } from '@/lib/api-envelope';
import { getClearSessionCookieHeader } from '@/lib/auth-session';

export const POST = route({}, async () => {
  const headers = new Headers();
  headers.append('Set-Cookie', getClearSessionCookieHeader());
  return ok({ message: 'Successfully logged out' }, headers);
});
