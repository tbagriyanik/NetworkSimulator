'use client';

import { useState, useEffect, useCallback } from 'react';
import type { StudentProgress } from '@/lib/roomTypes';
import { generateSecureId } from '@/lib/security/sanitizer';

export function useRoomStudents(roomCode: string | null) {
  const [students, setStudents] = useState<StudentProgress[]>([]);
  const [error, setError] = useState<string | null>(null);

  const getTeacherId = (): string => {
    const stored = localStorage.getItem('teacher-browser-id');
    if (stored) return stored;
    const id = generateSecureId();
    localStorage.setItem('teacher-browser-id', id);
    return id;
  };

  const fetchStudents = useCallback(async () => {
    if (!roomCode) return;
    const teacherId = getTeacherId();
    try {
      const res = await fetch(`/api/room/${roomCode}/students?teacherId=${encodeURIComponent(teacherId)}`);
      if (res.status === 403 || res.status === 401) {
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
