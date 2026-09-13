'use client';

import { useCallback, useState } from 'react';

type SetInput = (value: string) => void;

export function useTerminalUndoRedo(input: string, setInput: SetInput) {
  const [undoStack, setUndoStack] = useState<string[]>([]);
  const [redoStack, setRedoStack] = useState<string[]>([]);

  const pushUndo = useCallback(() => {
    setUndoStack([...undoStack, input]);
    setRedoStack([]);
  }, [undoStack, input]);

  const handleUndo = useCallback(() => {
    if (undoStack.length > 0) {
      const newUndoStack = [...undoStack];
      const previousInput = newUndoStack.pop() || '';
      setRedoStack([input, ...redoStack]);
      setInput(previousInput);
      setUndoStack(newUndoStack);
    }
  }, [input, undoStack, redoStack, setInput]);

  const handleRedo = useCallback(() => {
    if (redoStack.length > 0) {
      const newRedoStack = [...redoStack];
      const nextInput = newRedoStack.shift() || '';
      setUndoStack([...undoStack, input]);
      setInput(nextInput);
      setRedoStack(newRedoStack);
    }
  }, [input, undoStack, redoStack, setInput]);

  return { undoStack, redoStack, pushUndo, handleUndo, handleRedo };
}