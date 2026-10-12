import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Next.js middleware / proxy redirect:
 * Inspects the non-HttpOnly signed-in hint cookie (`ht_signed_in`).
 *
 * Rules:
 * - Public routes: /login, /register, /forgot-password, /reset-password, /verify-email.
 *   If ht_signed_in is set and user visits /login or /register, redirect to /dashboard.
 * - App routes: /dashboard, /pipeline, /applications, /companies, /settings, /admin.
 *   If ht_signed_in is missing, redirect to /login?next=<current_path>.
 *
 * Note: This check is purely for frontend UX optimization. Real security is enforced
 * by the API server on every authenticated request.
 */
export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const hasSignedInHint = request.cookies.has('ht_signed_in');

  const isAppRoute =
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/pipeline') ||
    pathname.startsWith('/applications') ||
    pathname.startsWith('/companies') ||
    pathname.startsWith('/settings') ||
    pathname.startsWith('/admin');

  if (isAppRoute && !hasSignedInHint) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('next', pathname + search);
    return NextResponse.redirect(loginUrl);
  }

  if (hasSignedInHint && (pathname === '/login' || pathname === '/register')) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const proxy = middleware;
export default middleware;

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
