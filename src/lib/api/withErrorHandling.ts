import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

type ApiHandler<TContext = unknown> = (
  req: NextRequest,
  context: TContext
) => Promise<NextResponse> | NextResponse;

/**
 * A wrapper for Next.js App Router API routes to consolidate error handling.
 * Catches all unhandled exceptions, logs them using the app logger,
 * and returns a standard 500 JSON response.
 */
export function withErrorHandling<TContext = unknown>(handler: ApiHandler<TContext>): ApiHandler<TContext> {
  return async (req: NextRequest, context: TContext) => {
    try {
      return await handler(req, context);
    } catch (err) {
      logger.error(`API Error in ${req.method} ${req.nextUrl.pathname}:`, err);
      return NextResponse.json(
        { success: false, error: 'Internal server error', code: 'INTERNAL_ERROR' },
        { status: 500 }
      );
    }
  };
}
