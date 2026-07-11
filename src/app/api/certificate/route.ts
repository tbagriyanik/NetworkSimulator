import { NextRequest, NextResponse } from 'next/server';
import { saveCertificate, getRoomStudents } from '@/lib/roomStore';
import type { RoomApiResponse } from '@/lib/roomTypes';
import { isRateLimited } from '@/lib/security/rateLimiter';
import { sanitizeInput } from '@/lib/security/sanitizer';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

function generateVerifyCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  const bytes = crypto.randomBytes(10);
  for (let i = 0; i < 10; i++) {
    code += chars[bytes[i] % chars.length];
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
    const { allowed } = await isRateLimited(`cert_${ip}`, 20, 60 * 60 * 1000); // 20 certs per hour
    if (!allowed) {
      return NextResponse.json(
        { success: false, error: 'Too many certificate requests', code: 'RATE_LIMIT_EXCEEDED' },
        { status: 429 },
      );
    }

    const body = await req.json();
    const { studentName, projectTitle, score, totalScore, date, language, roomCode, studentId } = body;

    if (!studentName || !projectTitle || score == null || totalScore == null || !date) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields', code: 'MISSING_FIELDS' },
        { status: 400 },
      );
    }

    if (Number(score) < 0 || Number(totalScore) <= 0 || Number(score) > Number(totalScore)) {
      return NextResponse.json(
        { success: false, error: 'Invalid score boundaries', code: 'INVALID_SCORE_RANGE' },
        { status: 400 },
      );
    }

    // --- Server-side Score Validation ---
    if (roomCode && studentId) {
      try {
        const students = await getRoomStudents(roomCode);
        const student = students.find(s => s.studentId === studentId);

        if (student) {
          const serverProgressRatio = student.totalTasks > 0 ? student.completedTasks / student.totalTasks : 0;
          const claimedRatio = Number(totalScore) > 0 ? Number(score) / Number(totalScore) : 0;

          // Allow up to 2% tolerance for float rounding in exam scoring
          if (claimedRatio - serverProgressRatio > 0.02) {
            console.warn(`Certificate validation failed for ${studentName} in room ${roomCode}. Claimed: ${claimedRatio}, Server: ${serverProgressRatio}`);
            return NextResponse.json(
              { success: false, error: 'Score validation failed', code: 'INVALID_SCORE' },
              { status: 400 },
            );
          }
        }
      } catch (err) {
        console.error('Room validation error:', err);
      }
    }

    const verifyCode = generateVerifyCode();

    await saveCertificate({
      verifyCode,
      studentName: sanitizeInput(String(studentName)).slice(0, 100),
      projectTitle: sanitizeInput(String(projectTitle)).slice(0, 200),
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
