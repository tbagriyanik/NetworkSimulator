import { NextRequest, NextResponse } from 'next/server';
import { CSRF_COOKIE_NAME, CSRF_HEADER_NAME, isValidCsrfRequest } from './src/lib/security/csrf';

/**
 * Middleware that generates security headers and CSP.
 * Uses `unsafe-eval` and `unsafe-inline` to support React dev mode,
 * Turbopack HMR, and srcdoc iframe panels.
 */
export function middleware(request: NextRequest) {
  const isProd = process.env.NODE_ENV === 'production';

  const csp = [
    "default-src 'self'",
    "base-uri 'self'",
    "form-action 'self' *",
    "frame-ancestors 'none'",
    "object-src 'none'",
    "script-src 'self' blob: 'unsafe-eval' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data: https:",
    "connect-src 'self' ws: wss: https:",
    "worker-src 'self' blob:",
    "manifest-src 'self'",
    "upgrade-insecure-requests",
  ].join('; ');

  const isApiRequest = request.nextUrl.pathname.startsWith('/api/');
  const isUnsafeMethod = !['GET', 'HEAD', 'OPTIONS'].includes(request.method);

  if (isApiRequest && isUnsafeMethod && !isValidCsrfRequest(request.headers.get('cookie'), request.headers.get(CSRF_HEADER_NAME))) {
    return NextResponse.json({ error: 'Invalid CSRF token' }, { status: 403 });
  }

  if (isApiRequest && request.method === 'OPTIONS') {
    const preflight = new NextResponse(null, { status: 204 });
    preflight.headers.set('Allow', 'GET, HEAD, POST, OPTIONS');
    return preflight;
  }

  const response = NextResponse.next();
  const isFontRequest = request.nextUrl.pathname.startsWith('/fonts/');
  if (isFontRequest) {
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
    response.headers.set('Cache-Control', 'public, max-age=31536000, immutable');
  }
  if (isApiRequest) {
    const origin = request.headers.get('origin');
    if (origin === request.nextUrl.origin) response.headers.set('Access-Control-Allow-Origin', origin);
    response.headers.set('Vary', 'Origin');
    response.headers.set('Access-Control-Allow-Credentials', 'true');
    response.headers.set('Access-Control-Allow-Headers', `Content-Type, ${CSRF_HEADER_NAME}`);
    response.headers.set('Access-Control-Allow-Methods', 'GET, HEAD, POST, OPTIONS');
  }
  if (!request.cookies.has(CSRF_COOKIE_NAME)) {
    response.cookies.set(CSRF_COOKIE_NAME, crypto.randomUUID(), {
      httpOnly: false,
      sameSite: 'strict',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
    });
  }
  response.headers.set('Content-Security-Policy', csp);
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  if (isProd) {
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }

  return response;
}

export const config = { matcher: '/((?!_next/static|_next/image|favicon.ico).*)' };
