'use client';

interface DeviceFocusPulseProps {
  deviceWidth: number;
  deviceHeight: number;
  visible: boolean;
}

export function DeviceFocusPulse({ deviceWidth, deviceHeight, visible }: DeviceFocusPulseProps) {
  return (
    <g pointerEvents="none">
      <circle
        cx={deviceWidth / 2}
        cy={deviceHeight / 2}
        r={Math.max(deviceWidth, deviceHeight) * 0.75}
        fill="none"
        stroke="var(--color-purple-500, currentColor)"
        strokeWidth="3"
        className="transition-opacity duration-500 ease-out"
        opacity={visible ? 0.85 : 0}
      />
    </g>
  );
}