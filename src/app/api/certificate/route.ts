import { NextRequest, NextResponse } from 'next/server';
import { saveCertificate } from '@/lib/roomStore';
import type { RoomApiResponse } from '@/lib/roomTypes';
import { isRateLimited } from '@/lib/security/rateLimiter';

export const dynamic = 'force-dynamic';

function generateVerifyCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 10; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export async function POST(
  req: NextRequest,
): Promise<NextResponse<RoomApiResponse<{ verifyCode: string }>>> {
  try {
    const ip =
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      req.headers.get('x-real-ip') ||
      'unknown';
    const { allowed } = isRateLimited(`cert_${ip}`, 20, 60 * 60 * 1000); // 20 certs per hour
    if (!allowed) {
      return NextResponse.json(
        { success: false, error: 'Too many certificate requests', code: 'RATE_LIMIT_EXCEEDED' },
        { status: 429 },
      );
    }

    const body = await req.json();
    const { studentName, projectTitle, score, totalScore, date, language } = body;

    if (!studentName || !projectTitle || score == null || totalScore == null || !date) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields', code: 'MISSING_FIELDS' },
        { status: 400 },
      );
    }

    const verifyCode = generateVerifyCode();

    await saveCertificate({
      verifyCode,
      studentName: String(studentName).slice(0, 100),
      projectTitle: String(projectTitle).slice(0, 200),
      score: Number(score),
      totalScore: Number(totalScore),
      date: String(date).slice(0, 30),
      language: language === 'tr' ? 'tr' : 'en',
      issuedAt: Date.now(),
    });

    return NextResponse.json({ success: true, data: { verifyCode } }, { status: 200 });
  } catch {
    return NextResponse.json(
      { success: false, error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 },
    );
  }
}
