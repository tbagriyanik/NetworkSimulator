import { NextRequest, NextResponse } from 'next/server';
import { getRoomStudents, getRoomMeta, claimRoom } from '@/lib/roomStore';
import type { RoomApiResponse, StudentProgress } from '@/lib/roomTypes';
import { isRateLimited } from '@/lib/security/rateLimiter';
import { sanitizeInput } from '@/lib/security/sanitizer';
import { withErrorHandling } from '@/lib/api/withErrorHandling';

interface RouteParams {
  code: string;
}

export const GET = withErrorHandling(async (
  req: NextRequest,
  { params }: { params: Promise<RouteParams> },
): Promise<NextResponse<RoomApiResponse<StudentProgress[]>>> => {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'unknown';
  const { allowed } = await isRateLimited(`room_view_${ip}`, 100, 60 * 1000); // 100 requests per minute

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

  if (code.length > 20) {
    return NextResponse.json(
      { success: false, error: 'Invalid room code', code: 'INVALID_CODE' },
      { status: 400 },
    );
  }

  const url = new URL(req.url);
  const rawTeacherId = url.searchParams.get('teacherId');
  const teacherId = rawTeacherId ? sanitizeInput(rawTeacherId) : null;
  if (teacherId && teacherId.length > 100) {
    return NextResponse.json(
      { success: false, error: 'Invalid teacher ID', code: 'INVALID_TEACHER_ID' },
      { status: 400 },
    );
  }

  if (!teacherId) {
    return NextResponse.json(
      { success: false, error: 'Teacher ID is required', code: 'MISSING_TEACHER_ID' },
      { status: 401 },
    );
  }

  const upperCode = code.toUpperCase();
  const meta = await getRoomMeta(upperCode);
  if (!meta) {
    return NextResponse.json(
      { success: false, error: 'Room not found', code: 'ROOM_NOT_FOUND' },
      { status: 404 },
    );
  }

  // Backward compatibility: if room has no teacherId, claim it for this browser
  if (!meta.teacherId) {
    await claimRoom(upperCode, teacherId);
  } else if (meta.teacherId !== teacherId) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized to view this room', code: 'UNAUTHORIZED' },
      { status: 403 },
    );
  }

  const students = await getRoomStudents(code.toUpperCase());
  return NextResponse.json({ success: true, data: students }, { status: 200 });
});
