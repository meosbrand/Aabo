import { NextResponse, type NextRequest } from 'next/server';
import { getSessionCookie } from 'better-auth/cookies';

/**
 * Optimistic auth gate for the signed-in area. Pages still verify the session on the
 * server (getSessionUser); this only avoids rendering private pages for anonymous visitors.
 */
export function middleware(req: NextRequest) {
  if (!getSessionCookie(req)) {
    const url = new URL('/login', req.url);
    url.searchParams.set('next', req.nextUrl.pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = { matcher: ['/app/:path*', '/admin/:path*', '/onboarding'] };
