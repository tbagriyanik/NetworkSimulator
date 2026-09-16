'use client';

import { useEffect } from 'react';
import { CanvasNote } from '@/components/network/NetworkTopology/types/networkTopology.types';

interface UseNoteDraggingProps {
  canvasRef: React.RefObject<HTMLDivElement | null>;
  zoomRef: React.MutableRefObject<number>;
  draggedNoteIdRef: React.MutableRefObject<string | null>;
  resizingNoteIdRef: React.MutableRefObject<string | null>;
  noteDragStartRef: React.MutableRefObject<{ x: number; y: number } | null>;
  noteResizeStartRef: React.MutableRefObject<{ x: number; y: number; width: number; height: number; noteX: number; noteY: number } | null>;
  noteResizeDirectionRef: React.MutableRefObject<string>;
  setNotes: React.Dispatch<React.SetStateAction<CanvasNote[]>>;
  setDraggedNoteId: (id: string | null) => void;
  setNoteDragStart: (pos: { x: number; y: number } | null) => void;
  setResizingNoteId: (id: string | null) => void;
  setNoteResizeStart: (info: { x: number; y: number; width: number; height: number; noteX: number; noteY: number } | null) => void;
  setNoteResizeDirection: (dir: string) => void;
}

export function useNoteDragging({
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
}: UseNoteDraggingProps) {
  useEffect(() => {
    let animationFrameId: number;

    const handleMouseMove = (e: globalThis.MouseEvent) => {
      if (!canvasRef.current) return;

      if (draggedNoteIdRef.current && noteDragStartRef.current) {
        if (animationFrameId) cancelAnimationFrame(animationFrameId);

        const dragStart = noteDragStartRef.current;
        const draggedNoteId = draggedNoteIdRef.current;
        animationFrameId = requestAnimationFrame(() => {
          const currentZoom = zoomRef.current;

          const deltaX = (e.clientX - dragStart.x) / currentZoom;
          const deltaY = (e.clientY - dragStart.y) / currentZoom;

          setNotes((prev) =>
            prev.map((n) =>
              n.id === draggedNoteId
                ? { ...n, x: n.x + deltaX, y: n.y + deltaY }
                : n
            )
          );

          setNoteDragStart({ x: e.clientX, y: e.clientY });
        });
      } else if (resizingNoteIdRef.current && noteResizeStartRef.current) {
        if (animationFrameId) cancelAnimationFrame(animationFrameId);

        const resizeStart = noteResizeStartRef.current;
        const dir = noteResizeDirectionRef.current;
        animationFrameId = requestAnimationFrame(() => {
          const currentZoom = zoomRef.current;
          const dx = (e.clientX - resizeStart.x) / currentZoom;
          const dy = (e.clientY - resizeStart.y) / currentZoom;
          const origW = resizeStart.width;
          const origH = resizeStart.height;
          let newW = origW, newH = origH, newX: number | undefined, newY: number | undefined;

          if (dir.includes('e')) newW = Math.max(180, origW + dx);
          if (dir.includes('w')) { newW = Math.max(180, origW - dx); newX = resizeStart.noteX + (origW - newW); }
          if (dir.includes('s')) newH = Math.max(100, origH + dy);
          if (dir.includes('n')) { newH = Math.max(100, origH - dy); newY = resizeStart.noteY + (origH - newH); }

          setNotes((prev) =>
            prev.map((n) => {
              if (n.id !== resizingNoteIdRef.current) return n;
              const updated: CanvasNote = { ...n, width: newW, height: newH };
              if (newX !== undefined) updated.x = newX;
              if (newY !== undefined) updated.y = newY;
              return updated;
            })
          );
        });
      }
    };

    const handleTouchMove = (e: globalThis.TouchEvent) => {
      if (!canvasRef.current || e.touches.length !== 1) return;

      const touch = e.touches[0];

      if (draggedNoteIdRef.current && noteDragStartRef.current) {
        if (animationFrameId) cancelAnimationFrame(animationFrameId);

        const dragStart = noteDragStartRef.current;
        const draggedNoteId = draggedNoteIdRef.current;
        animationFrameId = requestAnimationFrame(() => {
          const currentZoom = zoomRef.current;

          const deltaX = (touch.clientX - dragStart.x) / currentZoom;
          const deltaY = (touch.clientY - dragStart.y) / currentZoom;

          setNotes((prev) =>
            prev.map((n) =>
              n.id === draggedNoteId
                ? { ...n, x: n.x + deltaX, y: n.y + deltaY }
                : n
            )
          );

          setNoteDragStart({ x: touch.clientX, y: touch.clientY });
        });
      } else if (resizingNoteIdRef.current && noteResizeStartRef.current) {
        if (animationFrameId) cancelAnimationFrame(animationFrameId);

        const resizeStart = noteResizeStartRef.current;
        const dir = noteResizeDirectionRef.current;
        animationFrameId = requestAnimationFrame(() => {
          const currentZoom = zoomRef.current;
          const dx = (touch.clientX - resizeStart.x) / currentZoom;
          const dy = (touch.clientY - resizeStart.y) / currentZoom;
          const origW = resizeStart.width;
          const origH = resizeStart.height;
          let newW = origW, newH = origH, newX: number | undefined, newY: number | undefined;

          if (dir.includes('e')) newW = Math.max(180, origW + dx);
          if (dir.includes('w')) { newW = Math.max(180, origW - dx); newX = resizeStart.noteX + (origW - newW); }
          if (dir.includes('s')) newH = Math.max(100, origH + dy);
          if (dir.includes('n')) { newH = Math.max(100, origH - dy); newY = resizeStart.noteY + (origH - newH); }

          setNotes((prev) =>
            prev.map((n) => {
              if (n.id !== resizingNoteIdRef.current) return n;
              const updated: CanvasNote = { ...n, width: newW, height: newH };
              if (newX !== undefined) updated.x = newX;
              if (newY !== undefined) updated.y = newY;
              return updated;
            })
          );
        });
      }
    };

    const handleMouseUp = () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      draggedNoteIdRef.current = null;
      noteDragStartRef.current = null;
      resizingNoteIdRef.current = null;
      noteResizeStartRef.current = null;
      setDraggedNoteId(null);
      setNoteDragStart(null);
      setResizingNoteId(null);
      setNoteResizeStart(null);
      setNoteResizeDirection('se');
    };

    const handleTouchEnd = () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      draggedNoteIdRef.current = null;
      noteDragStartRef.current = null;
      resizingNoteIdRef.current = null;
      noteResizeStartRef.current = null;
      setDraggedNoteId(null);
      setNoteDragStart(null);
      setResizingNoteId(null);
      setNoteResizeStart(null);
      setNoteResizeDirection('se');
    };

    // Releasing the mouse outside the browser window may not dispatch a
    // regular mouseup to the original SVG/foreignObject target. Always reset
    // the resize state when the window loses focus or a pointer is released.
    const handlePointerUp = () => handleMouseUp();
    const handleWindowBlur = () => handleMouseUp();

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('touchend', handleTouchEnd);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('blur', handleWindowBlur);
    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('blur', handleWindowBlur);
    };
  }, [canvasRef, zoomRef, draggedNoteIdRef, resizingNoteIdRef, noteDragStartRef, noteResizeStartRef, noteResizeDirectionRef, setNotes, setDraggedNoteId, setNoteDragStart, setResizingNoteId, setNoteResizeStart, setNoteResizeDirection]);
}


