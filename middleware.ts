import { NextRequest, NextResponse } from 'next/server';
import { CSRF_COOKIE_NAME, CSRF_HEADER_NAME, isValidCsrfRequest } from './src/lib/security/csrf';

function generateNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes));
}

/**
 * Middleware that generates a per‑request CSP header.
 * Uses `unsafe-inline` to allow inline scripts in srcdoc iframe content
 * (IoT web panel, router admin page, etc.).
 */
// Content hash of Next.js/Turbopack's internally injected inline script
// (dev bootstrap). It is created at runtime without a nonce, so CSP must
// whitelist it by hash. Stable for a given Next.js version.
const NEXT_DEV_INLINE_SCRIPT_HASHES = "'sha256-h09xGrgXSXqNe+hPe6yJWX9EXQ3ZZV3YkFiHDhOaFd4='";

export function middleware(request: NextRequest) {
  // Generate a random nonce for this request
  const nonce = generateNonce();
  const isProd = process.env.NODE_ENV === 'production';
  const scriptSrcDev = isProd ? "" : " 'unsafe-eval'";

  const csp = [
    "default-src 'self'",
    "base-uri 'self'",
    "form-action 'self' *",
    "frame-ancestors 'none'",
    "object-src 'none'",
    `script-src 'self' blob: 'nonce-${nonce}' ${NEXT_DEV_INLINE_SCRIPT_HASHES}${scriptSrcDev}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
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

  // Forward the nonce on the request as well as the response. Next.js reads
  // this request header when it renders its own inline scripts; setting only
  // the response header leaves those scripts without a matching nonce.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);
  const response = NextResponse.next({ request: { headers: requestHeaders } });
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
  // Expose the nonce to the client for inline script tags
  response.headers.set('x-nonce', nonce);
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  if (isProd) {
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }

  return response;
}

export const config = { matcher: '/((?!_next/static|_next/image|favicon.ico).*)' };
