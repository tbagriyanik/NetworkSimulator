'use client';

import React, { useState } from 'react';
import type { CanvasNote } from '../networkTopology.types';

interface NoteEditingProps {
  setNotesState: React.Dispatch<React.SetStateAction<CanvasNote[]>>;
  latestNotesRef: React.MutableRefObject<CanvasNote[]>;
  saveToHistory: () => void;
  noteTextareaRefs: React.RefObject<Record<string, HTMLTextAreaElement | null>>;
}

export function useNoteEditing({
  setNotesState,
  latestNotesRef,
  saveToHistory,
  noteTextareaRefs
}: NoteEditingProps) {
  const [noteClipboard, setNoteClipboard] = useState<string>('');
  const [noteTextSelection, setNoteTextSelection] = useState<{
    noteId: string;
    start: number;
    end: number;
  } | null>(null);

  const getNoteSelection = (noteId: string) => {
    const textarea = noteTextareaRefs.current?.[noteId];
    if (!textarea) return null;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    return {
      start,
      end,
      hasSelection: start !== end,
      selectedText: textarea.value.substring(start, end),
    };
  };

  const updateNoteText = (noteId: string, text: string) => {
    setNotesState((prevNotes) =>
      prevNotes.map((n) => (n.id === noteId ? { ...n, text } : n))
    );
  };

  const updateNoteTextRange = (noteId: string, start: number, end: number, replacement: string) => {
    saveToHistory();
    setNotesState((prevNotes) =>
      prevNotes.map((n) => {
        if (n.id !== noteId) return n;
        const currentText = n.text;
        const newText = currentText.substring(0, start) + replacement + currentText.substring(end);
        return { ...n, text: newText };
      })
    );
  };

  const handleNoteTextCopy = async (noteId: string) => {
    const selection = getNoteSelection(noteId);
    if (!selection?.hasSelection) return;

    setNoteClipboard(selection.selectedText);
    try {
      await navigator.clipboard.writeText(selection.selectedText);
    } catch (_err) {
      // Fallback already handled
    }
  };

  const handleNoteTextCut = async (noteId: string) => {
    const selection = getNoteSelection(noteId);
    if (!selection?.hasSelection) return;

    setNoteClipboard(selection.selectedText);
    try {
      await navigator.clipboard.writeText(selection.selectedText);
    } catch (_err) {
      // Fallback already handled
    }
    updateNoteTextRange(noteId, selection.start, selection.end, '');
    setNoteTextSelection(null);
  };

  const handleNoteTextDelete = (noteId: string) => {
    const selection = getNoteSelection(noteId);
    if (!selection?.hasSelection) return;

    updateNoteTextRange(noteId, selection.start, selection.end, '');
    setNoteTextSelection(null);
  };

  const handleNoteTextPaste = async (noteId: string) => {
    const selection = getNoteSelection(noteId);
    if (!selection) return;

    let pastedText = '';
    try {
      pastedText = await navigator.clipboard.readText();
    } catch (_err) {
      pastedText = noteClipboard;
    }

    if (!pastedText) return;
    updateNoteTextRange(noteId, selection.start, selection.end, pastedText);
    setNoteTextSelection({
      noteId,
      start: selection.start + pastedText.length,
      end: selection.start + pastedText.length,
    });
  };

  const handleNoteTextSelectAll = (noteId: string) => {
    const textarea = noteTextareaRefs.current?.[noteId];
    const note = latestNotesRef.current.find((n) => n.id === noteId);
    if (!textarea || !note) return;

    textarea.focus();
    textarea.setSelectionRange(0, note.text.length);
    setNoteTextSelection({
      noteId,
      start: 0,
      end: note.text.length,
    });
  };

  const bringNoteToFront = (noteId: string) => {
    setNotesState((prevNotes) => {
      const idx = prevNotes.findIndex((n) => n.id === noteId);
      if (idx !== -1 && idx !== prevNotes.length - 1) {
        const newNotes = [...prevNotes];
        const [movedNote] = newNotes.splice(idx, 1);
        newNotes.push(movedNote);
        return newNotes;
      }
      return prevNotes;
    });
  };

  return {
    noteClipboard,
    setNoteClipboard,
    noteTextSelection,
    setNoteTextSelection,
    getNoteSelection,
    updateNoteText,
    updateNoteTextRange,
    handleNoteTextCopy,
    handleNoteTextCut,
    handleNoteTextDelete,
    handleNoteTextPaste,
    handleNoteTextSelectAll,
    bringNoteToFront
  };
}
