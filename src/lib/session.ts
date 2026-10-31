import { SignJWT, jwtVerify } from 'jose';
import { Role } from './constants/enums';

export interface SessionPayload {
  sub: string;
  userId: string;
  email: string;
  name: string;
  role: Role;
  customerId?: string | null;
}

const JWT_SECRET_STRING =
  process.env.JWT_SECRET || 'brightloop_development_super_secret_jwt_key_at_least_32_bytes_long';
const JWT_SECRET = new TextEncoder().encode(JWT_SECRET_STRING);

export const COOKIE_NAME = 'bl_session';
export const ALT_COOKIE_NAME = 'bl_token';

export async function createSessionToken(
  payload: Omit<SessionPayload, 'userId'> & { userId?: string }
): Promise<string> {
  const userId = payload.userId || payload.sub;
  const ttlHours = parseInt(process.env.SESSION_TTL_HOURS || '8', 10);

  return new SignJWT({
    sub: userId,
    userId,
    email: payload.email,
    name: payload.name,
    role: payload.role,
    customerId: payload.customerId || null,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${ttlHours}h`)
    .sign(JWT_SECRET);
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET, {
      algorithms: ['HS256'],
    });

    return {
      sub: payload.sub as string,
      userId: (payload.userId as string) || (payload.sub as string),
      email: payload.email as string,
      name: payload.name as string,
      role: payload.role as Role,
      customerId: (payload.customerId as string) || null,
    };
  } catch {
    return null;
  }
}

export function extractTokenFromRequest(req: Request): string | null {
  const authHeader = req.headers.get('authorization') || req.headers.get('Authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7).trim();
  }

  const cookieHeader = req.headers.get('cookie');
  if (cookieHeader) {
    const cookies = cookieHeader.split(';').map((c) => c.trim());
    for (const cookie of cookies) {
      if (cookie.startsWith(`${COOKIE_NAME}=`)) {
        return cookie.substring(COOKIE_NAME.length + 1).trim();
      }
      if (cookie.startsWith(`${ALT_COOKIE_NAME}=`)) {
        return cookie.substring(ALT_COOKIE_NAME.length + 1).trim();
      }
    }
  }

  return null;
}

export async function getSession(req: Request): Promise<SessionPayload | null> {
  const token = extractTokenFromRequest(req);
  if (!token) return null;
  return verifySessionToken(token);
}

export function getSessionCookieHeader(token: string): string {
  const isProd = process.env.NODE_ENV === 'production';
  const ttlSeconds = parseInt(process.env.SESSION_TTL_HOURS || '8', 10) * 3600;
  return `${COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${ttlSeconds}${isProd ? '; Secure' : ''}`;
}

export function getClearSessionCookieHeader(): string {
  const isProd = process.env.NODE_ENV === 'production';
  return `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${isProd ? '; Secure' : ''}`;
}
