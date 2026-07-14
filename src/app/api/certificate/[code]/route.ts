import { NextRequest, NextResponse } from 'next/server';
import { getCertificate, isIpLockedOut, incrementVerifyFail, resetVerifyFail } from '@/lib/roomStore';
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

  // 1. IP Lockout Check on Verification Failures
  const isLocked = await isIpLockedOut(ip);
  if (isLocked) {
    return NextResponse.json(
      { success: false, error: 'Too many verification failures. Locked out for 30 minutes.', code: 'LOCKED_OUT' },
      { status: 403 },
    );
  }

  // 2. Reduced Rate Limit: 50 verifications per hour
  const { allowed } = await isRateLimited(`cert_verify_${ip}`, 50, 60 * 60 * 1000);

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
    // 3. Track failed verification attempt
    await incrementVerifyFail(ip);
    return NextResponse.json(
      { success: false, error: 'Certificate not found', code: 'NOT_FOUND' },
      { status: 404 },
    );
  }

  // 4. Success: reset failure count
  await resetVerifyFail(ip);
  return NextResponse.json({ success: true, data: record }, { status: 200 });
});
