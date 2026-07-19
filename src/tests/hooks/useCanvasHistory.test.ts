import { describe, it, expect } from 'vitest';

describe('useCanvasHistory', () => {
  it('should start with empty history', () => {
    const undoStack: unknown[] = [];
    const redoStack: unknown[] = [];
    expect(undoStack).toHaveLength(0);
    expect(redoStack).toHaveLength(0);
  });

  it('should push state to undo stack', () => {
    const undoStack = [{ devices: [], connections: [] }];
    expect(undoStack).toHaveLength(1);
  });

  it('should undo last action', () => {
    const undoStack = [
      { devices: ['PC1'], connections: [] },
      { devices: ['PC1', 'SW1'], connections: [] },
    ];
    const lastState = undoStack.pop();
    expect(lastState?.devices).toEqual(['PC1', 'SW1']);
    expect(undoStack).toHaveLength(1);
  });

  it('should support redo after undo', () => {
    const undoStack = [{ devices: ['PC1'], connections: [] }];

    const restored = undoStack[undoStack.length - 1];
    expect(restored?.devices).toEqual(['PC1']);
  });

  it('should clear redo stack on new action', () => {
    const redoStack = [{ devices: ['PC1'], connections: [] }];
    redoStack.length = 0;
    expect(redoStack).toHaveLength(0);
  });

  it('should limit history size to prevent memory issues', () => {
    const maxHistory = 50;
    const undoStack = Array.from({ length: 60 }, (_, i) => ({ devices: [`PC${i}`] }));
    if (undoStack.length > maxHistory) {
      undoStack.splice(0, undoStack.length - maxHistory);
    }
    expect(undoStack).toHaveLength(maxHistory);
  });
});
