import { NextRequest, NextResponse } from 'next/server';
import { createRoom } from '@/lib/roomStore';
import type { RoomApiResponse, RoomData } from '@/lib/roomTypes';
import { isRateLimited } from '@/lib/security/rateLimiter';

export async function POST(req: NextRequest): Promise<NextResponse<RoomApiResponse<RoomData>>> {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'unknown';
    const { allowed } = isRateLimited(`room_create_${ip}`, 5, 60 * 60 * 1000); // 5 rooms per hour

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
    const body = await req.json();
    const { code } = body;

    if (!code || typeof code !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Room code is required', code: 'MISSING_CODE' },
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

    const room = await createRoom(trimmed);
    return NextResponse.json({ success: true, data: room }, { status: 200 });
  } catch {
    return NextResponse.json(
      { success: false, error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 },
    );
  }
}
