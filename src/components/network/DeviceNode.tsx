import React, { memo } from 'react';
import { CanvasDevice } from './networkTopology.types';
import { areWifiConfigsEqual } from '@/lib/network/equality';

interface DeviceNodeProps {
  device: CanvasDevice;
  isSelected: boolean;
  isDragging: boolean;
  isDark: boolean;
  isActive?: boolean;
  iotUpdateTrigger?: number;
  onMouseDown: (e: React.MouseEvent<SVGGElement>, deviceId: string) => void;
  onPointerDown?: (e: React.PointerEvent<SVGGElement>, deviceId: string) => void;
  onClick: (e: React.MouseEvent<SVGGElement>, device: CanvasDevice) => void;
  onDoubleClick: (device: CanvasDevice) => void;
  onContextMenu: (e: React.MouseEvent<SVGGElement>, deviceId: string) => void;
  onMouseEnter?: (e: React.MouseEvent<SVGGElement>, deviceId: string) => void;
  onMouseLeave?: (e: React.MouseEvent<SVGGElement>, deviceId: string) => void;
  onTouchStart: (e: React.TouchEvent<SVGGElement>, deviceId: string) => void;
  onTouchMove: (e: React.TouchEvent<SVGGElement>) => void;
  onTouchEnd: (e: React.TouchEvent<SVGGElement>) => void;
  renderDeviceContent: (device: CanvasDevice, isDragging: boolean) => React.ReactNode;
}

export const DeviceNode = memo(function DeviceNode({
  device,
  isDragging,
  onMouseDown,
  onPointerDown,
  onClick,
  onDoubleClick,
  onContextMenu,
  onMouseEnter,
  onMouseLeave,
  onTouchStart,
  onTouchMove,
  onTouchEnd,
  renderDeviceContent
}: DeviceNodeProps) {
  return (
    <g
      role="button"
      tabIndex={0}
      data-device-id={device.id}
      aria-label={device.name}
      aria-describedby={`device-desc-${device.id}`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          // Simulate a click via the element itself for keyboard activation
          (e.currentTarget as SVGGElement).dispatchEvent(
            new MouseEvent('click', { bubbles: true, cancelable: true })
          );
        }
      }}
      onMouseDown={(e) => onMouseDown(e, device.id)}
      onPointerDown={(e) => {
        if (e.pointerType !== 'mouse') {
          onPointerDown?.(e, device.id);
        }
      }}
      onClick={(e) => onClick(e, device)}
      onDoubleClick={() => onDoubleClick(device)}
      onContextMenu={(e) => onContextMenu(e, device.id)}
      onMouseEnter={(e) => onMouseEnter?.(e, device.id)}
      onMouseLeave={(e) => onMouseLeave?.(e, device.id)}
      onTouchStart={(e) => {
        if (typeof window !== 'undefined' && 'PointerEvent' in window) {
          e.preventDefault();
          e.stopPropagation();
          return;
        }
        onTouchStart(e, device.id);
      }}
      onTouchMove={(e) => {
        if (typeof window !== 'undefined' && 'PointerEvent' in window) {
          e.preventDefault();
          e.stopPropagation();
          return;
        }
        onTouchMove(e);
      }}
      onTouchEnd={(e) => {
        if (typeof window !== 'undefined' && 'PointerEvent' in window) {
          e.preventDefault();
          e.stopPropagation();
          return;
        }
        onTouchEnd(e);
      }}
      style={{ cursor: isDragging ? 'grabbing' : 'grab', touchAction: 'none', outline: 'none' }}
    >
      {/* Invisible touch target area for better mobile interaction */}
      <rect
        x={-30}
        y={-30}
        width={100}
        height={100}
        fill="transparent"
        pointerEvents="all"
        style={{ touchAction: 'none' }}
      />
      {renderDeviceContent(device, isDragging)}
      <desc id={`device-desc-${device.id}`}>
        {`Status: ${device.status}, IP: ${device.ip || 'Not assigned'}`}
      </desc>
    </g>
  );
}, (prevProps, nextProps) => {
  // Cihaz konumu, adı, durumu, IP değişmişse re-render et
  if (
    prevProps.device.x !== nextProps.device.x ||
    prevProps.device.y !== nextProps.device.y ||
    prevProps.device.name !== nextProps.device.name ||
    prevProps.device.status !== nextProps.device.status ||
    prevProps.device.ip !== nextProps.device.ip
  ) {
    return false; // Re-render et
  }

  // WiFi config değişmişse re-render et
  // BOLT: Use fast specialized comparison instead of JSON.stringify
  if (!areWifiConfigsEqual(prevProps.device.wifi, nextProps.device.wifi)) {
    return false;
  }

  // Port sayısı değişmişse re-render et
  if (prevProps.device.ports.length !== nextProps.device.ports.length) {
    return false; // Re-render et
  }

  // Port durumu veya shutdown state değişmişse re-render et
  for (let i = 0; i < prevProps.device.ports.length; i++) {
    if (
      prevProps.device.ports[i].status !== nextProps.device.ports[i].status ||
      prevProps.device.ports[i].shutdown !== nextProps.device.ports[i].shutdown
    ) {
      return false; // Re-render et
    }
  }

  // UI state değişmişse re-render et
  if (
    prevProps.isSelected !== nextProps.isSelected ||
    prevProps.isActive !== nextProps.isActive ||
    prevProps.isDragging !== nextProps.isDragging ||
    prevProps.isDark !== nextProps.isDark
  ) {
    return false; // Re-render et
  }

  // IoT update trigger değişmişse re-render et (for continuous measurement updates)
  // BOLT: Only re-render on trigger if device is actually an IoT device
  if (nextProps.device.type === 'iot' && prevProps.iotUpdateTrigger !== nextProps.iotUpdateTrigger) {
    return false; // Re-render et
  }

  // Hiçbir şey değişmemişse re-render etme
  return true;
});
