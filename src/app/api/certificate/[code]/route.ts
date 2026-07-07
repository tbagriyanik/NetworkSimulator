import { NextRequest, NextResponse } from 'next/server';
import { getCertificate } from '@/lib/roomStore';
import type { RoomApiResponse, CertificateRecord } from '@/lib/roomTypes';

export const dynamic = 'force-dynamic';

interface RouteParams {
  code: string;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<RouteParams> },
): Promise<NextResponse<RoomApiResponse<CertificateRecord>>> {
  try {
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
  } catch {
    return NextResponse.json(
      { success: false, error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 },
    );
  }
}
