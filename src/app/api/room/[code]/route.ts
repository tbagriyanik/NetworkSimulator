import { NextRequest, NextResponse } from 'next/server';
import { checkRoomExists, deleteRoom } from '@/lib/roomStore';
import type { RoomApiResponse } from '@/lib/roomTypes';
import { sanitizeInput } from '@/lib/security/sanitizer';
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

export const DELETE = withErrorHandling(async (
  req: NextRequest,
  { params }: { params: Promise<RouteParams> },
): Promise<NextResponse<RoomApiResponse<{ deleted: boolean }>>> => {
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

  const url = new URL(req.url);
  const rawTeacherId = url.searchParams.get('teacherId');
  const teacherId = rawTeacherId ? sanitizeInput(rawTeacherId) : null;

  if (!teacherId || teacherId.length < 8 || teacherId.length > 100) {
    return NextResponse.json(
      { success: false, error: 'Valid teacher ID is required (8-100 chars)', code: 'INVALID_TEACHER_ID' },
      { status: 400 },
    );
  }

  const exists = await checkRoomExists(upperCode);
  if (!exists) {
    return NextResponse.json(
      { success: false, error: 'Room not found', code: 'ROOM_NOT_FOUND' },
      { status: 404 },
    );
  }

  const deleted = await deleteRoom(upperCode, teacherId);
  if (!deleted) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized to delete this room', code: 'UNAUTHORIZED' },
      { status: 403 },
    );
  }

  return NextResponse.json({ success: true, data: { deleted: true } }, { status: 200 });
});
