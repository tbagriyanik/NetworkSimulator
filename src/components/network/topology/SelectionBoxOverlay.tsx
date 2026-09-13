import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { colors, withAlpha } from '@/lib/design-tokens/colors';

export interface SelectionBoxOverlayProps {
  selectionBox: { start: { x: number; y: number }; current: { x: number; y: number } };
  isDark: boolean;
  zoom: number;
  selectedDeviceCount: number;
}

export const SelectionBoxOverlay: React.FC<SelectionBoxOverlayProps> = ({
  selectionBox,
  isDark,
  zoom,
  selectedDeviceCount,
}) => {
  const { language } = useLanguage();
  const deviceLabel = language === 'tr' ? 'Cihaz' : (selectedDeviceCount === 1 ? 'device' : 'devices');

  return (
    <>
      <rect
        id="selection-rectangle"
        x={Math.min(selectionBox.start.x, selectionBox.current.x)}
        y={Math.min(selectionBox.start.y, selectionBox.current.y)}
        width={Math.abs(selectionBox.current.x - selectionBox.start.x)}
        height={Math.abs(selectionBox.current.y - selectionBox.start.y)}
        fill="var(--color-success-500)"
        fillOpacity={isDark ? 0.2 : 0.15}
        stroke="var(--color-success-500)"
        strokeOpacity={isDark ? 1 : 0.9}
        strokeWidth={2 / zoom}
        strokeDasharray={`${6 / zoom}, ${6 / zoom}`}
        pointerEvents="none"
      />
      {selectedDeviceCount > 0 && (
        <text
          id="selection-counter"
          x={Math.min(selectionBox.start.x, selectionBox.current.x) + 10}
          y={Math.min(selectionBox.start.y, selectionBox.current.y) - 10}
          fill={isDark ? 'var(--color-success-400)' : 'var(--color-success-600)'}
          fontSize={14 / zoom}
          fontWeight="bold"
          pointerEvents="none"
          style={{ textShadow: isDark ? `0 0 4px ${withAlpha(colors.common.black, 0.8)}` : `0 0 4px ${withAlpha(colors.common.white, 0.8)}` }}
        >
          {selectedDeviceCount} {deviceLabel}
        </text>
      )}
    </>
  );
};
