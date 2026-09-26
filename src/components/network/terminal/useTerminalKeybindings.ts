'use client';

import { KeyboardEvent, RefObject } from 'react';

export interface UseTerminalKeybindingsOptions {
  input: string;
  setInput: (val: string) => void;
  inputRef: RefObject<HTMLInputElement | HTMLTextAreaElement | null>;
  onUndo?: () => void;
  onRedo?: () => void;
  queueCommands?: (cmds: string[]) => void;
  processCommandQueue?: () => Promise<void>;
}

export function handleTerminalShortcuts(
  e: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>,
  options: UseTerminalKeybindingsOptions
): boolean {
  const { input, setInput, inputRef, onUndo, onRedo, queueCommands, processCommandQueue } = options;
  const isCtrlOrMeta = e.ctrlKey || e.metaKey;

  if (!isCtrlOrMeta) return false;

  const key = e.key.toLowerCase();

  if (key === 'z') {
    e.preventDefault();
    onUndo?.();
    return true;
  }

  if (key === 'y') {
    e.preventDefault();
    onRedo?.();
    return true;
  }

  if (key === 'a') {
    // Ctrl+A moves the cursor to the beginning of the line.
    e.preventDefault();
    if (inputRef.current) {
      inputRef.current.setSelectionRange(0, 0);
    }
    return true;
  }

  if (key === 'e') {
    // Ctrl+E moves the cursor to the end of the line.
    e.preventDefault();
    if (inputRef.current) {
      const len = inputRef.current.value.length;
      inputRef.current.setSelectionRange(len, len);
    }
    return true;
  }

  if (key === 'u') {
    // Ctrl+U deletes from the cursor to the beginning of the line.
    e.preventDefault();
    if (inputRef.current && input) {
      const start = inputRef.current.selectionStart || 0;
      const newInput = input.substring(start);
      setInput(newInput);
      setTimeout(() => {
        if (inputRef.current) inputRef.current.setSelectionRange(0, 0);
      }, 0);
    }
    return true;
  }

  if (key === 'k') {
    // Ctrl+K deletes from the cursor to the end of the line.
    e.preventDefault();
    if (inputRef.current && input) {
      const start = inputRef.current.selectionStart || 0;
      const newInput = input.substring(0, start);
      setInput(newInput);
      setTimeout(() => {
        if (inputRef.current) inputRef.current.setSelectionRange(start, start);
      }, 0);
    }
    return true;
  }

  if (key === 'w') {
    // Ctrl+W deletes the word before the cursor.
    e.preventDefault();
    if (inputRef.current && input) {
      const start = inputRef.current.selectionStart || 0;
      const end = inputRef.current.selectionEnd || 0;
      const before = input.substring(0, start);
      const after = input.substring(end);
      const newBefore = before.replace(/\S+\s*$/, '');
      setInput(newBefore + after);
      setTimeout(() => {
        if (inputRef.current) inputRef.current.setSelectionRange(newBefore.length, newBefore.length);
      }, 0);
    }
    return true;
  }

  if (key === 'x') {
    e.preventDefault();
    if (inputRef.current && input) {
      const start = inputRef.current.selectionStart || 0;
      const end = inputRef.current.selectionEnd || 0;
      if (start !== end) {
        const selectedText = input.substring(start, end);
        void navigator.clipboard?.writeText(selectedText);
        const newInput = input.substring(0, start) + input.substring(end);
        setInput(newInput);
      }
    }
    return true;
  }

  if (key === 'c') {
    e.preventDefault();
    if (inputRef.current && input) {
      const start = inputRef.current.selectionStart || 0;
      const end = inputRef.current.selectionEnd || 0;
      if (start !== end) {
        const selectedText = input.substring(start, end);
        void navigator.clipboard?.writeText(selectedText);
      } else {
        void navigator.clipboard?.writeText(input);
      }
    }
    return true;
  }

  if (key === 'v') {
    e.preventDefault();
    void navigator.clipboard?.readText()?.then((text) => {
      if (text && text.includes('\n') && queueCommands && processCommandQueue) {
        queueCommands(text.split('\n'));
        setInput('');
        void processCommandQueue();
        return;
      }

      if (text) {
        const start = inputRef.current?.selectionStart || 0;
        const end = inputRef.current?.selectionEnd || 0;
        const newInput = input.substring(0, start) + text + input.substring(end);
        setInput(newInput);
        setTimeout(() => {
          if (inputRef.current) {
            inputRef.current.selectionStart = inputRef.current.selectionEnd = start + text.length;
          }
        }, 0);
      }
    });
    return true;
  }

  return false;
}
