'use client';

import { X, Trash2 } from 'lucide-react';
import { TooltipWrapper } from '@/components/ui/TooltipWrapper';
import { logger } from '@/lib/logger';
import type { CanvasDevice } from '../networkTopology.types';

interface SelectionToolbarProps {
  selectedDeviceIds: string[];
  setSelectedDeviceIds: (ids: string[]) => void;
  deviceMap: Map<string, CanvasDevice>;
  onDeviceSelect: (deviceType: string, deviceId: string, switchModel?: string, deviceName?: string) => void;
  deleteDevice: (deviceId: string) => void;
  handleAlign: (type: 'top' | 'bottom' | 'left' | 'right' | 'h-center' | 'v-center') => void;
  saveToHistory: () => void;
  isDark: boolean;
  t: Record<string, string>;
}

export function SelectionToolbar({
  selectedDeviceIds,
  setSelectedDeviceIds,
  deviceMap,
  onDeviceSelect,
  deleteDevice,
  handleAlign,
  saveToHistory,
  isDark,
  t
}: SelectionToolbarProps) {
  if (selectedDeviceIds.length <= 1) return null;

  return (
    <div
      style={{
        position: 'absolute',
        top: '8px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 1000,
        pointerEvents: 'auto'
      }}
      className={`px-3 py-1.5 rounded-xl shadow-2xl flex items-center gap-2 selection-toolbar panel-ambient-glow ${
        isDark ? 'bg-slate-800/95 text-white border border-slate-700' : 'bg-white text-slate-900 border border-slate-200'
      } backdrop-blur-md`}
      onClick={(e) => {
        e.stopPropagation();
        logger.debug('[Toolbar] Container clicked');
      }}
      onMouseDown={(e) => {
        e.stopPropagation();
      }}
      onMouseUp={(e) => {
        e.stopPropagation();
      }}
    >
      <TooltipWrapper title={t.alignLeft}>
        <button
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            logger.debug('[Toolbar] Align left clicked');
            handleAlign('left');
          }}
          className={`p-1.5 rounded-lg transition-colors ${
            isDark ? 'hover:bg-slate-700 text-slate-300' : 'hover:bg-slate-100 text-slate-600'
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 2v20M8 5h10M8 11h7M8 17h12" />
          </svg>
        </button>
      </TooltipWrapper>
      <TooltipWrapper title={t.alignTop}>
        <button
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            logger.debug('[Toolbar] Align top clicked');
            handleAlign('top');
          }}
          className={`p-1.5 rounded-lg transition-colors ${
            isDark ? 'hover:bg-slate-700 text-slate-300' : 'hover:bg-slate-100 text-slate-600'
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2 4h20M5 8v10M11 8v7M17 8v12" />
          </svg>
        </button>
      </TooltipWrapper>
      <div className="w-px h-4 bg-slate-700/30 mx-1" />
      <span className="text-xs font-semibold whitespace-nowrap bg-slate-700/30 px-2 py-0.5 rounded">
        {selectedDeviceIds.length}
      </span>
      <TooltipWrapper title={t.cancel}>
        <button
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            logger.debug('[Toolbar] Cancel clicked');
            const firstId = selectedDeviceIds[0];
            const firstDevice = deviceMap.get(firstId);
            setSelectedDeviceIds(firstId ? [firstId] : []);
            if (firstDevice) {
              onDeviceSelect(
                firstDevice.type === 'router' ? 'router' : firstDevice.type,
                firstId,
                undefined,
                firstDevice.name
              );
            }
          }}
          className={`p-1.5 rounded-lg transition-colors ${
            isDark ? 'hover:bg-slate-700 text-slate-200' : 'hover:bg-slate-100 text-slate-600'
          }`}
        >
          <X className="w-4 h-4" />
        </button>
      </TooltipWrapper>
      <TooltipWrapper title={t.delete}>
        <button
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            logger.debug('[Toolbar] Delete clicked');
            saveToHistory();
            selectedDeviceIds.forEach(id => deleteDevice(id));
            setSelectedDeviceIds([]);
          }}
          className="p-1.5 rounded-lg hover:bg-red-500/20 text-red-500 transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </TooltipWrapper>
    </div>
  );
}
