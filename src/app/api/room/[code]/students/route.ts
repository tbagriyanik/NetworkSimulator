import { NextRequest, NextResponse } from 'next/server';
import { getRoomStudents } from '@/lib/roomStore';
import type { RoomApiResponse, StudentProgress } from '@/lib/roomTypes';
import { isRateLimited } from '@/lib/security/rateLimiter';

interface RouteParams {
  code: string;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<RouteParams> },
): Promise<NextResponse<RoomApiResponse<StudentProgress[]>>> {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'unknown';
    const { allowed } = isRateLimited(`room_view_${ip}`, 100, 60 * 1000); // 100 requests per minute

    if (!allowed) {
      return NextResponse.json(
        { success: false, error: 'Too many requests', code: 'RATE_LIMIT_EXCEEDED' },
        { status: 429 },
      );
    }

    if (process.env.NEXT_PUBLIC_IS_ROOM_ENABLED !== 'true') {
      return NextResponse.json(
        { success: false, error: 'Room system is disabled', code: 'DISABLED' },
        { status: 503 },
      );
    }
    const { code } = await params;

    if (!code) {
      return NextResponse.json(
        { success: false, error: 'Missing room code', code: 'MISSING_CODE' },
        { status: 400 },
      );
    }

    const students = await getRoomStudents(code.toUpperCase());
    return NextResponse.json({ success: true, data: students }, { status: 200 });
  } catch {
    return NextResponse.json(
      { success: false, error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 },
    );
  }
}
