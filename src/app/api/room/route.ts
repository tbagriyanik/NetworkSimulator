import { NextRequest, NextResponse } from 'next/server';
import { createRoom, getActiveRoomCount } from '@/lib/roomStore';
import type { RoomApiResponse, RoomData } from '@/lib/roomTypes';
import { isRateLimited } from '@/lib/security/rateLimiter';
import { sanitizeObject } from '@/lib/security/sanitizer';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest): Promise<NextResponse> {
  try {
    if (process.env.NEXT_PUBLIC_IS_ROOM_ENABLED !== 'true') {
      return NextResponse.json(
        { success: false, error: 'Room system is disabled', code: 'DISABLED' },
        { status: 503 },
      );
    }
    const count = await getActiveRoomCount();
    return NextResponse.json({ success: true, count }, { status: 200 });
  } catch {
    return NextResponse.json(
      { success: false, error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest): Promise<NextResponse<RoomApiResponse<RoomData>>> {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'unknown';
    const { allowed } = await isRateLimited(`room_create_${ip}`, 5, 60 * 60 * 1000); // 5 rooms per hour

    if (!allowed) {
      return NextResponse.json(
        { success: false, error: 'Too many rooms created', code: 'RATE_LIMIT_EXCEEDED' },
        { status: 429 },
      );
    }

    if (process.env.NEXT_PUBLIC_IS_ROOM_ENABLED !== 'true') {
      return NextResponse.json(
        { success: false, error: 'Room system is disabled', code: 'DISABLED' },
        { status: 503 },
      );
    }
    const rawBody = await req.json();
    const body = sanitizeObject(rawBody) as Record<string, unknown>;
    const { code, teacherId } = body;

    if (!code || typeof code !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Room code is required', code: 'MISSING_CODE' },
        { status: 400 },
      );
    }

    if (!teacherId || typeof teacherId !== 'string' || teacherId.length < 8 || teacherId.length > 100) {
      return NextResponse.json(
        { success: false, error: 'Valid teacher ID is required (8-100 chars)', code: 'MISSING_TEACHER_ID' },
        { status: 400 },
      );
    }

    const trimmed = code.trim().toUpperCase();
    if (trimmed.length < 4 || trimmed.length > 10) {
      return NextResponse.json(
        { success: false, error: 'Room code must be 4-10 characters', code: 'INVALID_CODE' },
        { status: 400 },
      );
    }

    const room = await createRoom(trimmed, teacherId);
    return NextResponse.json({ success: true, data: room }, { status: 200 });
  } catch {
    return NextResponse.json(
      { success: false, error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 },
    );
  }
}
