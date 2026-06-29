import { useState, useEffect, type RefObject } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  Trash2, Undo2, Redo2, Scissors, Copy, ClipboardPaste,
  RefreshCw, CheckSquare, ExternalLink, Mail, Power, ListTodo, ImageDown
} from 'lucide-react';
import { NOTE_COLORS, NOTE_FONT_SIZES, NOTE_OPACITY } from './networkTopology.constants';
import { CanvasDevice, CanvasNote, ContextMenuState } from './networkTopology.types';

interface NetworkTopologyContextMenuProps {
  contextMenu: ContextMenuState | null;
  contextMenuRef: RefObject<HTMLDivElement | null>;
  isDark: boolean;
  noteFonts: string[];
  notes: CanvasNote[];
  devices: CanvasDevice[];
  note?: CanvasNote;
  selectedDeviceIds: string[];
  clipboardLength: number;
  noteClipboardLength: number;
  canUndo: boolean;
  canRedo: boolean;
  isExamActive?: boolean;
  onClose: () => void;
  onUpdateNoteStyle: (id: string, style: Partial<CanvasNote>) => void;
  onDuplicateNote: (id: string) => void;
  onPasteNotes: (x: number, y: number) => void;
  onUndo: () => void;
  onRedo: () => void;
  onSelectAll: () => void;
  onOpenDevice: (d: CanvasDevice) => void;
  onCutDevices: (ids: string[]) => void;
  onCopyDevices: (ids: string[]) => void;
  onPasteDevice?: () => void;
  onDeleteDevices: (ids: string[]) => void;
  onStartPing: (id: string) => void;
  onTogglePowerDevices: (ids: string[]) => void;
  onSaveToHistory: () => void;
  onClearDeviceSelection: () => void;
  onOpenTasks?: (deviceId: string) => void;
  onRefreshNetwork?: () => void;
}

