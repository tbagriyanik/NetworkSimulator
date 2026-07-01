import React from 'react';
import { Trash2, X } from 'lucide-react';
import useAppStore from '@/lib/store/appStore';
import { useLanguage } from '@/contexts/LanguageContext';
import { CABLE_COLORS } from './networkTopology.constants';
import { getConnectionStatusMessage } from './networkTopology.helpers';

interface PacketCapturePanelProps {
  activeCaptureConnectionId: string;
  clearCapturedPackets: (id: string) => void;
  setActiveCaptureConnection: (id: string | null) => void;
  capturedPacketsMap: Record<string, { id: string; timestamp: number; sourceIp: string; targetIp: string; protocol: string; info: string; }[]>;
  t: Record<string, string>;
  isDark: boolean;
}

export const PacketCapturePanel = ({
  activeCaptureConnectionId,
  clearCapturedPackets,
  setActiveCaptureConnection,
  capturedPacketsMap,
  t,
  isDark
}: PacketCapturePanelProps) => {
  const devices = useAppStore(state => state.topology.devices);
  const connections = useAppStore(state => state.topology.connections);
  const { language } = useLanguage();

  const conn = connections.find(c => c.id === activeCaptureConnectionId);
  let connectionLabel = activeCaptureConnectionId;
  if (conn) {
    const srcDev = devices.find(d => d.id === conn.sourceDeviceId);
    const tgtDev = devices.find(d => d.id === conn.targetDeviceId);
    if (srcDev && tgtDev) {
      connectionLabel = `${srcDev.name} ${conn.sourcePort} - ${conn.targetPort} ${tgtDev.name}`;
    }
  }

  const statusMessage = conn ? getConnectionStatusMessage(conn, devices, language) : '';
  const hasError = conn && statusMessage !== 'Bağlantı sorunsuz' && statusMessage !== 'Connection OK';

  const [columnOrder, setColumnOrder] = React.useState(['time', 'source', 'dest', 'proto', 'info']);
  
  const [position, setPosition] = React.useState(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('packetCapturePosition');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (typeof parsed.x === 'number' && typeof parsed.y === 'number' && !isNaN(parsed.x) && !isNaN(parsed.y)) {
            return parsed;
          }
        }
      } catch {}
      return { x: window.innerWidth - 420, y: window.innerHeight - 340 };
    }
    return { x: 0, y: 0 };
  });

  const [size, setSize] = React.useState(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('packetCaptureSize');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (typeof parsed.width === 'number' && typeof parsed.height === 'number' && !isNaN(parsed.width) && !isNaN(parsed.height)) {
            return parsed;
          }
        }
      } catch {}
    }
    return { width: 384, height: 260 };
  });

  const sizeRef = React.useRef(size);
  const positionRef = React.useRef(position);
  React.useEffect(() => { sizeRef.current = size; }, [size]);
  React.useEffect(() => { positionRef.current = position; }, [position]);
  
  const [isDragging, setIsDragging] = React.useState(false);
  const dragStartPos = React.useRef({ x: 0, y: 0 });

  const onDragStart = (e: React.DragEvent, idx: number) => { e.dataTransfer.setData('text/plain', idx.toString()); };
  const onDrop = (e: React.DragEvent, targetIdx: number) => {
    const sourceIdx = parseInt(e.dataTransfer.getData('text/plain'), 10);
    if (sourceIdx === targetIdx || isNaN(sourceIdx)) return;
    const newOrder = [...columnOrder];
    const [moved] = newOrder.splice(sourceIdx, 1);
    newOrder.splice(targetIdx, 0, moved);
    setColumnOrder(newOrder);
  };
  
  const handlePointerDown = (e: React.PointerEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('button')) return; // Ignore buttons
    
    setIsDragging(true);
    dragStartPos.current = { x: e.clientX - position.x, y: e.clientY - position.y };
    target.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (isDragging) {
      setPosition({
        x: e.clientX - dragStartPos.current.x,
        y: e.clientY - dragStartPos.current.y
      });
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (isDragging) {
      setIsDragging(false);
      localStorage.setItem('packetCapturePosition', JSON.stringify(positionRef.current));
      const target = e.target as HTMLElement;
      if (target.hasPointerCapture(e.pointerId)) {
        target.releasePointerCapture(e.pointerId);
      }
    }
  };

  const renderHeader = (col: string, idx: number) => {
    const labelMap: Record<string, string> = { time: t.time, source: t.source, dest: t.dest, proto: t.proto, info: t.info };
    return (
      <th
        key={col}
        draggable
        onDragStart={e => onDragStart(e, idx)}
        onDrop={e => onDrop(e, idx)}
        onDragOver={e => e.preventDefault()}
        className="px-2 py-1 border-b dark:border-slate-700 cursor-grab active:cursor-grabbing hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors select-none text-center"
      >
        {labelMap[col] || col}
      </th>
    );
  };

  const cableColors = CABLE_COLORS as Record<string, { primary: string; bg: string; text: string; border: string }>;

  return (
    <div 
      style={{ 
        left: `${position.x}px`, 
        top: `${position.y}px`, 
        width: `${size.width}px`, 
        height: `${size.height}px`,
        resize: 'both',
        minWidth: 200,
        minHeight: 120
      }}
      className={`fixed flex flex-col rounded-xl border border-green-500/35 dark:border-green-500/25 shadow-2xl z-50 backdrop-blur-xl overflow-hidden ${isDark ? 'bg-slate-950/70' : 'bg-white/70'}`}
      onMouseUp={(e) => {
        const target = e.currentTarget;
        if (target.offsetWidth !== size.width || target.offsetHeight !== size.height) {
          const newSize = { width: target.offsetWidth, height: target.offsetHeight };
          setSize(newSize);
          localStorage.setItem('packetCaptureSize', JSON.stringify(newSize));
        }
      }}
    >
      <div 
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className={`flex items-center justify-between px-3 py-2 border-b cursor-grab active:cursor-grabbing touch-none select-none ${isDark ? 'bg-slate-900/40 border-slate-800/40' : 'bg-slate-50/45 border-slate-100/50'}`}
      >
        <div className="flex flex-col gap-0.5 pointer-events-none">
          <div className="flex items-center gap-2">
            <div 
              className="w-2.5 h-2.5 rounded-full animate-pulse" 
              style={{ backgroundColor: cableColors[conn?.cableType || 'straight']?.primary || 'var(--color-primary-500)' }}
            />
            <span className="text-xs font-bold">{t.packetAnalysis}</span>
            <span className="text-[10px] opacity-50 font-mono">({connectionLabel})</span>
          </div>
          {hasError && (
            <span className="text-[9px] text-red-500 dark:text-red-400 font-medium pl-[18px]">
              ⚠️ {statusMessage}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => { e.stopPropagation(); clearCapturedPackets(activeCaptureConnectionId); }}
            className={`p-1 rounded hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors pointer-events-auto`}
            title={t.clearCapture}
          >
            <Trash2 className="w-3.5 h-3.5 text-red-500 pointer-events-none" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setActiveCaptureConnection(null); }}
            className="w-5 h-5 rounded-md bg-red-500 hover:bg-red-600 text-white transition-colors inline-flex items-center justify-center pointer-events-auto"
          >
            <X className="w-3 h-3 pointer-events-none" />
          </button>
        </div>
      </div>
      
      <div className="custom-scrollbar p-0 bg-transparent flex-1 overflow-auto w-full">
        <table className="w-full text-[10px] text-left border-collapse">
          <thead className={`sticky top-0 z-10 ${isDark ? 'bg-slate-950/80' : 'bg-slate-100/80'} backdrop-blur-sm`}>
            <tr>
              {columnOrder.map((col, idx) => renderHeader(col, idx))}
            </tr>
          </thead>
          <tbody>
            {capturedPacketsMap[activeCaptureConnectionId]?.length ? (
              [...capturedPacketsMap[activeCaptureConnectionId]].reverse().map((pkt: { id: string; timestamp: number; sourceIp: string; targetIp: string; protocol: string; info: string; }) => (
                <tr key={pkt.id} className={`border-b last:border-0 ${isDark ? 'border-slate-800/40 hover:bg-slate-800/35' : 'border-slate-100/30 hover:bg-slate-50/40'}`}>
                  {columnOrder.map(col => {
                    switch (col) {
                      case 'time': {
                        const date = new Date(pkt.timestamp);
                        const timeStr = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}:${String(date.getSeconds()).padStart(2, '0')}`;
                        return <td className="px-2 py-1 font-mono opacity-60 text-right" key="time">{timeStr}</td>;
                      }
                      case 'source':
                        return <td className="px-2 py-1 font-mono" key="source">{pkt.sourceIp}</td>;
                      case 'dest':
                        return <td className="px-2 py-1 font-mono" key="dest">{pkt.targetIp}</td>;
                      case 'proto':
                        return <td className={`px-2 py-1 font-bold ${pkt.protocol === 'ICMP' ? 'text-blue-500' : 'text-purple-500'}`} key="proto">{pkt.protocol}</td>;
                      case 'info':
                        return <td className="px-2 py-1 italic opacity-80" key="info">{pkt.info}</td>;
                      default:
                        return null;
                    }
                  })}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columnOrder.length} className="px-4 py-8 text-center opacity-40 italic">{t.noPacketsCaptured}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
