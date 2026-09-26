'use client';

import { useState, useEffect, useCallback } from 'react';
import type { StudentProgress } from '@/lib/roomTypes';
import { generateSecureId } from '@/lib/security/sanitizer';
import {
  safeGetItem,
  safeSetItem,
  safeGetSessionItem,
  safeSetSessionItem,
  safeRemoveSessionItem,
} from '@/lib/storage/safeStorage';

export function useRoomStudents(roomCode: string | null) {
  const [students, setStudents] = useState<StudentProgress[]>([]);
  const [error, setError] = useState<string | null>(null);

  const getTeacherId = (): string => {
    const stored = safeGetItem('teacher-browser-id');
    if (stored) return stored;
    const id = generateSecureId();
    safeSetItem('teacher-browser-id', id);
    return id;
  };

  const fetchStudents = useCallback(async () => {
    if (!roomCode) return;
    const currentRoomCode = roomCode;
    const teacherId = getTeacherId();
    try {
      let sessionToken = safeGetSessionItem(`room-session-token-${currentRoomCode}`);
      if (!sessionToken) {
        const tokenRes = await fetch(`/api/room/${currentRoomCode}/session`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: teacherId, role: 'teacher' }),
        });
        if (tokenRes.ok) {
          const tokenJson = await tokenRes.json();
          const token = tokenJson.data?.sessionToken;
          if (tokenJson.success && typeof token === 'string') {
            sessionToken = token;
            safeSetSessionItem(`room-session-token-${currentRoomCode}`, token);
          }
        }
      }
      const headers: Record<string, string> = {};
      if (sessionToken) {
        headers['x-room-session-token'] = sessionToken;
      }
      const res = await fetch(`/api/room/${currentRoomCode}/students?teacherId=${encodeURIComponent(teacherId)}`, { headers });
      if (res.status === 403 || res.status === 401) {
        safeRemoveSessionItem(`room-session-token-${currentRoomCode}`);
        setStudents([]);
        setError('unauthorized');
        return;
      }
      if (res.status === 404) {
        setStudents([]);
        return;
      }
      if (!res.ok) return;
      const json = await res.json();
      if (json.success) setStudents(json.data);
    } catch {
      setError('connection_error');
    }
  }, [roomCode]);

  useEffect(() => {
    const initId = setTimeout(() => fetchStudents(), 0);
    const intervalId = setInterval(() => fetchStudents(), 4000);
    return () => {
      clearTimeout(initId);
      clearInterval(intervalId);
    };
  }, [fetchStudents]);

  return { students, error, refresh: fetchStudents };
}
