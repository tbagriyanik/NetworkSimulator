'use client';

interface DeviceFocusPulseProps {
  deviceWidth: number;
  deviceHeight: number;
  visible: boolean;
}

export function DeviceFocusPulse({ deviceWidth, deviceHeight, visible }: DeviceFocusPulseProps) {
  if (!visible) return null;
  return (
    <g pointerEvents="none">
      <circle
        cx={deviceWidth / 2}
        cy={deviceHeight / 2}
        r={Math.max(deviceWidth, deviceHeight) * 0.75}
        fill="none"
        stroke="var(--color-purple-500, currentColor)"
        strokeWidth="3"
        opacity="0.85"
        className="animate-ping"
      />
      <circle
        cx={deviceWidth / 2}
        cy={deviceHeight / 2}
        r={Math.max(deviceWidth, deviceHeight) * 0.9}
        fill="none"
        stroke="var(--color-cyan-500, currentColor)"
        strokeWidth="2"
        strokeDasharray="6 3"
        opacity="0.9"
        className="animate-spin"
        style={{ transformOrigin: `${deviceWidth / 2}px ${deviceHeight / 2}px`, animationDuration: '4s' }}
      />
    </g>
  );
}