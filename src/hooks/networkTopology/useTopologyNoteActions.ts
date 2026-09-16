'use client';

import { useState, useCallback, RefObject, MouseEvent as ReactMouseEvent, TouchEvent as ReactTouchEvent } from 'react';
import type { CanvasNote } from '@/components/network/NetworkTopology/types/networkTopology.types';
import { NOTE_COLORS, NOTE_FONTS_DESKTOP as NOTE_FONTS, NOTE_FONT_SIZES, NOTE_OPACITY as NOTE_OPACITY_OPTIONS } from '@/components/network/NetworkTopology/utils/networkTopology.constants';
import { useNoteDragging } from './useNoteDragging';

interface UseTopologyNoteActionsProps {
  notes: CanvasNote[];
  setNotes: React.Dispatch<React.SetStateAction<CanvasNote[]>>;
  latestNotesRef: React.MutableRefObject<CanvasNote[]>;
  saveToHistory: () => void;
  bringNoteToFront: (noteId: string) => void;
  setSelectedNoteIds: React.Dispatch<React.SetStateAction<string[]>>;
  canvasRef: RefObject<HTMLDivElement | null>;
  zoomRef: React.MutableRefObject<number>;
  draggedNoteIdRef: React.MutableRefObject<string | null>;
  resizingNoteIdRef: React.MutableRefObject<string | null>;
  noteDragStartRef: React.MutableRefObject<{ x: number; y: number } | null>;
  noteResizeStartRef: React.MutableRefObject<{ x: number; y: number; width: number; height: number; noteX: number; noteY: number } | null>;
  noteResizeDirectionRef: React.MutableRefObject<string>;
}

