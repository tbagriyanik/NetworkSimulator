import { NextRequest, NextResponse } from 'next/server';
import { checkRoomExists } from '@/lib/roomStore';
import type { RoomApiResponse } from '@/lib/roomTypes';
import { withErrorHandling } from '@/lib/api/withErrorHandling';

export const dynamic = 'force-dynamic';

interface RouteParams {
  code: string;
}

export const GET = withErrorHandling(async (
  _req: NextRequest,
  { params }: { params: Promise<RouteParams> },
): Promise<NextResponse<RoomApiResponse<{ exists: boolean }>>> => {
  const { code } = await params;
  if (!code) {
    return NextResponse.json(
      { success: false, error: 'Missing room code', code: 'MISSING_CODE' },
      { status: 400 },
    );
  }

  const upperCode = code.toUpperCase().trim();
  if (upperCode.length < 4 || upperCode.length > 10) {
    return NextResponse.json(
      { success: false, error: 'Room code must be 4-10 characters', code: 'INVALID_CODE' },
      { status: 400 },
    );
  }

  const exists = await checkRoomExists(upperCode);
  return NextResponse.json({ success: true, data: { exists } }, { status: 200 });
});
