import { NextRequest, NextResponse } from 'next/server';
import { getCertificate } from '@/lib/roomStore';
import type { RoomApiResponse, CertificateRecord } from '@/lib/roomTypes';
import { isRateLimited } from '@/lib/security/rateLimiter';
import { withErrorHandling } from '@/lib/api/withErrorHandling';

export const dynamic = 'force-dynamic';

interface RouteParams {
  code: string;
}

export const GET = withErrorHandling(async (
  req: NextRequest,
  { params }: { params: Promise<RouteParams> },
): Promise<NextResponse<RoomApiResponse<CertificateRecord>>> => {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'unknown';
  const { allowed } = await isRateLimited(`cert_verify_${ip}`, 600, 60 * 60 * 1000); // 600 verifications per hour

  if (!allowed) {
    return NextResponse.json(
      { success: false, error: 'Too many verification attempts', code: 'RATE_LIMIT_EXCEEDED' },
      { status: 429 },
    );
  }

  const { code } = await params;

  if (!code || code.length > 20) {
    return NextResponse.json(
      { success: false, error: 'Invalid verification code', code: 'INVALID_CODE' },
      { status: 400 },
    );
  }

  const record = await getCertificate(code);

  if (!record) {
    return NextResponse.json(
      { success: false, error: 'Certificate not found', code: 'NOT_FOUND' },
      { status: 404 },
    );
  }

  return NextResponse.json({ success: true, data: record }, { status: 200 });
});
