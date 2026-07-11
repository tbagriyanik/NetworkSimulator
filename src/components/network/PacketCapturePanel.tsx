import React from 'react';
import { Trash2 } from 'lucide-react';
import { useAppStore } from '@/lib/store/appStore';
import { useLanguage } from '@/contexts/LanguageContext';
import { CABLE_COLORS } from './networkTopology.constants';
import { getConnectionStatusMessage } from './networkTopology.helpers';
import { DraggableWindowWrapper } from './DraggableWindowWrapper';
import { useDrag } from '@/hooks/useDrag';

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
  
  const dragProps = useDrag({
    storageKey: 'packetCapture',
    defaultPosition: typeof window !== 'undefined' ? { x: Math.max(16, window.innerWidth - 420), y: window.innerHeight - 340 } : { x: 0, y: 0 },
    defaultSize: { width: 384, height: 260 },
    minSize: { width: 200, height: 120 },
    mode: 'drag-resize'
  });

  const onDragStart = (e: React.DragEvent, idx: number) => { e.dataTransfer.setData('text/plain', idx.toString()); };
  const onDrop = (e: React.DragEvent, targetIdx: number) => {
    const sourceIdx = parseInt(e.dataTransfer.getData('text/plain'), 10);
    if (sourceIdx === targetIdx || isNaN(sourceIdx)) return;
    const newOrder = [...columnOrder];
    const [moved] = newOrder.splice(sourceIdx, 1);
    newOrder.splice(targetIdx, 0, moved);
    setColumnOrder(newOrder);
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
        className="px-2 py-1 border-b dark:border-secondary-700 cursor-grab active:cursor-grabbing hover:bg-secondary-200 dark:hover:bg-secondary-700 transition-colors select-none text-center"
      >
        {labelMap[col] || col}
      </th>
    );
  };

  const cableColors = CABLE_COLORS as Record<string, { primary: string; bg: string; text: string; border: string }>;

  return (
    <DraggableWindowWrapper
      id="packetCapture"
      className={`liquid-glass-light ${isDark ? '!bg-secondary-950/40 border-emerald-950/80 shadow-[0_8px_32px_0_rgba(0,0,0,0.5)]' : '!bg-white/60 border-emerald-950/80 shadow-[0_8px_28px_rgba(15,23,42,0.12)]'}`}
      title={
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
            <span className="text-[9px] text-error-500 dark:text-error-400 font-medium pl-[18px]">
              ⚠️ {statusMessage}
            </span>
          )}
        </div>
      }
      isOpen={!!activeCaptureConnectionId}
      onClose={() => setActiveCaptureConnection(null)}
      isDark={isDark}
      modalPosition={dragProps.position}
      modalSize={dragProps.size}
      handlePointerDown={dragProps.handlePointerDown}
      handleResizeStart={dragProps.handleResizeStart}
      mobileFullScreen={false}
      headerActions={
        <button
          onClick={(e) => { e.stopPropagation(); clearCapturedPackets(activeCaptureConnectionId); }}
          className="p-1.5 rounded transition-colors flex items-center justify-center hover:bg-secondary-200 dark:hover:bg-secondary-700"
          title={t.clearCapture}
          onPointerDown={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <Trash2 className="w-4 h-4 text-error-500" />
        </button>
      }
    >
      <div className="flex-1 flex flex-col min-h-0 relative">
        <div className="custom-scrollbar p-0 bg-transparent flex-1 overflow-auto w-full">
          <table className="w-full text-[10px] text-left border-collapse">
            <thead className={`sticky top-0 z-10 ${isDark ? 'bg-secondary-950/80' : 'bg-secondary-100/80'} backdrop-blur-sm`}>
              <tr>
                {columnOrder.map((col, idx) => renderHeader(col, idx))}
              </tr>
            </thead>
            <tbody>
              {capturedPacketsMap[activeCaptureConnectionId]?.length ? (
                [...capturedPacketsMap[activeCaptureConnectionId]].reverse().map((pkt: { id: string; timestamp: number; sourceIp: string; targetIp: string; protocol: string; info: string; }) => (
                  <tr key={pkt.id} className={`border-b last:border-0 ${isDark ? 'border-secondary-800/40 hover:bg-secondary-800/35' : 'border-secondary-100/30 hover:bg-secondary-50/40'}`}>
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
                          return <td className={`px-2 py-1 font-bold ${pkt.protocol === 'ICMP' ? 'text-primary-500' : 'text-purple-500'}`} key="proto">{pkt.protocol}</td>;
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
    </DraggableWindowWrapper>
  );
};
