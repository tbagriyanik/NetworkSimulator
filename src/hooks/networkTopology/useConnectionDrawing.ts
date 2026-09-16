'use client';

import type { CableInfo, CableType } from '@/lib/network/types';

interface ConnectionDrawingProps {
  setIsDrawingConnection: (val: boolean) => void;
  setConnectionStart: (start: { deviceId: string; portId: string; point: { x: number; y: number } } | null) => void;
  setMobileConnectionSource?: (val: string | null) => void;
  isDrawingConnectionRef: React.MutableRefObject<boolean>;
  connectionStartRef: React.MutableRefObject<{ deviceId: string; portId: string; point: { x: number; y: number } } | null>;
  onCableChange?: (cable: CableInfo) => void;
  cableInfo?: CableInfo;
  previousCableTypeRef?: React.MutableRefObject<CableType | null>;
}

export function useConnectionDrawing({
  setIsDrawingConnection,
  setConnectionStart,
  setMobileConnectionSource,
  isDrawingConnectionRef,
  connectionStartRef,
  onCableChange,
  cableInfo,
  previousCableTypeRef,
}: ConnectionDrawingProps) {
  const cancelConnectionDrawing = () => {
    if (previousCableTypeRef?.current && onCableChange && cableInfo) {
      onCableChange({
        ...cableInfo,
        cableType: previousCableTypeRef.current,
      });
      previousCableTypeRef.current = null;
    }
    isDrawingConnectionRef.current = false;
    connectionStartRef.current = null;
    setIsDrawingConnection(false);
    setConnectionStart(null);
    if (setMobileConnectionSource) {
      setMobileConnectionSource(null);
    }
  };

  return {
    cancelConnectionDrawing
  };
}