export default function NetworkTopologyContextMenu({
  contextMenu,
  contextMenuRef,
  isDark,
  noteFonts,
  notes,
  devices,
  note,
  selectedDeviceIds,
  clipboardLength,
  noteClipboardLength,
  canUndo,
  canRedo,
  isExamActive = false,
  onClose,
  onUpdateNoteStyle,
  onDuplicateNote,
  onPasteNotes,
  onUndo,
  onRedo,
  onSelectAll,
  onOpenDevice,
  onCutDevices,
  onCopyDevices,
  onPasteDevice,
  onDeleteDevices,
  onStartPing,
  onTogglePowerDevices,
  onSaveToHistory,
  onClearDeviceSelection,
  onOpenTasks,
  onRefreshNetwork,
}: NetworkTopologyContextMenuProps) {
  const { t } = useLanguage();
  const [position, setPosition] = useState({ x: contextMenu?.x || 0, y: contextMenu?.y || 0 });

  const renderIcon = (iconName: string) => {
    switch (iconName) {
      case 'undo': return <Undo2 className="w-4 h-4" />;
      case 'redo': return <Redo2 className="w-4 h-4" />;
      case 'trash':
      case 'delete': return <Trash2 className="w-4 h-4" />;
      case 'cut': return <Scissors className="w-4 h-4" />;
      case 'copy': return <Copy className="w-4 h-4" />;
      case 'paste': return <ClipboardPaste className="w-4 h-4" />;
      case 'select': return <CheckSquare className="w-4 h-4" />;
      case 'open': return <ExternalLink className="w-4 h-4" />;
      case 'ping': return <Mail className="w-4 h-4" />;
      case 'refresh': return <RefreshCw className="w-4 h-4" />;
      case 'power': return <Power className="w-4 h-4" />;
      case 'tasks': return <ListTodo className="w-4 h-4" />;
      case 'image': return <ImageDown className="w-4 h-4" />;
      default: return null;
    }
  };

  const renderMenuItem = ({ label, icon, shortcut, onClick, disabled }: {
    label: string;
    icon?: string;
    shortcut?: string;
    onClick: () => void;
    disabled?: boolean;
  }) => (
    <button
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!disabled) {
          onClick();
        }
      }}
      disabled={disabled}
      className={`w-full flex items-center justify-between px-3 py-2 text-xs font-semibold transition-colors group ${disabled
        ? 'opacity-50 cursor-not-allowed'
        : isDark ? 'text-slate-200 hover:bg-slate-700/80 hover:text-cyan-400 cursor-pointer' : 'text-slate-700 hover:bg-slate-50 hover:text-cyan-600 cursor-pointer'
        }`}
    >
      <div className="flex items-center gap-3">
        {icon && <span className="opacity-80 group-hover:opacity-100">{renderIcon(icon)}</span>}
        <span>{label}</span>
      </div>
      {shortcut && <span className="text-[10px] opacity-40 font-mono tracking-tighter ml-4">{shortcut}</span>}
    </button>
  );

  useEffect(() => {
    if (contextMenu && contextMenuRef.current) {
      const { offsetWidth, offsetHeight } = contextMenuRef.current;
      const x = Math.min(contextMenu.x, window.innerWidth - offsetWidth - 10);
      const y = Math.min(contextMenu.y, window.innerHeight - offsetHeight - 10);
      setPosition({ x: Math.max(10, x), y: Math.max(10, y) });
    }
  }, [contextMenu?.x, contextMenu?.y, contextMenuRef]);

  // Render logic follows hook calls
  if (!contextMenu) return null;

  // Don't render if position is at origin (0,0) - prevents flash at top-left
  if (position.x === 0 && position.y === 0) return null;

  return (
    <div
      ref={contextMenuRef}
      className={`context-menu fixed z-[10002] py-1 rounded-lg shadow-xl min-w-[140px] max-w-[240px] ${isDark ? 'bg-slate-800 border border-slate-700' : 'bg-white border border-slate-200'}`}
      style={{
        left: position.x,
        top: position.y,
        maxHeight: '70vh',
        overflowY: 'auto',
        resize: contextMenu.mode.startsWith('note') ? 'both' : 'none',
        minWidth: contextMenu.mode.startsWith('note') ? 180 : undefined,
        minHeight: contextMenu.mode.startsWith('note') ? 120 : undefined,
        maxWidth: '300px'
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {contextMenu.noteId && contextMenu.mode === 'note-style' && (
        <div className="px-2 py-2 space-y-2">
          <div className="text-[10px]  tracking-widest text-slate-500">
            {t.noteStyle}
          </div>

          <div className="grid grid-cols-5 gap-1">
            {NOTE_COLORS.map((c) => {
              const gradientMap: Record<string, string> = {
                '#3b82f6': 'linear-gradient(to bottom, #3b82f6, #1d4ed8)',
                '#10b981': 'linear-gradient(to bottom, #10b981, #047857)',
                '#8b5cf6': 'linear-gradient(to bottom, #8b5cf6, #6d28d9)',
                '#f59e0b': 'linear-gradient(to bottom, #f59e0b, #b45309)',
                '#ef4444': 'linear-gradient(to bottom, #ef4444, #b91c1c)',
                '#06b6d4': 'linear-gradient(to bottom, #06b6d4, #0e7490)',
                '#ec4899': 'linear-gradient(to bottom, #ec4899, #be185d)',
                '#f97316': 'linear-gradient(to bottom, #f97316, #c2410c)',
                '#84cc16': 'linear-gradient(to bottom, #84cc16, #4d7c0f)',
                '#64748b': 'linear-gradient(to bottom, #64748b, #334155)',
                '#a78bfa': 'linear-gradient(to bottom, #a78bfa, #7c3aed)',
                '#60a5fa': 'linear-gradient(to bottom, #60a5fa, #2563eb)',
                '#4ade80': 'linear-gradient(to bottom, #4ade80, #16a34a)',
              };
              return (
                <button
                  key={c}
                  onClick={() => { if (contextMenu.noteId) onUpdateNoteStyle(contextMenu.noteId, { color: c }); onClose(); }}
                  className={`w-4 h-4 rounded border ${note?.color === c ? 'ring-2 ring-cyan-500' : 'border-black/10'}`}
                  style={{ background: gradientMap[c] || c, outline: note?.color === c ? '2px solid cyan' : 'none' }}
                  title={c}
                />
              );
            })}
          </div>

          <div className="space-y-1">
            <div className="text-[10px]  tracking-widest text-slate-500">
              {t.fontLabel}
            </div>
            <div className="grid grid-cols-1 gap-1">
              {noteFonts.map((f) => (
                <button
                  key={f}
                  onClick={() => { if (contextMenu.noteId) onUpdateNoteStyle(contextMenu.noteId, { font: f }); onClose(); }}
                  className={`px-2 py-1 rounded text-left text-[11px] ${note?.font === f
                    ? (isDark ? 'bg-slate-600 text-white border-cyan-500 border' : 'bg-slate-200 text-black border-cyan-500 border')
                    : (isDark ? 'hover:bg-slate-700 text-slate-200 hover:text-cyan-400' : 'hover:bg-slate-100 text-slate-700 hover:text-cyan-600')
                    }`}
                  style={{ fontFamily: f }}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1">
            <div className="text-[10px] tracking-widest text-slate-500">
              {t.sizeLabel}
            </div>
            <div className="flex gap-1">
              {NOTE_FONT_SIZES.map((s) => (
                <button
                  key={s}
                  onClick={() => { if (contextMenu.noteId) onUpdateNoteStyle(contextMenu.noteId, { fontSize: s }); onClose(); }}
                  className={`px-2 py-1 rounded text-[11px] ${note?.fontSize === s
                    ? (isDark ? 'bg-slate-600 text-white border-cyan-500 border' : 'bg-slate-200 text-black border-cyan-500 border')
                    : (isDark ? 'hover:bg-slate-700 text-slate-200 hover:text-cyan-400' : 'hover:bg-slate-100 text-slate-700 hover:text-cyan-600')
                    }`}
                >
                  {s}px
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1">
            <div className="text-[10px] tracking-widest text-slate-500">
              {t.opacityLabel}
            </div>
            <div className="flex gap-1">
              {NOTE_OPACITY.map((o) => (
                <button
                  key={o}
                  onClick={() => { if (contextMenu.noteId) onUpdateNoteStyle(contextMenu.noteId, { opacity: o }); onClose(); }}
                  className={`px-2 py-1 rounded text-[11px] ${note?.opacity === o
                    ? (isDark ? 'bg-slate-600 text-white border-cyan-500 border' : 'bg-slate-200 text-black border-cyan-500 border')
                    : (isDark ? 'hover:bg-slate-700 text-slate-200 hover:text-cyan-400' : 'hover:bg-slate-100 text-slate-700 hover:text-cyan-600')
                    }`}
                >
                  {Math.round(o * 100)}%
                </button>
              ))}
            </div>
          </div>
          <div className="pt-1 border-t border-slate-700/30">
            {renderMenuItem({
              label: t.duplicateLabel,
              icon: 'copy',
              onClick: () => { if (contextMenu.noteId) onDuplicateNote(contextMenu.noteId); onClose(); }
            })}
          </div>
        </div>
      )}

      {contextMenu.mode === 'canvas' && (
        <div className="px-2 py-2 space-y-1">
          {renderMenuItem({
            label: t.paste,
            icon: 'paste',
            shortcut: 'Ctrl+V',
            disabled: (noteClipboardLength === 0) && (!onPasteDevice || clipboardLength === 0),
            onClick: () => {
              if (onPasteDevice && clipboardLength > 0) {
                onPasteDevice();
              } else {
                onPasteNotes(contextMenu.x, contextMenu.y);
              }
              onClose();
            }
          })}
          {renderMenuItem({
            label: t.undo,
            icon: 'undo',
            shortcut: 'Ctrl+Z',
            disabled: !canUndo,
            onClick: () => { onUndo(); onClose(); }
          })}
          {renderMenuItem({
            label: t.redo,
            icon: 'redo',
            shortcut: 'Ctrl+Y',
            disabled: !canRedo,
            onClick: () => { onRedo(); onClose(); }
          })}
          {renderMenuItem({
            label: t.selectAll,
            icon: 'select',
            shortcut: 'Ctrl+A',
            disabled: devices.length === 0 && notes.length === 0,
            onClick: () => { onSelectAll(); onClose(); }
          })}
          <div className="my-1 border-t border-slate-200/20" />
          {renderMenuItem({
            label: t.refreshNetwork,
            icon: 'refresh',
            shortcut: 'F5',
            onClick: () => {
              onClose();
              setTimeout(() => {
                window.dispatchEvent(new KeyboardEvent('keydown', { key: 'F5' }));
              }, 0);
            }
          })}
        </div>
      )}

      {contextMenu.deviceId && contextMenu.mode === 'device' && (
        <div className="px-2 py-2 space-y-1">
          {(() => {
            const device = devices.find((d) => d.id === contextMenu.deviceId);
            const canPaste = !!onPasteDevice && clipboardLength > 0;
            const hasSelection = selectedDeviceIds.includes(contextMenu.deviceId);
            const targets = hasSelection ? selectedDeviceIds : [contextMenu.deviceId];
            const isRouterOrSwitch = device && (device.type === 'router' || device.type === 'switchL2' || device.type === 'switchL3');
            return (
              <>
                {renderMenuItem({
                  label: t.open,
                  shortcut: 'Enter',
                  icon: 'open',
                  onClick: () => { if (device && device.type !== 'iot') onOpenDevice(device); onClose(); },
                  disabled: !device || device.type === 'iot'
                })}
                {isRouterOrSwitch && onOpenTasks && renderMenuItem({
                  label: t.tasks,
                  icon: 'tasks',
                  onClick: () => { if (contextMenu.deviceId) onOpenTasks(contextMenu.deviceId); onClose(); },
                  disabled: !device
                })}
                <div className="my-1 border-t border-slate-200/20" />
                {!isExamActive && renderMenuItem({
                  label: t.cut,
                  icon: 'cut',
                  shortcut: 'Ctrl+X',
                  disabled: !device,
                  onClick: () => { onSaveToHistory(); onCutDevices(targets); onClose(); }
                })}
                {!isExamActive && renderMenuItem({
                  label: t.copy,
                  icon: 'copy',
                  shortcut: 'Ctrl+C',
                  disabled: !device,
                  onClick: () => { onCopyDevices(targets); onClose(); }
                })}
                {!isExamActive && renderMenuItem({
                  label: t.paste,
                  icon: 'paste',
                  shortcut: 'Ctrl+V',
                  disabled: !canPaste,
                  onClick: () => { if (onPasteDevice) onPasteDevice(); onClose(); }
                })}
                {!isExamActive && renderMenuItem({
                  label: t.delete,
                  icon: 'delete',
                  shortcut: 'Del',
                  disabled: !device,
                  onClick: () => {
                    onSaveToHistory();
                    onDeleteDevices(targets);
                    onClearDeviceSelection();
                    onClose();
                  }
                })}
                {renderMenuItem({
                  label: t.selectAll,
                  icon: 'select',
                  shortcut: 'Ctrl+A',
                  disabled: devices.length === 0,
                  onClick: () => { onSelectAll(); onClose(); }
                })}
                <div className="my-1 border-t border-slate-200/20" />
                {renderMenuItem({
                  label: t.ping,
                  icon: 'ping',
                  shortcut: 'P',
                  onClick: () => { if (contextMenu.deviceId) onStartPing(contextMenu.deviceId); onClose(); },
                  disabled: !device
                })}
                {renderMenuItem({
                  label: t.power,
                  icon: 'power',
                  onClick: () => { onSaveToHistory(); onTogglePowerDevices(targets); onClose(); },
                  disabled: !device
                })}
                {renderMenuItem({
                  label: t.refreshNetwork,
                  icon: 'refresh',
                  shortcut: 'F5',
                  onClick: () => {
                    onClose();
                    if (onRefreshNetwork) {
                      onRefreshNetwork();
                    } else {
                      setTimeout(() => {
                        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'F5' }));
                      }, 0);
                    }
                  }
                })}
              </>
            );
          })()}
        </div>
      )}
    </div>
  );
}

