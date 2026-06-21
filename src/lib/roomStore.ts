import { Redis } from '@upstash/redis';
import type { RoomData, StudentProgress } from './roomTypes';

const redisUrl = process.env.KV_REST_API_URL;
const redisToken = process.env.KV_REST_API_TOKEN;
const redis = (redisUrl && redisToken) ? new Redis({ url: redisUrl, token: redisToken }) : null;

const ROOM_TTL = 60 * 60 * 4;

export async function createRoom(code: string): Promise<RoomData> {
  if (!redis) throw new Error('Redis not initialized');
  const metaKey = `room:${code}:meta`;
  const existing = await redis.get<{ code: string; createdAt: number }>(metaKey);

  if (!existing) {
    await redis.set(metaKey, { code, createdAt: Date.now() }, { ex: ROOM_TTL });
  }

  return {
    code,
    createdAt: existing?.createdAt ?? Date.now(),
    students: {},
  };
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
