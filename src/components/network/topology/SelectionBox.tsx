'use client';

interface SelectionBoxProps {
  selectionBox: {
    start: { x: number; y: number };
    current: { x: number; y: number };
  } | null;
  isSelecting: boolean;
  _zoom: number;
  _isDark: boolean;
}

export function SelectionBox({ selectionBox, isSelecting, _zoom: _zoom, _isDark: _isDark }: SelectionBoxProps) {
  if (!isSelecting || !selectionBox) return null;

  const x = Math.min(selectionBox.start.x, selectionBox.current.x);
  const y = Math.min(selectionBox.start.y, selectionBox.current.y);
  const width = Math.abs(selectionBox.current.x - selectionBox.start.x);
  const height = Math.abs(selectionBox.current.y - selectionBox.start.y);

  return (
    <rect
      x={x}
      y={y}
      width={width}
      height={height}
      fill="rgba(6, 182, 212, 0.05)"
      stroke="var(--color-accent-500)"
      strokeWidth={1.5}
      strokeDasharray="4 3"
      className="pointer-events-none selection-box-path"
    />
  );
}
