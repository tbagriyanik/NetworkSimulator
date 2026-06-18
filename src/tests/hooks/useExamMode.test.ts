import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useExamMode } from '@/hooks/useExamMode';
import { ExamProject } from '@/lib/network/examMode';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value.toString(); },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; }
  };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

describe('useExamMode - moveTask', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should reorder tasks correctly', () => {
    const { result } = renderHook(() => useExamMode());

    const mockExam: ExamProject = {
      id: 'test-exam',
      tag: 'TEST',
      title: 'Test Exam',
      description: 'Test Description',
      level: 'basic',
      isExam: true,
      tasks: [
        { id: 'task-1', title: { tr: 'T1', en: 'T1' }, description: { tr: 'D1', en: 'D1' }, weight: 50, checkType: 'command', completed: false },
        { id: 'task-2', title: { tr: 'T2', en: 'T2' }, description: { tr: 'D2', en: 'D2' }, weight: 50, checkType: 'command', completed: false }
      ],
      durationMinutes: 10,
      difficulty: 'beginner',
      data: {} as unknown as ExamProject['data']
    };

    act(() => {
      result.current.startExam(mockExam);
    });

    expect(result.current.activeExam?.tasks[0].id).toBe('task-1');

    // Move task-1 down
    act(() => {
      result.current.moveTask('task-1', 'down');
    });

    expect(result.current.activeExam?.tasks[0].id).toBe('task-2');
    expect(result.current.activeExam?.tasks[1].id).toBe('task-1');

    // Move task-1 back up
    act(() => {
      result.current.moveTask('task-1', 'up');
    });

    expect(result.current.activeExam?.tasks[0].id).toBe('task-1');
    expect(result.current.activeExam?.tasks[1].id).toBe('task-2');
  });
});
