import { NextRequest, NextResponse } from 'next/server';
import { checkRoomExists } from '@/lib/roomStore';
import type { RoomApiResponse } from '@/lib/roomTypes';

interface RouteParams {
  code: string;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<RouteParams> },
): Promise<NextResponse<RoomApiResponse<{ exists: boolean }>>> {
  try {
    const { code } = await params;
    if (!code) {
      return NextResponse.json(
        { success: false, error: 'Missing room code', code: 'MISSING_CODE' },
        { status: 400 },
      );
    }

    const exists = await checkRoomExists(code.toUpperCase());
    return NextResponse.json({ success: true, data: { exists } }, { status: 200 });
  } catch {
    return NextResponse.json(
      { success: false, error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 },
    );
  }
}
