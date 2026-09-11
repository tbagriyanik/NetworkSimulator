import React, { memo } from 'react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { CanvasNote, CanvasDevice, CanvasConnection, ContextMenuState } from '../networkTopology.types';

export interface NoteNodeProps {
  note: CanvasNote;
  isDark: boolean;
  selectedNoteIds: string[];
  draggedNoteId: string | null;
  contextMenu: ContextMenuState | null;
  language: string;
  t: Record<string, string>;
  noteTextareaRefs: React.MutableRefObject<Record<string, HTMLTextAreaElement | null>>;
  devices: CanvasDevice[];
  connections: CanvasConnection[];
  notes: CanvasNote[];
  setSelectedNoteIds: React.Dispatch<React.SetStateAction<string[]>>;
  setSelectedDeviceIds: React.Dispatch<React.SetStateAction<string[]>>;
  setContextMenu: React.Dispatch<React.SetStateAction<ContextMenuState | null>>;
  handleNoteHeaderMouseDown: (e: React.MouseEvent, id: string) => void;
  handleNoteHeaderTouchStart: (e: React.TouchEvent, id: string) => void;
  cycleNoteColor: (id: string) => void;
  cycleNoteFont: (id: string) => void;
  cycleNoteFontSize: (id: string) => void;
  cycleNoteOpacity: (id: string) => void;
  duplicateNote: (id: string) => void;
  deleteNote: (id: string) => void;
  updateNoteText: (id: string, text: string) => void;
  setNoteTextSelection: React.Dispatch<React.SetStateAction<{ noteId: string; start: number; end: number } | null>>;
  onTopologyChange?: (devices: CanvasDevice[], connections: CanvasConnection[], notes: CanvasNote[]) => void;
  handleNoteResizeStart: (e: React.MouseEvent, id: string, dir: string) => void;
  handleNoteResizeTouchStart: (e: React.TouchEvent, id: string, dir: string) => void;
  bringNoteToFront: (id: string) => void;
}

/**
 * NoteNode Component - Rendered on the SVG Canvas
 *
 * BOLT: Wrapped with `memo` to prevent unnecessary re-renders when panning/zooming the canvas,
 * or when dragging/modifying other devices or notes. Re-renders will only trigger if the note
 * itself, selection states, or relevant config props actually change.
 */
