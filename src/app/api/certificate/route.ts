import { NextRequest, NextResponse } from 'next/server';
import { saveCertificate, getRoomStudents } from '@/lib/roomStore';
import type { RoomApiResponse } from '@/lib/roomTypes';
import { isRateLimited } from '@/lib/security/rateLimiter';
import { sanitizeInput } from '@/lib/security/sanitizer';
import crypto from 'crypto';
import { logger } from '@/lib/logger';
import { withErrorHandling } from '@/lib/api/withErrorHandling';

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

export const POST = withErrorHandling(async (
  req: NextRequest,
): Promise<NextResponse<RoomApiResponse<{ verifyCode: string }>>> => {
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

  const numScore = Number(score);
  const numTotalScore = Number(totalScore);

  if (isNaN(numScore) || isNaN(numTotalScore) || !isFinite(numScore) || !isFinite(numTotalScore)) {
    return NextResponse.json(
      { success: false, error: 'Scores must be valid numbers', code: 'INVALID_SCORE' },
      { status: 400 },
    );
  }

  if (numScore < 0 || numTotalScore <= 0 || numScore > numTotalScore) {
    return NextResponse.json(
      { success: false, error: 'Invalid score boundaries', code: 'INVALID_SCORE_RANGE' },
      { status: 400 },
    );
  }

  if (String(studentName).length > 200 || String(projectTitle).length > 300) {
    return NextResponse.json(
      { success: false, error: 'Input fields exceed maximum allowed length', code: 'INPUT_TOO_LONG' },
      { status: 400 },
    );
  }

  // --- Server-side Score Validation ---
  if (roomCode && studentId) {
    const upperRoomCode = String(roomCode).toUpperCase().trim();
    const cleanStudentId = String(studentId).trim();

    if (upperRoomCode.length < 4 || upperRoomCode.length > 10 || cleanStudentId.length < 8 || cleanStudentId.length > 100) {
      return NextResponse.json(
        { success: false, error: 'Invalid room code or student ID format', code: 'INVALID_METADATA' },
        { status: 400 },
      );
    }

    if (!/^[A-Z0-9]+$/.test(upperRoomCode) || !/^[a-zA-Z0-9-]+$/.test(cleanStudentId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid characters in room code or student ID', code: 'INVALID_METADATA_FORMAT' },
        { status: 400 },
      );
    }

    try {
      const students = await getRoomStudents(upperRoomCode);
      const student = students.find(s => s.studentId === cleanStudentId);

      if (student) {
        const serverProgressRatio = student.totalTasks > 0 ? student.completedTasks / student.totalTasks : 0;
        const claimedRatio = numTotalScore > 0 ? numScore / numTotalScore : 0;

        // Allow up to 2% tolerance for float rounding in exam scoring
        if (claimedRatio - serverProgressRatio > 0.02) {
          logger.warn(`Certificate validation failed for ${studentName} in room ${upperRoomCode}. Claimed: ${claimedRatio}, Server: ${serverProgressRatio}`);
          return NextResponse.json(
            { success: false, error: 'Score validation failed', code: 'INVALID_SCORE' },
            { status: 400 },
          );
        }
      }
    } catch (err) {
      logger.error('Room validation error:', err);
    }
  }

  const verifyCode = generateVerifyCode();

  await saveCertificate({
    verifyCode,
    studentName: sanitizeInput(String(studentName)).slice(0, 100),
    projectTitle: sanitizeInput(String(projectTitle)).slice(0, 200),
    score: Number(score),
    totalScore: Number(totalScore),
    date: sanitizeInput(String(date)).slice(0, 30),
    language: language === 'tr' ? 'tr' : 'en',
    issuedAt: Date.now(),
  });

  return NextResponse.json({ success: true, data: { verifyCode } }, { status: 200 });
});
