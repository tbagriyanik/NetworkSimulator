import { Redis } from '@upstash/redis';
import type { RoomData, StudentProgress, RoomMeta, CertificateRecord } from './roomTypes';

const redisUrl = process.env.KV_REST_API_URL;
const redisToken = process.env.KV_REST_API_TOKEN;
const redis = (redisUrl && redisToken) ? new Redis({ url: redisUrl, token: redisToken }) : null;

const ROOM_TTL = 60 * 60 * 4;

export async function createRoom(code: string, teacherId: string): Promise<RoomData> {
  if (!redis) throw new Error('Redis not initialized');
  const metaKey = `room:${code}:meta`;
  const existing = await redis.get<RoomMeta>(metaKey);

  if (!existing) {
    await redis.set(metaKey, { code, createdAt: Date.now(), teacherId }, { ex: ROOM_TTL });
  }

  return {
    code,
    createdAt: existing?.createdAt ?? Date.now(),
    teacherId: existing?.teacherId ?? teacherId,
    students: {},
  };
}

export async function getRoomMeta(code: string): Promise<RoomMeta | null> {
  if (!redis) return null;
  const metaKey = `room:${code}:meta`;
  return redis.get<RoomMeta>(metaKey);
}

export async function claimRoom(code: string, teacherId: string): Promise<boolean> {
  if (!redis) return false;
  const metaKey = `room:${code}:meta`;
  const existing = await redis.get<Record<string, unknown>>(metaKey);
  if (!existing) return false;
  if (existing.teacherId) return existing.teacherId === teacherId;
  await redis.set(metaKey, { ...existing, teacherId }, { ex: ROOM_TTL });
  return true;
}

export async function updateStudent(
  roomCode: string,
  studentId: string,
  data: Partial<StudentProgress>,
): Promise<StudentProgress | null> {
  if (!redis) throw new Error('Redis not initialized');
  const metaKey = `room:${roomCode}:meta`;
  const studentsKey = `room:${roomCode}:students`;

  // Check if room exists
  const meta = await redis.get(metaKey);
  if (!meta) return null;

  // Get existing student data from Hash
  const existing = await redis.hget<StudentProgress>(studentsKey, studentId);

  const updated: StudentProgress = {
    studentId,
    displayName: data.displayName ?? existing?.displayName ?? '',
    currentTask: data.currentTask ?? existing?.currentTask ?? '',
    completedTasks: data.completedTasks ?? existing?.completedTasks ?? 0,
    totalTasks: data.totalTasks ?? existing?.totalTasks ?? 0,
    projectFile: data.projectFile ?? existing?.projectFile,
    durationMinutes: data.durationMinutes ?? existing?.durationMinutes,
    joinedAt: existing?.joinedAt ?? Date.now(),
    lastSeen: Date.now(),
  };

  await redis.hset(studentsKey, { [studentId]: updated });
  // Refresh TTL for both meta and students
  await redis.expire(metaKey, ROOM_TTL);
  await redis.expire(studentsKey, ROOM_TTL);

  return updated;
}

export async function getRoomStudents(roomCode: string): Promise<StudentProgress[]> {
  if (!redis) throw new Error('Redis not initialized');
  const studentsKey = `room:${roomCode}:students`;
  const allStudents = await redis.hgetall<Record<string, StudentProgress>>(studentsKey);
  if (!allStudents) return [];
  return Object.values(allStudents);
}

export async function checkRoomExists(code: string): Promise<boolean> {
  if (!redis) return false;
  const metaKey = `room:${code}:meta`;
  const exists = await redis.exists(metaKey);
  return exists === 1;
}

export async function getActiveRoomCount(): Promise<number> {
  if (!redis) return 0;
  try {
    let cursor = 0;
    const keys: string[] = [];
    do {
      const [nextCursor, newKeys] = await redis.scan(cursor, { match: 'room:*:meta', count: 100 });
      cursor = Number(nextCursor);
      keys.push(...newKeys);
    } while (cursor !== 0);
    return keys.length;
  } catch (e) {
    console.error('Error getting active room count:', e);
    return 0;
  }
}

// ─── Certificate store ────────────────────────────────────────────────────────

const CERT_TTL = 60 * 60 * 24 * 365; // 1 year

export async function saveCertificate(record: CertificateRecord): Promise<void> {
  if (!redis) return;
  const key = `cert:${record.verifyCode}`;
  await redis.set(key, record, { ex: CERT_TTL });
}

export async function getCertificate(verifyCode: string): Promise<CertificateRecord | null> {
  if (!redis) return null;
  const key = `cert:${verifyCode.toUpperCase()}`;
  return redis.get<CertificateRecord>(key);
}
