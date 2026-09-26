'use client';

import { useEffect, useRef } from 'react';
import { generateSecureId } from '@/lib/security/sanitizer';
import { csrfHeaders } from '@/lib/security/csrf';
import { safeGetItem, safeSetItem, safeGetSessionItem, safeSetSessionItem, safeRemoveSessionItem } from '@/lib/storage/safeStorage';

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
    const currentRoomCode = roomCode;

    if (!studentIdRef.current) {
      const stored = safeGetItem('room-student-id');
      if (stored) {
        studentIdRef.current = stored;
      } else {
        studentIdRef.current = generateSecureId();
        safeSetItem('room-student-id', studentIdRef.current);
      }
    }

    const payload = JSON.stringify({ currentTask, completedTasks, totalTasks, projectFile, durationMinutes });
    if (payload === lastPayloadRef.current) return;
    lastPayloadRef.current = payload;

    const timeoutId = setTimeout(async () => {
      try {
        let sessionToken = safeGetSessionItem(`room-session-token-${currentRoomCode}`);
        if (!sessionToken) {
          const tokenRes = await fetch(`/api/room/${currentRoomCode}/session`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...csrfHeaders() },
            body: JSON.stringify({ userId: studentIdRef.current, role: 'student' }),
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

        const res = await fetch(`/api/room/${currentRoomCode}/student/${studentIdRef.current}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            ...(sessionToken ? { 'x-room-session-token': sessionToken } : {}),
            ...csrfHeaders(),
          },
          body: JSON.stringify({ displayName, currentTask, completedTasks, totalTasks, projectFile, durationMinutes }),
        });
        if (res.status === 404 || res.status === 401) {
          lastPayloadRef.current = '';
          if (res.status === 401) {
            safeRemoveSessionItem(`room-session-token-${currentRoomCode}`);
          }
        }
      } catch {
        lastPayloadRef.current = '';
      }
    }, 5000);

    return () => clearTimeout(timeoutId);
  }, [roomCode, displayName, currentTask, completedTasks, totalTasks, projectFile, durationMinutes]);
}
