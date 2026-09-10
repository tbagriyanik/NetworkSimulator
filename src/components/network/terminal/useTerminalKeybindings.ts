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
    e.preventDefault();
    if (inputRef.current) {
      inputRef.current.select();
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
