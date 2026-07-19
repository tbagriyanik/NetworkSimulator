import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockRedis = vi.hoisted(() => {
  process.env.KV_REST_API_URL = 'mock-url';
  process.env.KV_REST_API_TOKEN = 'mock-token';
  return {
    get: vi.fn(),
    set: vi.fn(),
    hget: vi.fn(),
    hset: vi.fn(),
    hgetall: vi.fn(),
    expire: vi.fn(),
    exists: vi.fn(),
    keys: vi.fn(),
    scan: vi.fn(),
  };
});

vi.mock('@upstash/redis', () => ({
  Redis: vi.fn().mockImplementation(function() {
    return mockRedis;
  }),
}));

const ROOM_TTL = 60 * 60 * 4;

describe('roomStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  describe('createRoom', () => {
    it('should create a new room when it does not exist', async () => {
      mockRedis.get.mockResolvedValue(null);
      mockRedis.set.mockResolvedValue('OK');

      const { createRoom } = await import('@/lib/roomStore');
      const result = await createRoom('ABC123', 'teacher-1');

      expect(mockRedis.get).toHaveBeenCalledWith('room:ABC123:meta');
      expect(mockRedis.set).toHaveBeenCalledWith(
        'room:ABC123:meta',
        { code: 'ABC123', createdAt: expect.any(Number), teacherId: 'teacher-1' },
        { ex: ROOM_TTL }
      );
      expect(result).toEqual({
        code: 'ABC123',
        createdAt: expect.any(Number),
        teacherId: 'teacher-1',
        students: {},
      });
    });

    it('should return existing room data when room already exists', async () => {
      const existingMeta = { code: 'ABC123', createdAt: 1000, teacherId: 'teacher-2' };
      mockRedis.get.mockResolvedValue(existingMeta);

      const { createRoom } = await import('@/lib/roomStore');
      const result = await createRoom('ABC123', 'teacher-1');

      expect(mockRedis.set).not.toHaveBeenCalled();
      expect(result).toEqual({
        code: 'ABC123',
        createdAt: 1000,
        teacherId: 'teacher-2',
        students: {},
      });
    });
  });

  describe('getRoomMeta', () => {
    it('should return room meta when room exists', async () => {
      const meta = { code: 'ABC123', createdAt: 1000, teacherId: 'teacher-1' };
      mockRedis.get.mockResolvedValue(meta);

      const { getRoomMeta } = await import('@/lib/roomStore');
      const result = await getRoomMeta('ABC123');

      expect(mockRedis.get).toHaveBeenCalledWith('room:ABC123:meta');
      expect(result).toEqual(meta);
    });

    it('should return null when room does not exist', async () => {
      mockRedis.get.mockResolvedValue(null);

      const { getRoomMeta } = await import('@/lib/roomStore');
      const result = await getRoomMeta('NONEXISTENT');

      expect(result).toBeNull();
    });
  });

  describe('claimRoom', () => {
    it('should claim a room if it exists and has no teacherId', async () => {
      mockRedis.get.mockResolvedValue({ code: 'ABC123', createdAt: 1000, teacherId: null });
      mockRedis.set.mockResolvedValue('OK');

      const { claimRoom } = await import('@/lib/roomStore');
      const result = await claimRoom('ABC123', 'teacher-1');

      expect(mockRedis.set).toHaveBeenCalledWith(
        'room:ABC123:meta',
        { code: 'ABC123', createdAt: 1000, teacherId: 'teacher-1' },
        { ex: ROOM_TTL }
      );
      expect(result).toBe(true);
    });

    it('should return true if requesting teacher matches existing teacher', async () => {
      mockRedis.get.mockResolvedValue({ code: 'ABC123', createdAt: 1000, teacherId: 'teacher-1' });

      const { claimRoom } = await import('@/lib/roomStore');
      const result = await claimRoom('ABC123', 'teacher-1');

      expect(result).toBe(true);
    });

    it('should return false if room does not exist', async () => {
      mockRedis.get.mockResolvedValue(null);

      const { claimRoom } = await import('@/lib/roomStore');
      const result = await claimRoom('NONEXISTENT', 'teacher-1');

      expect(result).toBe(false);
    });

    it('should return false if room is claimed by a different teacher', async () => {
      mockRedis.get.mockResolvedValue({ code: 'ABC123', createdAt: 1000, teacherId: 'teacher-2' });

      const { claimRoom } = await import('@/lib/roomStore');
      const result = await claimRoom('ABC123', 'teacher-1');

      expect(result).toBe(false);
    });
  });

  describe('updateStudent', () => {
    it('should update existing student data', async () => {
      const existingStudent = {
        studentId: 'student-1',
        displayName: 'Ali',
        currentTask: 'task-1',
        completedTasks: 2,
        totalTasks: 5,
        joinedAt: 1000,
        lastSeen: 1000,
      };
      mockRedis.get.mockResolvedValue({ code: 'ABC123', createdAt: 1000, teacherId: 'teacher-1' });
      mockRedis.hget.mockResolvedValue(existingStudent);
      mockRedis.hset.mockResolvedValue(1);
      mockRedis.expire.mockResolvedValue(true);

      const { updateStudent } = await import('@/lib/roomStore');
      const result = await updateStudent('ABC123', 'student-1', {
        currentTask: 'task-2',
        completedTasks: 3,
      });

      expect(mockRedis.hget).toHaveBeenCalledWith('room:ABC123:students', 'student-1');
      expect(result?.currentTask).toBe('task-2');
      expect(result?.completedTasks).toBe(3);
      expect(result?.lastSeen).toBeGreaterThan(1000);
    });

    it('should create new student entry if none exists', async () => {
      mockRedis.get.mockResolvedValue({ code: 'ABC123', createdAt: 1000, teacherId: 'teacher-1' });
      mockRedis.hget.mockResolvedValue(null);
      mockRedis.hset.mockResolvedValue(1);
      mockRedis.expire.mockResolvedValue(true);

      const { updateStudent } = await import('@/lib/roomStore');
      const result = await updateStudent('ABC123', 'student-2', {
        displayName: 'Veli',
        currentTask: 'task-1',
        completedTasks: 0,
        totalTasks: 10,
      });

      expect(result?.studentId).toBe('student-2');
      expect(result?.displayName).toBe('Veli');
      expect(result?.totalTasks).toBe(10);
    });

    it('should return null if room does not exist', async () => {
      mockRedis.get.mockResolvedValue(null);

      const { updateStudent } = await import('@/lib/roomStore');
      const result = await updateStudent('NONEXISTENT', 'student-1', {});

      expect(result).toBeNull();
    });

    it('should refresh TTL for both meta and students keys', async () => {
      mockRedis.get.mockResolvedValue({ code: 'ABC123', createdAt: 1000, teacherId: 'teacher-1' });
      mockRedis.hget.mockResolvedValue(null);
      mockRedis.hset.mockResolvedValue(1);
      mockRedis.expire.mockResolvedValue(true);

      const { updateStudent } = await import('@/lib/roomStore');
      await updateStudent('ABC123', 'student-1', { displayName: 'Test' });

      expect(mockRedis.expire).toHaveBeenCalledWith('room:ABC123:meta', ROOM_TTL);
      expect(mockRedis.expire).toHaveBeenCalledWith('room:ABC123:students', ROOM_TTL);
    });
  });

  describe('getRoomStudents', () => {
    it('should return list of students from hash', async () => {
      const students = {
        'student-1': { studentId: 'student-1', displayName: 'Ali', currentTask: 'task-1', completedTasks: 2, totalTasks: 5, joinedAt: 1000, lastSeen: 2000 },
        'student-2': { studentId: 'student-2', displayName: 'Veli', currentTask: 'task-2', completedTasks: 1, totalTasks: 5, joinedAt: 1500, lastSeen: 2500 },
      };
      mockRedis.hgetall.mockResolvedValue(students);

      const { getRoomStudents } = await import('@/lib/roomStore');
      const result = await getRoomStudents('ABC123');

      expect(mockRedis.hgetall).toHaveBeenCalledWith('room:ABC123:students');
      expect(result).toHaveLength(2);
    });

    it('should return empty array when no students exist', async () => {
      mockRedis.hgetall.mockResolvedValue(null);

      const { getRoomStudents } = await import('@/lib/roomStore');
      const result = await getRoomStudents('ABC123');

      expect(result).toEqual([]);
    });
  });

  describe('checkRoomExists', () => {
    it('should return true if room exists', async () => {
      mockRedis.exists.mockResolvedValue(1);

      const { checkRoomExists } = await import('@/lib/roomStore');
      const result = await checkRoomExists('ABC123');

      expect(mockRedis.exists).toHaveBeenCalledWith('room:ABC123:meta');
      expect(result).toBe(true);
    });

    it('should return false if room does not exist', async () => {
      mockRedis.exists.mockResolvedValue(0);

      const { checkRoomExists } = await import('@/lib/roomStore');
      const result = await checkRoomExists('NONEXISTENT');

      expect(result).toBe(false);
    });
  });

  describe('getActiveRoomCount', () => {
    it('should return count of rooms matching pattern using scan', async () => {
      mockRedis.scan.mockResolvedValue(['0', ['room:ABC12:meta', 'room:DEF34:meta']]);

      const { getActiveRoomCount } = await import('@/lib/roomStore');
      const result = await getActiveRoomCount();

      expect(mockRedis.scan).toHaveBeenCalledWith(0, { match: 'room:*:meta', count: 100 });
      expect(result).toBe(2);
    });

    it('should return 0 when error occurs', async () => {
      mockRedis.scan.mockRejectedValue(new Error('Redis error'));

      const { getActiveRoomCount } = await import('@/lib/roomStore');
      const result = await getActiveRoomCount();

      expect(result).toBe(0);
    });
  });

  describe('Certificate actions', () => {
    it('should save certificate record correctly in redis', async () => {
      mockRedis.set.mockResolvedValue('OK');
      const record = {
        verifyCode: 'XYZ123',
        studentName: 'Ali',
        projectTitle: 'Network Lab',
        score: 10,
        totalScore: 10,
        date: '2023-10-10',
        language: 'tr' as const,
        issuedAt: 1234567,
      };

      const { saveCertificate } = await import('@/lib/roomStore');
      await saveCertificate(record);

      expect(mockRedis.set).toHaveBeenCalledWith(
        'cert:XYZ123',
        record,
        { ex: 60 * 60 * 24 * 365 }
      );
    });

    it('should get certificate record correctly and uppercase the code', async () => {
      const record = {
        verifyCode: 'XYZ123',
        studentName: 'Ali',
        projectTitle: 'Network Lab',
        score: 10,
        totalScore: 10,
        date: '2023-10-10',
        language: 'tr' as const,
        issuedAt: 1234567,
      };
      mockRedis.get.mockResolvedValue(record);

      const { getCertificate } = await import('@/lib/roomStore');
      const result = await getCertificate('xyz123');

      expect(mockRedis.get).toHaveBeenCalledWith('cert:XYZ123');
      expect(result).toEqual(record);
    });
  });
});
