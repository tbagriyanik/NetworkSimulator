'use client';

interface ConnectionDrawingProps {
  setIsDrawingConnection: (val: boolean) => void;
  setConnectionStart: (start: { deviceId: string; portId: string; point: { x: number; y: number } } | null) => void;
  setMobileConnectionSource?: (val: string | null) => void;
  isDrawingConnectionRef: React.MutableRefObject<boolean>;
  connectionStartRef: React.MutableRefObject<{ deviceId: string; portId: string; point: { x: number; y: number } } | null>;
}

export function useConnectionDrawing({
  setIsDrawingConnection,
  setConnectionStart,
  setMobileConnectionSource,
  isDrawingConnectionRef,
  connectionStartRef
}: ConnectionDrawingProps) {
  const cancelConnectionDrawing = () => {
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
