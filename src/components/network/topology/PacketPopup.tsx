'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { X } from 'lucide-react';
import type { HopPacketInfo } from '../PingPacketInfoPanel';

interface PacketPopupProps {
  hopIndex: number;
  info: HopPacketInfo;
  language: 'tr' | 'en';
  onClose: () => void;
  isDark: boolean;
}

export function PacketPopup({ hopIndex, info, language, onClose, isDark }: PacketPopupProps) {
  const HEADER_SAFE_TOP = 72;
  const [pos, setPos] = useState<{ x: number; y: number }>(() => {
    try {
      const saved = localStorage.getItem('draggable_position_packet-popup');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.x === 'number' && typeof parsed.y === 'number') {
          const vw = window.innerWidth;
          const vh = window.innerHeight;
          return {
            x: Math.max(0, Math.min(parsed.x, vw - 320)),
            y: Math.max(HEADER_SAFE_TOP, Math.min(parsed.y, vh - 200)),
          };
        }
      }
    } catch { }
    return typeof window !== 'undefined'
      ? { x: Math.max(16, (window.innerWidth - 320) / 2), y: Math.max(HEADER_SAFE_TOP, (window.innerHeight - 340) / 2) }
      : { x: 100, y: 100 };
  });
  const [dragging, setDragging] = useState(false);
  const dragRef = useRef<{ startX: number; startY: number; startPosX: number; startPosY: number } | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const clamp = (x: number, y: number) => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    return {
      x: Math.max(0, Math.min(x, vw - 320)),
      y: Math.max(HEADER_SAFE_TOP, Math.min(y, vh - 200)),
    };
  };

  const handleDragStart = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (target.closest('button')) return;
    e.preventDefault();
    e.stopPropagation();

    containerRef.current?.setPointerCapture(e.pointerId);
    dragRef.current = { startX: e.clientX, startY: e.clientY, startPosX: pos.x, startPosY: pos.y };
    if (containerRef.current) {
      containerRef.current.style.cursor = 'grabbing';
      containerRef.current.style.transition = 'none';
      containerRef.current.style.willChange = 'transform';
    }
    document.body.style.userSelect = 'none';
    setDragging(true);
  }, [pos]);

  useEffect(() => {
    if (!dragging) return;
    const handleMove = (ev: PointerEvent) => {
      if (!dragRef.current) return;
      const dx = ev.clientX - dragRef.current.startX;
      const dy = ev.clientY - dragRef.current.startY;
      if (containerRef.current) {
        containerRef.current.style.transform = `translate3d(${dx}px, ${dy}px, 0)`;
      }
    };

    const handleUp = () => {
      if (dragRef.current && containerRef.current) {
        const matchX = containerRef.current.style.transform.match(/translate3d\(([-\d.]+)px/);
        const matchY = containerRef.current.style.transform.match(/, ([-\d.]+)px/);
        const dx = parseFloat(matchX ? matchX[1] : '0');
        const dy = parseFloat(matchY ? matchY[1] : '0');
        const finalX = dragRef.current.startPosX + (isFinite(dx) ? dx : 0);
        const finalY = dragRef.current.startPosY + (isFinite(dy) ? dy : 0);
        const clamped = clamp(finalX, finalY);
        setPos(clamped);

        containerRef.current.style.transition = 'transform 0.15s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
        containerRef.current.style.transform = `translate3d(0, 0, 0)`;

        setTimeout(() => {
          if (containerRef.current) {
            containerRef.current.style.transform = '';
            containerRef.current.style.transition = '';
            containerRef.current.style.willChange = '';
            containerRef.current.style.cursor = '';
          }
        }, 150);
      }
      dragRef.current = null;
      document.body.style.userSelect = '';
      setDragging(false);
    };

    window.addEventListener('pointermove', handleMove, { passive: true });
    window.addEventListener('pointerup', handleUp);
    window.addEventListener('pointercancel', handleUp);

    return () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
      window.removeEventListener('pointercancel', handleUp);
    };
  }, [dragging]);

  useEffect(() => {
    try { localStorage.setItem('draggable_position_packet-popup', JSON.stringify(pos)); } catch { }
  }, [pos]);

  const p = info;
  return (
    <div
      ref={containerRef}
      style={{ position: 'fixed', left: pos.x, top: pos.y, zIndex: 9999 }}
      onClick={e => e.stopPropagation()}
    >
      <div className={`rounded-xl border w-80 backdrop-blur-md ${isDark ? 'bg-zinc-950/40 border-zinc-800/50 shadow-black/40' : 'bg-white/40 border-zinc-200/50 shadow-zinc-200/50'}`}>
        <div
          className={`flex items-center justify-between px-3 py-2 border-b cursor-grab active:cursor-grabbing select-none ${isDark ? 'bg-white/5 border-white/10' : 'bg-black/5 border-black/10'}`}
          onPointerDown={handleDragStart}
        >
          <h3 className={`font-semibold text-sm ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>
            {language === 'tr' ? `Paket İçeriği — Hop ${hopIndex + 1}` : `Packet Contents — Hop ${hopIndex + 1}`}
          </h3>
          <button
            onClick={onClose}
            className="w-5 h-5 rounded-md bg-red-500 hover:bg-red-600 cursor-pointer transition-colors inline-flex items-center justify-center shrink-0"
          >
            <X className="w-3 h-3 text-white pointer-events-none" />
          </button>
        </div>
        <div className={`px-4 py-3 space-y-2 text-xs font-mono pointer-events-none ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
          <div><span className={isDark ? 'text-slate-400' : 'text-slate-500'}>L2:</span> {p.layer2}</div>
          <div><span className={isDark ? 'text-slate-400' : 'text-slate-500'}>L3:</span> {p.layer3}</div>
          <div><span className={isDark ? 'text-slate-400' : 'text-slate-500'}>L4:</span> {p.layer4}</div>
          <div className={`border-t pt-2 mt-2 ${isDark ? 'border-white/10' : 'border-black/10'}`} />
          <div><span className={isDark ? 'text-slate-400' : 'text-slate-500'}>{language === 'tr' ? 'Kaynak IP' : 'Src IP'}:</span> {p.srcIp}</div>
          <div><span className={isDark ? 'text-slate-400' : 'text-slate-500'}>{language === 'tr' ? 'Hedef IP' : 'Dst IP'}:</span> {p.dstIp}</div>
          <div><span className={isDark ? 'text-slate-400' : 'text-slate-500'}>TTL:</span> {p.ttl}</div>
          <div><span className={isDark ? 'text-slate-400' : 'text-slate-500'}>MAC (Src):</span> {p.srcMac}</div>
          <div><span className={isDark ? 'text-slate-400' : 'text-slate-500'}>MAC (Dst):</span> {p.dstMac}</div>
          <div><span className={isDark ? 'text-slate-400' : 'text-slate-500'}>ICMP:</span> {p.icmpType} (Seq: {p.icmpSeq})</div>
        </div>
      </div>
    </div>
  );
}