export const NoteNode = memo(function NoteNode({
  note,
  isDark,
  selectedNoteIds,
  draggedNoteId,
  contextMenu,
  language,
  t,
  noteTextareaRefs,
  devices,
  connections,
  notes,
  setSelectedNoteIds,
  setSelectedDeviceIds,
  setContextMenu,
  handleNoteHeaderMouseDown,
  handleNoteHeaderTouchStart,
  cycleNoteColor,
  cycleNoteFont,
  cycleNoteFontSize,
  cycleNoteOpacity,
  duplicateNote,
  deleteNote,
  updateNoteText,
  setNoteTextSelection,
  onTopologyChange,
  handleNoteResizeStart,
  handleNoteResizeTouchStart,
  bringNoteToFront
}: NoteNodeProps) {
  const [showSearch, setShowSearch] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [matchIndex, setMatchIndex] = React.useState(-1);
  const [lastQuery, setLastQuery] = React.useState('');

  const handleSearchNext = React.useCallback(() => {
    const textarea = noteTextareaRefs.current[note.id];
    if (!textarea || !searchQuery) return;

    const turkishLowerCase = (str: string) => {
      return str.replace(/İ/g, 'i').replace(/I/g, 'ı').toLowerCase();
    };

    const textNormalized = turkishLowerCase(textarea.value);
    const queryNormalized = turkishLowerCase(searchQuery);

    // Find all start indices of matches
    const indices: number[] = [];
    let pos = textNormalized.indexOf(queryNormalized);
    while (pos !== -1) {
      indices.push(pos);
      pos = textNormalized.indexOf(queryNormalized, pos + 1);
    }

    if (indices.length === 0) {
      setMatchIndex(-1);
      return;
    }

    // Determine the next index
    let nextIdx = 0;
    if (searchQuery === lastQuery) {
      nextIdx = (matchIndex + 1) % indices.length;
    }

    setMatchIndex(nextIdx);
    setLastQuery(searchQuery);

    const start = indices[nextIdx];
    const end = start + queryNormalized.length;

    // Focus and select the match
    textarea.focus();
    textarea.setSelectionRange(start, end);

    // Scroll to the selection
    const prefix = textarea.value.substring(0, start);
    const numLines = prefix.split('\n').length;
    const lineHeight = 16; // approximate line height in px
    textarea.scrollTop = Math.max(0, (numLines - 3) * lineHeight);
  }, [note.id, searchQuery, lastQuery, matchIndex, noteTextareaRefs]);

  return (
    <foreignObject
      key={note.id}
      x={note.x}
      y={note.y}
      width={note.width}
      height={note.height}
      data-note-id={note.id}
      className="pointer-events-none"
    >
      <div
        className={`pointer-events-auto relative flex flex-col w-full h-full overflow-hidden rounded-lg shadow-lg border ${isDark
          ? 'border-warning-300/60'
          : 'border-yellow-200'
          } ${selectedNoteIds.includes(note.id) ? 'ring-2 ring-pink-400/70' : ''}`}
        data-note-id={note.id}
        style={{ backgroundColor: note.color, fontFamily: note.font, opacity: note.opacity }}
        onPointerDown={(e) => {
          const target = e.target as HTMLElement;
          const interactiveTarget = target.closest('button, textarea, input, select, [data-note-header], [data-note-resize], [data-export-hide]') || target.closest('[class*="resize"]');
          // A note body (including its textarea/buttons) should rise above
          // other notes, but never above devices or cables.
          if (!target.closest('[data-export-hide]') && !target.closest('textarea')) bringNoteToFront(note.id);
          if (interactiveTarget) return;

          e.preventDefault();
          e.stopPropagation();
          setContextMenu(null);
          if (e.shiftKey) {
            setSelectedNoteIds((prev) => prev.includes(note.id) ? prev.filter(id => id !== note.id) : [...prev, note.id]);
          } else {
            setSelectedNoteIds([note.id]);
            setSelectedDeviceIds([]);
          }
          handleNoteHeaderMouseDown(e as unknown as React.MouseEvent, note.id);
        }}
        onMouseDown={(e) => {
          const target = e.target as HTMLElement;
          const interactiveTarget = target.closest('button, textarea, input, select, [data-note-header], [data-note-resize], [data-export-hide]') || target.closest('[class*="resize"]');
          if (!target.closest('[data-export-hide]') && !target.closest('textarea')) bringNoteToFront(note.id);
          if (interactiveTarget) return;

          e.preventDefault();
          e.stopPropagation();
          handleNoteHeaderMouseDown(e, note.id);
        }}
        onTouchStart={(e) => {
          const target = e.target as HTMLElement;
          const interactiveTarget = target.closest('button, textarea, input, select, [data-note-header], [data-note-resize], [data-export-hide]') || target.closest('[class*="resize"]');
          if (!target.closest('[data-export-hide]') && !target.closest('textarea')) bringNoteToFront(note.id);
          if (interactiveTarget) return;

          e.preventDefault();
          e.stopPropagation();
          handleNoteHeaderTouchStart(e, note.id);
        }}
        onClick={(e) => {
          e.stopPropagation();
        }}
      >
        {/* Note Header - Draggable */}
        <div
          data-export-hide="true"
          data-note-header="true"
          onMouseDown={(e) => {
            // A note drag must not also start panning the topology canvas.
            e.preventDefault();
            e.stopPropagation();
            handleNoteHeaderMouseDown(e, note.id);
          }}
          onTouchStart={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleNoteHeaderTouchStart(e, note.id);
          }}
          className={`relative flex items-center justify-center px-2 text-[10px] font-semibold tracking-widest select-none ${
            draggedNoteId === note.id ? 'cursor-grabbing' : 'cursor-grab'
          }`}
          style={{ height: '24px', backgroundColor: 'rgba(0, 0, 0, 0.15)' }}
        >
          <div
            className="flex items-center justify-center gap-1"
            style={{ display: note.width < 190 ? 'none' : 'flex' }}
            onMouseDown={(e) => {
              e.stopPropagation();
            }}
            onPointerDown={(e) => {
              // Preserve native text selection and scrollbar dragging.
              e.stopPropagation();
            }}
            onTouchStart={(e) => {
              e.stopPropagation();
            }}
          >
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    cycleNoteColor(note.id);
                  }}
                  className="w-4 h-4 rounded border border-black/20"
                  style={{ backgroundColor: note.color }}
                  aria-label={t.colorLabel}
                />
              </TooltipTrigger>
              <TooltipContent>{t.colorLabel}</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    cycleNoteFont(note.id);
                  }}
                  className="px-1 rounded text-[9px] leading-4 bg-black/10 hover:bg-black/20"
                >
                  F
                </button>
              </TooltipTrigger>
              <TooltipContent>{t.fontLabel}</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    cycleNoteFontSize(note.id);
                  }}
                  className="px-1 rounded text-[9px] leading-4 bg-black/10 hover:bg-black/20"
                >
                  {note.fontSize}
                </button>
              </TooltipTrigger>
              <TooltipContent>{t.sizeLabel}</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    cycleNoteOpacity(note.id);
                  }}
                  className="px-1 rounded text-[9px] leading-4 bg-black/10 hover:bg-black/20"
                >
                  {Math.round(note.opacity * 100)}
                </button>
              </TooltipTrigger>
              <TooltipContent>{t.opacityLabel}</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    duplicateNote(note.id);
                  }}
                  className="px-1 rounded text-[9px] leading-4 bg-black/10 hover:bg-black/20"
                >
                  D
                </button>
              </TooltipTrigger>
              <TooltipContent>{t.duplicateLabel}</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowSearch(!showSearch);
                    if (!showSearch) {
                      setSearchQuery('');
                      setMatchIndex(-1);
                      setLastQuery('');
                    }
                  }}
                  className="px-1 py-0.5 rounded text-[9px] leading-4 bg-black/10 hover:bg-black/20 flex items-center justify-center"
                  aria-label={language === 'tr' ? 'Ara' : 'Search'}
                >
                  <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </button>
              </TooltipTrigger>
              <TooltipContent>{language === 'tr' ? 'Ara' : 'Search'}</TooltipContent>
            </Tooltip>
          </div>
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteNote(note.id);
                  }}
                  className="px-1.5 py-0.5 rounded hover:bg-black/10 group"
                  aria-label={t.delete}
                >
                  <svg className="w-3 h-3 text-black/50 group-hover:text-error-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0 1 16.138 21H7.862a2 2 0 0 1 -1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 0 0 -1-1h-4a1 1 0 0 0 -1 1v3M4 7h16" />
                  </svg>
                </button>
              </TooltipTrigger>
              <TooltipContent>{t.delete}</TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* Search Bar */}
        {showSearch && (
          <div
            className="flex items-center gap-1.5 px-2 py-1 bg-black/10 border-b border-black/10"
            onMouseDown={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <input
              type="text"
              placeholder={language === 'tr' ? 'Ara...' : 'Search...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                e.stopPropagation();
                if (e.key === 'Enter') {
                  handleSearchNext();
                } else if (e.key === 'Escape') {
                  setShowSearch(false);
                }
              }}
              className="flex-1 text-[10px] px-1.5 py-0.5 rounded border border-black/20 bg-white/90 dark:bg-secondary-800/90 text-black dark:text-white focus:outline-none"
              autoFocus
            />
            <button
              onClick={(e) => { e.stopPropagation(); handleSearchNext(); }}
              className="px-1.5 py-0.5 text-[9px] bg-black/15 hover:bg-black/25 text-black dark:text-white rounded"
            >
              {language === 'tr' ? 'Sonraki' : 'Next'}
            </button>
          </div>
        )}

        {/* Note Content - Scrollable */}
        <div
          data-note-scroll
          className="flex-1 min-h-0"
          style={{
            height: showSearch ? `calc(100% - 48px)` : `calc(100% - 24px)`,
            // Keep the native textarea scrollbar clear of the right resize
            // handle so it remains clickable.
            width: 'calc(100% - 10px)',
            scrollBehavior: 'smooth',
          }}
          onWheel={(e) => {
            // Allow scroll within note without affecting canvas zoom
            e.stopPropagation();
          }}
          onTouchMove={(e) => {
            // Allow touch scroll within note
            e.stopPropagation();
          }}
        >
          <textarea
            aria-label={language === 'tr' ? 'Not içeriği' : 'Note content'}
            ref={(el) => { noteTextareaRefs.current[note.id] = el; }}
            value={note.text}
            onFocus={() => {
              // Editing a note must not leave a device selected; otherwise
              // Enter/arrow keys can accidentally activate device navigation.
              setSelectedDeviceIds([]);
              bringNoteToFront(note.id);
            }}
            onChange={(e) => updateNoteText(note.id, e.target.value)}
            onMouseDown={(e) => {
              // Sadece textarea içine tıklandığında olay durdurulsun, 
              // böylece canvas sürüklenmez ama scrollbar çalışır
              e.stopPropagation();
            }}
            onTouchStart={(e) => {
              // Mobilde textarea'ya dokunuş - drag'i durdur
              e.stopPropagation();
            }}
            onTouchEnd={(e) => {
              // Mobilde textarea'dan çıkış
              e.stopPropagation();
            }}
            onSelect={(e) => {
              setNoteTextSelection({
                noteId: note.id,
                start: e.currentTarget.selectionStart ?? 0,
                end: e.currentTarget.selectionEnd ?? 0,
              });
            }}
            onMouseUp={(e) => {
              setNoteTextSelection({
                noteId: note.id,
                start: e.currentTarget.selectionStart ?? 0,
                end: e.currentTarget.selectionEnd ?? 0,
              });
            }}
            onKeyDown={(e) => {
              e.stopPropagation();
              e.nativeEvent.stopImmediatePropagation();
              if (e.key === 'Tab') {
                e.preventDefault();
                e.stopPropagation();
                const textarea = e.currentTarget;
                const start = textarea.selectionStart;
                const end = textarea.selectionEnd;
                const indentation = '    ';
                const before = textarea.value.slice(0, start);
                const removeCount = e.shiftKey && before.endsWith(indentation) ? indentation.length : 0;
                const insertedText = e.shiftKey ? '' : indentation;
                const nextText = textarea.value.slice(0, start - removeCount) + insertedText + textarea.value.slice(end);
                updateNoteText(note.id, nextText);
                requestAnimationFrame(() => {
                  textarea.focus();
                  const nextCursor = start - removeCount + insertedText.length;
                  textarea.setSelectionRange(nextCursor, nextCursor);
                });
                return;
              }
              if (e.key === 'Enter' && !e.ctrlKey && !e.metaKey) {
                e.preventDefault();
                const textarea = e.currentTarget;
                const start = textarea.selectionStart;
                const end = textarea.selectionEnd;
                const nextText = textarea.value.slice(0, start) + '\n' + textarea.value.slice(end);
                updateNoteText(note.id, nextText);
                requestAnimationFrame(() => {
                  textarea.focus();
                  textarea.setSelectionRange(start + 1, start + 1);
                });
                return;
              }
              if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                e.currentTarget.blur();
                return;
              }
              // ESC tuşu ile context menu'yü kapat
              if (e.key === 'Escape' && contextMenu?.noteId === note.id) {
                setContextMenu(null);
              }
            }}
            onContextMenu={(e) => {
              e.stopPropagation();
            }}
            onBlur={() => {
              // Textarea'nın dışında tıklanınca context menu'yü kapat
              if (contextMenu?.noteId === note.id) {
                setContextMenu(null);
              }
              if (onTopologyChange) {
                onTopologyChange(devices, connections, notes);
              }
            }}
            className="w-full h-full min-h-full px-2 py-1 bg-transparent outline-none resize-none overflow-y-auto overflow-x-hidden whitespace-pre-wrap break-words touch-manipulation note-scrollbar font-medium"
            style={{ fontSize: note.fontSize, lineHeight: 1.35, color: 'var(--color-secondary-900)' }}
          />
        </div>

        {/* Resize Handles */}
        <div className="absolute left-0 top-0 bottom-0 w-1 cursor-ew-resize opacity-0 hover:opacity-40 transition-opacity z-10" onMouseDown={(e) => { e.preventDefault(); handleNoteResizeStart(e, note.id, 'w'); }} onTouchStart={(e) => { e.preventDefault(); handleNoteResizeTouchStart(e, note.id, 'w'); }} />
        <div className="absolute right-0 top-0 bottom-0 w-1 cursor-ew-resize opacity-0 hover:opacity-40 transition-opacity z-10" onMouseDown={(e) => { e.preventDefault(); handleNoteResizeStart(e, note.id, 'e'); }} onTouchStart={(e) => { e.preventDefault(); handleNoteResizeTouchStart(e, note.id, 'e'); }} />
        <div className="absolute left-0 top-0 right-0 h-1 cursor-ns-resize opacity-0 hover:opacity-40 transition-opacity z-10" onMouseDown={(e) => { e.preventDefault(); handleNoteResizeStart(e, note.id, 'n'); }} onTouchStart={(e) => { e.preventDefault(); handleNoteResizeTouchStart(e, note.id, 'n'); }} />
        <div className="absolute left-0 bottom-0 right-0 h-1 cursor-ns-resize opacity-0 hover:opacity-40 transition-opacity z-10" onMouseDown={(e) => { e.preventDefault(); handleNoteResizeStart(e, note.id, 's'); }} onTouchStart={(e) => { e.preventDefault(); handleNoteResizeTouchStart(e, note.id, 's'); }} />
        <div className="absolute left-0 top-0 w-4 h-4 cursor-nw-resize opacity-0 hover:opacity-40 transition-opacity z-10" onMouseDown={(e) => { e.preventDefault(); handleNoteResizeStart(e, note.id, 'nw'); }} onTouchStart={(e) => { e.preventDefault(); handleNoteResizeTouchStart(e, note.id, 'nw'); }} />
        <div className="absolute right-0 top-0 w-4 h-4 cursor-ne-resize opacity-0 hover:opacity-40 transition-opacity z-10" onMouseDown={(e) => { e.preventDefault(); handleNoteResizeStart(e, note.id, 'ne'); }} onTouchStart={(e) => { e.preventDefault(); handleNoteResizeTouchStart(e, note.id, 'ne'); }} />
        <div className="absolute left-0 bottom-0 w-4 h-4 cursor-sw-resize opacity-0 hover:opacity-40 transition-opacity z-10" onMouseDown={(e) => { e.preventDefault(); handleNoteResizeStart(e, note.id, 'sw'); }} onTouchStart={(e) => { e.preventDefault(); handleNoteResizeTouchStart(e, note.id, 'sw'); }} />
        <div className="absolute right-1 bottom-1 z-10 w-4 h-4 cursor-se-resize opacity-50 hover:opacity-100 transition-opacity touch-manipulation" onMouseDown={(e) => { e.preventDefault(); handleNoteResizeStart(e, note.id, 'se'); }} onTouchStart={(e) => { e.preventDefault(); handleNoteResizeTouchStart(e, note.id, 'se'); }}>
          <svg viewBox="0 0 12 12" className="w-full h-full text-black">
            <path d="M4 12 L12 4" stroke="currentColor" strokeWidth="1" />
            <path d="M7 12 L12 7" stroke="currentColor" strokeWidth="1" />
            <path d="M10 12 L12 10" stroke="currentColor" strokeWidth="1" />
          </svg>
        </div>
      </div>
    </foreignObject>
  );
});
