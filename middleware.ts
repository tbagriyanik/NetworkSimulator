import { NextRequest, NextResponse } from 'next/server';

/**
 * Middleware that generates a per‑request CSP header.
 * Uses `unsafe-inline` to allow inline scripts in srcdoc iframe content
 * (IoT web panel, router admin page, etc.).
 */
export function middleware(_request: NextRequest) {
  const csp = [
    "default-src 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    `script-src 'self' blob: 'unsafe-inline'`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    "connect-src 'self' ws: wss: https:",
    "worker-src 'self' blob:",
    "manifest-src 'self'",
    "upgrade-insecure-requests",
  ].join('; ');

  const isProd = process.env.NODE_ENV === 'production';
  const cspReportOnlyBase = [
    "default-src 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    `script-src 'self' blob: 'unsafe-inline'`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    "connect-src 'self' ws: wss: https:",
    "worker-src 'self' blob:",
    "manifest-src 'self'",
  ].join('; ');
  const cspReportOnly = isProd
    ? `${cspReportOnlyBase}; require-trusted-types-for 'script'; trusted-types default; report-uri /csp-report`
    : cspReportOnlyBase;

  const response = NextResponse.next();
  response.headers.set('Content-Security-Policy', csp);
  response.headers.set('Content-Security-Policy-Report-Only', cspReportOnly);

  return response;
}

export const config = {   matcher: '/((?!api|_next/static|_next/image|favicon.ico).*)', };
