import { logger } from '@/lib/logger';
import { isRateLimited } from '@/lib/security/rateLimiter';
import { NextRequest, NextResponse } from 'next/server';

interface ContactFormData {
  name: string;
  email: string;
  type: string;
  message: string;
  timestamp: string;
  userAgent: string;
}

interface ApiResponse {
  success: boolean;
  message?: string;
  error?: string;
  code?: string;
}

/**
 * Validate contact form data
 */
function validateContactData(data: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!data.name || typeof data.name !== 'string' || data.name.trim().length === 0) {
    errors.push('Name is required');
  }

  if (!data.email || typeof data.email !== 'string') {
    errors.push('Email is required');
  } else {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.email)) {
      errors.push('Invalid email format');
    }
  }

  if (!data.message || typeof data.message !== 'string' || data.message.trim().length === 0) {
    errors.push('Message is required');
  }

  if (data.message && data.message.length > 5000) {
    errors.push('Message must be less than 5000 characters');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * POST /api/contact
 * Handle contact form submissions
 */
export async function POST(req: NextRequest): Promise<NextResponse<ApiResponse>> {
  try {
    // Rate limiting: 5 submissions per hour per IP
    const ip = req.ip || req.headers.get('x-forwarded-for') || 'unknown';
    const { allowed, remaining, resetTime } = isRateLimited(
      `contact_${ip}`,
      5,
      60 * 60 * 1000
    );

    if (!allowed) {
      return NextResponse.json(
        {
          success: false,
          error: 'Too many requests. Please try again later.',
          code: 'RATE_LIMIT_EXCEEDED',
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': '5',
            'X-RateLimit-Remaining': String(remaining),
            'X-RateLimit-Reset': String(Math.ceil(resetTime / 1000)),
          },
        }
      );
    }

    // Parse request body
    let body: any;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid JSON in request body',
          code: 'INVALID_JSON',
        },
        { status: 400 }
      );
    }

    // Validate contact data
    const { valid, errors } = validateContactData(body);
    if (!valid) {
      return NextResponse.json(
        {
          success: false,
          error: errors.join('; '),
          code: 'VALIDATION_ERROR',
        },
        { status: 400 }
      );
    }

    const { name, email, type, message, timestamp, userAgent } = body as ContactFormData;

    // Get submission endpoint from environment
    const CONTACT_SUBMISSION_URL = process.env.GOOGLE_SHEETS_CONTACT_URL;

    if (!CONTACT_SUBMISSION_URL) {
      // Log to console for local development
      logger.debug('📧 Contact Form Submission (Local):', {
        name,
        email,
        type,
        message,
        timestamp,
        userAgent,
      });

      return NextResponse.json(
        {
          success: true,
          message: 'Message received (logged locally)',
        },
        { status: 200 }
      );
    }

    // Send to external endpoint (Google Sheets, etc.)
    try {
      const response = await fetch(CONTACT_SUBMISSION_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          type,
          message,
          timestamp,
          userAgent,
        }),
        redirect: 'follow',
        signal: AbortSignal.timeout(10000), // 10 second timeout
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error('❌ External Submission Error:', {
          status: response.status,
          statusText: response.statusText,
          body: errorText,
        });

        return NextResponse.json(
          {
            success: false,
            error: 'Failed to submit form. Please try again later.',
            code: 'SUBMISSION_FAILED',
          },
          { status: 500 }
        );
      }

      logger.debug('✅ Contact Form Submitted:', { email, type });

      return NextResponse.json(
        {
          success: true,
          message: 'Thank you for your message. We will get back to you soon.',
        },
        { status: 200 }
      );
    } catch (fetchError) {
      logger.error('❌ Network Error:', fetchError);

      return NextResponse.json(
        {
          success: false,
          error: 'Network error. Please try again later.',
          code: 'NETWORK_ERROR',
        },
        { status: 503 }
      );
    }
  } catch (error) {
    logger.error('❌ Unexpected Error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'An unexpected error occurred',
        code: 'INTERNAL_ERROR',
      },
      { status: 500 }
    );
  }
}
