import { NextResponse } from 'next/server';
import crypto from 'crypto';

/**
 * Middleware that generates a per‑request CSP nonce and injects a strict
 * Content‑Security‑Policy header. The nonce is automatically applied to
 * Next.js' inline scripts, allowing them to execute without `unsafe-inline`.
 */
export function middleware(request: Request) {
  const nonce = crypto.randomBytes(16).toString('base64');

  const csp = [
    "default-src 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    `script-src 'self' blob: 'nonce-${nonce}'`,
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
    `script-src 'self' blob: 'nonce-${nonce}'`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    "connect-src 'self' ws: wss: https:",
    "worker-src 'self' blob:",
    "manifest-src 'self'",
  ].join('; ');
  const cspReportOnly = isProd
    ? `${cspReportOnlyBase}; require-trusted-types-for 'script'; trusted-types default`
    : cspReportOnlyBase;

  const response = NextResponse.next();
  response.headers.set('Content-Security-Policy', csp);
  response.headers.set('Content-Security-Policy-Report-Only', cspReportOnly);
  return response;
}

export const config = {
  matcher: '/:path*',
};
