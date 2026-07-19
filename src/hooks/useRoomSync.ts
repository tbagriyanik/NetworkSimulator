'use client';

import { useEffect, useRef } from 'react';
import { generateSecureId } from '@/lib/security/sanitizer';

interface UseRoomSyncOptions {
  roomCode: string | null;
  displayName: string;
  currentTask: string;
  completedTasks: number;
  totalTasks: number;
  projectFile?: string;
  durationMinutes?: number;
}

export function useRoomSync({
  roomCode,
  displayName,
  currentTask,
  completedTasks,
  totalTasks,
  projectFile,
  durationMinutes,
}: UseRoomSyncOptions) {
  const studentIdRef = useRef<string>('');
  const lastPayloadRef = useRef<string>('');

  useEffect(() => {
    if (!roomCode) return;

    if (!studentIdRef.current) {
      const stored = localStorage.getItem('room-student-id');
      if (stored) {
        studentIdRef.current = stored;
      } else {
        studentIdRef.current = generateSecureId();
        localStorage.setItem('room-student-id', studentIdRef.current);
      }
    }

    const payload = JSON.stringify({ currentTask, completedTasks, totalTasks, projectFile, durationMinutes });
    if (payload === lastPayloadRef.current) return;
    lastPayloadRef.current = payload;

    const timeoutId = setTimeout(async () => {
      try {
        const res = await fetch(`/api/room/${roomCode}/student/${studentIdRef.current}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ displayName, currentTask, completedTasks, totalTasks, projectFile, durationMinutes }),
        });
        if (res.status === 404) {
          lastPayloadRef.current = '';
        }
      } catch {
        lastPayloadRef.current = '';
      }
    }, 5000);

    return () => clearTimeout(timeoutId);
  }, [roomCode, displayName, currentTask, completedTasks, totalTasks, projectFile, durationMinutes]);
}