export function useTopologyNoteActions({
  notes,
  setNotes,
  latestNotesRef,
  saveToHistory,
  bringNoteToFront,
  setSelectedNoteIds,
  canvasRef,
  zoomRef,
  draggedNoteIdRef,
  resizingNoteIdRef,
  noteDragStartRef,
  noteResizeStartRef,
  noteResizeDirectionRef,
}: UseTopologyNoteActionsProps) {
  const [draggedNoteId, setDraggedNoteId] = useState<string | null>(null);
  const [resizingNoteId, setResizingNoteId] = useState<string | null>(null);
  const [noteDragStart, setNoteDragStart] = useState<{ x: number; y: number } | null>(null);
  const [noteResizeStart, setNoteResizeStart] = useState<{ x: number; y: number; width: number; height: number; noteX: number; noteY: number } | null>(null);
  const [noteResizeDirection, setNoteResizeDirection] = useState<string>('se');

  const updateNoteText = useCallback((noteId: string, text: string) => {
    setNotes((prev) =>
      prev.map((n) => (n.id === noteId ? { ...n, text } : n))
    );
  }, [setNotes]);

  const updateNoteStyle = useCallback((noteId: string, updates: Partial<CanvasNote>) => {
    saveToHistory();
    setNotes((prev) =>
      prev.map((n) => (n.id === noteId ? { ...n, ...updates } : n))
    );
  }, [saveToHistory, setNotes]);

  const cycleNoteColor = useCallback((noteId: string) => {
    const note = latestNotesRef.current.find((n) => n.id === noteId);
    if (!note) return;
    const idx = NOTE_COLORS.indexOf(note.color as typeof NOTE_COLORS[number]);
    const next = NOTE_COLORS[(idx >= 0 ? idx + 1 : 0) % NOTE_COLORS.length];
    updateNoteStyle(noteId, { color: next });
  }, [updateNoteStyle, latestNotesRef]);

  const cycleNoteFont = useCallback((noteId: string) => {
    const note = latestNotesRef.current.find((n) => n.id === noteId);
    if (!note) return;
    const idx = NOTE_FONTS.indexOf(note.font as typeof NOTE_FONTS[number]);
    const next = NOTE_FONTS[(idx >= 0 ? idx + 1 : 0) % NOTE_FONTS.length];
    updateNoteStyle(noteId, { font: next });
  }, [updateNoteStyle, latestNotesRef]);

  const cycleNoteFontSize = useCallback((noteId: string) => {
    const note = latestNotesRef.current.find((n) => n.id === noteId);
    if (!note) return;
    const idx = NOTE_FONT_SIZES.indexOf(note.fontSize);
    const next = NOTE_FONT_SIZES[(idx >= 0 ? idx + 1 : 0) % NOTE_FONT_SIZES.length];
    updateNoteStyle(noteId, { fontSize: next });
  }, [updateNoteStyle, latestNotesRef]);

  const cycleNoteOpacity = useCallback((noteId: string) => {
    const note = latestNotesRef.current.find((n) => n.id === noteId);
    if (!note) return;
    const idx = NOTE_OPACITY_OPTIONS.indexOf(note.opacity);
    const next = NOTE_OPACITY_OPTIONS[(idx >= 0 ? idx + 1 : 0) % NOTE_OPACITY_OPTIONS.length];
    updateNoteStyle(noteId, { opacity: next });
  }, [updateNoteStyle, latestNotesRef]);

  const handleNoteHeaderMouseDown = useCallback((e: ReactMouseEvent, noteId: string) => {
    e.stopPropagation();
    if (!canvasRef.current) return;

    const note = notes.find((n) => n.id === noteId);
    if (!note) return;

    setSelectedNoteIds([noteId]);
    saveToHistory();
    bringNoteToFront(noteId);
    draggedNoteIdRef.current = noteId;
    noteDragStartRef.current = { x: e.clientX, y: e.clientY };
    setDraggedNoteId(noteId);
    setNoteDragStart({ x: e.clientX, y: e.clientY });
  }, [notes, saveToHistory, bringNoteToFront, setSelectedNoteIds, canvasRef, draggedNoteIdRef, noteDragStartRef]);

  const handleNoteHeaderTouchStart = useCallback((e: ReactTouchEvent, noteId: string) => {
    e.stopPropagation();
    if (!canvasRef.current || e.touches.length !== 1) return;

    const touch = e.touches[0];
    const note = notes.find((n) => n.id === noteId);
    if (!note) return;

    setSelectedNoteIds([noteId]);
    saveToHistory();
    bringNoteToFront(noteId);
    draggedNoteIdRef.current = noteId;
    noteDragStartRef.current = { x: touch.clientX, y: touch.clientY };
    setDraggedNoteId(noteId);
    setNoteDragStart({ x: touch.clientX, y: touch.clientY });
  }, [notes, saveToHistory, bringNoteToFront, setSelectedNoteIds, canvasRef, draggedNoteIdRef, noteDragStartRef]);

  const handleNoteResizeStart = useCallback((e: ReactMouseEvent, noteId: string, direction: string = 'se') => {
    e.stopPropagation();
    if (!canvasRef.current) return;

    const note = notes.find((n) => n.id === noteId);
    if (!note) return;

    saveToHistory();
    resizingNoteIdRef.current = noteId;
    noteResizeDirectionRef.current = direction;
    noteResizeStartRef.current = { x: e.clientX, y: e.clientY, width: note.width, height: note.height, noteX: note.x, noteY: note.y };
    setResizingNoteId(noteId);
    setNoteResizeDirection(direction);
    setNoteResizeStart({ x: e.clientX, y: e.clientY, width: note.width, height: note.height, noteX: note.x, noteY: note.y });
    setSelectedNoteIds([noteId]);
  }, [notes, saveToHistory, setSelectedNoteIds, canvasRef]);

  const handleNoteResizeTouchStart = useCallback((e: ReactTouchEvent, noteId: string, direction: string = 'se') => {
    e.stopPropagation();
    if (!canvasRef.current || e.touches.length !== 1) return;

    const touch = e.touches[0];
    const note = notes.find((n) => n.id === noteId);
    if (!note) return;

    saveToHistory();
    resizingNoteIdRef.current = noteId;
    noteResizeDirectionRef.current = direction;
    noteResizeStartRef.current = { x: touch.clientX, y: touch.clientY, width: note.width, height: note.height, noteX: note.x, noteY: note.y };
    setResizingNoteId(noteId);
    setNoteResizeDirection(direction);
    setNoteResizeStart({ x: touch.clientX, y: touch.clientY, width: note.width, height: note.height, noteX: note.x, noteY: note.y });
    setSelectedNoteIds([noteId]);
  }, [notes, saveToHistory, setSelectedNoteIds, canvasRef]);

  useNoteDragging({
    canvasRef,
    zoomRef,
    draggedNoteIdRef,
    resizingNoteIdRef,
    noteDragStartRef,
    noteResizeStartRef,
    noteResizeDirectionRef,
    setNotes,
    setDraggedNoteId,
    setNoteDragStart,
    setResizingNoteId,
    setNoteResizeStart,
    setNoteResizeDirection,
  });

  return {
    draggedNoteId,
    resizingNoteId,
    noteDragStart,
    noteResizeStart,
    noteResizeDirection,
    updateNoteText,
    updateNoteStyle,
    cycleNoteColor,
    cycleNoteFont,
    cycleNoteFontSize,
    cycleNoteOpacity,
    handleNoteHeaderMouseDown,
    handleNoteHeaderTouchStart,
    handleNoteResizeStart,
    handleNoteResizeTouchStart,
  };
}


