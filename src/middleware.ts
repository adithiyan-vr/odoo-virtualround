import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifySessionToken, COOKIE_NAME, ALT_COOKIE_NAME } from '@/lib/session';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only guard non-API, non-static routes
  if (
    pathname.startsWith('/api') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  const token =
    request.cookies.get(COOKIE_NAME)?.value || request.cookies.get(ALT_COOKIE_NAME)?.value;

  const session = token ? await verifySessionToken(token) : null;

  // Protect Portal routes (CUSTOMER only)
  if (pathname.startsWith('/portal')) {
    if (!session) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('next', pathname);
      return NextResponse.redirect(loginUrl);
    }
    if (session.role !== 'CUSTOMER') {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  // Protect Admin / Staff app routes
  const adminStaffPaths = [
    '/dashboard',
    '/products',
    '/plans',
    '/templates',
    '/subscriptions',
    '/invoices',
    '/payments',
    '/discounts',
    '/taxes',
    '/payment-terms',
    '/customers',
    '/staff',
    '/settings',
    '/audit-log',
    '/dev',
  ];

  const isAdminStaffRoute = adminStaffPaths.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  if (isAdminStaffRoute) {
    if (!session) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('next', pathname);
      return NextResponse.redirect(loginUrl);
    }

    if (session.role === 'CUSTOMER') {
      return NextResponse.redirect(new URL('/portal', request.url));
    }

    // Admin-only subroutes
    const adminOnlyPaths = ['/staff', '/settings', '/taxes', '/payment-terms'];
    if (adminOnlyPaths.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
      if (session.role !== 'ADMIN') {
        return NextResponse.redirect(new URL('/dashboard', request.url));
      }
    }
  }

  // If already logged in and visiting auth pages
  if (session && (pathname === '/login' || pathname === '/signup')) {
    if (session.role === 'CUSTOMER') {
      return NextResponse.redirect(new URL('/portal', request.url));
    }
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
