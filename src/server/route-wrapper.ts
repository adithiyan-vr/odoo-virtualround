import { NextResponse } from 'next/server';
import { ZodSchema, ZodError } from 'zod';
import { Role } from '@/lib/constants/enums';
import { AppError, ErrorDetail } from '@/lib/errors';
import { errorResponse } from '@/lib/api-envelope';
import { getSession, SessionPayload } from '@/lib/session';
import prisma from '@/lib/db';

export interface ProtectedRouteConfig<TBody = unknown, TQuery = unknown> {
  roles: Role[];
  body?: ZodSchema<TBody>;
  query?: ZodSchema<TQuery>;
  requireActiveUser?: boolean;
}

export interface PublicRouteConfig<TBody = unknown, TQuery = unknown> {
  roles?: undefined;
  body?: ZodSchema<TBody>;
  query?: ZodSchema<TQuery>;
  requireActiveUser?: boolean;
}

export interface ProtectedRouteContext<TBody = unknown, TQuery = unknown, TParams = Record<string, string>> {
  req: Request;
  session: SessionPayload;
  body: TBody;
  query: TQuery;
  params: TParams;
  requestId: string;
}

export interface PublicRouteContext<TBody = unknown, TQuery = unknown, TParams = Record<string, string>> {
  req: Request;
  session: SessionPayload | null;
  body: TBody;
  query: TQuery;
  params: TParams;
  requestId: string;
}

function parseZodErrors(error: ZodError): ErrorDetail[] {
  return error.errors.map((err) => ({
    field: err.path.join('.'),
    issue: err.message,
  }));
}

export function route<TBody = unknown, TQuery = unknown, TParams = Record<string, string>>(
  config: ProtectedRouteConfig<TBody, TQuery>,
  handler: (ctx: ProtectedRouteContext<TBody, TQuery, TParams>) => Promise<NextResponse>
): (req: Request, routeParams?: { params?: Promise<TParams> | TParams }) => Promise<NextResponse>;

export function route<TBody = unknown, TQuery = unknown, TParams = Record<string, string>>(
  config: PublicRouteConfig<TBody, TQuery>,
  handler: (ctx: PublicRouteContext<TBody, TQuery, TParams>) => Promise<NextResponse>
): (req: Request, routeParams?: { params?: Promise<TParams> | TParams }) => Promise<NextResponse>;

export function route<TBody = unknown, TQuery = unknown, TParams = Record<string, string>>(
  config: ProtectedRouteConfig<TBody, TQuery> | PublicRouteConfig<TBody, TQuery>,
  handler: (ctx: any) => Promise<NextResponse>
) {
  return async (
    req: Request,
    routeParams?: { params?: Promise<TParams> | TParams }
  ): Promise<NextResponse> => {
    const requestId = crypto.randomUUID();

    try {
      // 1. CSRF check for mutating methods
      if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
        const origin = req.headers.get('origin');
        const host = req.headers.get('host');
        if (origin && host) {
          try {
            const originHost = new URL(origin).host;
            const isLoopbackMatch =
              (originHost.startsWith('localhost') || originHost.startsWith('127.0.0.1')) &&
              (host.startsWith('localhost') || host.startsWith('127.0.0.1'));
            if (originHost !== host && !isLoopbackMatch) {
              return errorResponse(AppError.forbidden('Cross-origin request blocked'));
            }
          } catch {
            // Ignore malformed origin
          }
        }
      }

      // 2. Authentication & Authorization
      const session = await getSession(req);

      if (config.roles && config.roles.length > 0) {
        if (!session) {
          return errorResponse(AppError.unauthenticated());
        }

        if (!config.roles.includes(session.role)) {
          return errorResponse(AppError.forbidden());
        }

        if (config.requireActiveUser !== false) {
          const user = await prisma.user.findUnique({
            where: { id: session.userId },
            select: { isActive: true },
          });

          if (!user || !user.isActive) {
            return errorResponse(AppError.forbidden('Account is deactivated'));
          }
        }
      }

      // 3. Resolve route params
      let params = {} as TParams;
      if (routeParams?.params) {
        params = (await routeParams.params) as TParams;
      }

      // 4. Query validation
      let query = {} as TQuery;
      if (config.query) {
        const url = new URL(req.url);
        const searchObj: Record<string, string> = {};
        url.searchParams.forEach((val, key) => {
          searchObj[key] = val;
        });

        const queryResult = config.query.safeParse(searchObj);
        if (!queryResult.success) {
          return errorResponse(
            AppError.badRequest('Invalid query parameters', parseZodErrors(queryResult.error))
          );
        }
        query = queryResult.data;
      }

      // 5. Body validation
      let body = {} as TBody;
      if (config.body) {
        let rawBody: unknown;
        try {
          rawBody = await req.json();
        } catch {
          return errorResponse(AppError.badRequest('Malformed JSON body'));
        }

        const bodyResult = config.body.safeParse(rawBody);
        if (!bodyResult.success) {
          return errorResponse(
            AppError.badRequest('Validation failed', parseZodErrors(bodyResult.error))
          );
        }
        body = bodyResult.data;
      }

      // 6. Execute Handler
      const context = {
        req,
        session,
        body,
        query,
        params,
        requestId,
      };

      const response = await handler(
        context as ProtectedRouteContext<TBody, TQuery, TParams> & PublicRouteContext<TBody, TQuery, TParams>
      );
      response.headers.set('X-Request-Id', requestId);
      return response;
    } catch (err: unknown) {
      if (
        typeof err === 'object' &&
        err !== null &&
        'digest' in err &&
        (err as { digest: string }).digest === 'NEXT_PRERENDER_INTERRUPTED'
      ) {
        throw err;
      }

      if (err instanceof AppError) {
        return errorResponse(err);
      }

      if (err instanceof ZodError) {
        return errorResponse(AppError.badRequest('Validation failed', parseZodErrors(err)));
      }

      // Prisma Unique Constraint violation
      if (typeof err === 'object' && err !== null && 'code' in err && (err as { code: string }).code === 'P2002') {
        const meta = (err as { meta?: { target?: string[] } }).meta;
        const target = meta?.target ? meta.target.join(', ') : 'unique constraint';
        return errorResponse(AppError.conflict(`A record with this ${target} already exists`));
      }

      // Unexpected error
      console.error(`[${requestId}] Unhandled API Error:`, err);
      return errorResponse(AppError.internal());
    }
  };
}
