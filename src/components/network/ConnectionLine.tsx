import { memo } from 'react';
import { CanvasConnection, CanvasDevice } from './networkTopology.types';
import { isCableCompatible, CableInfo } from '@/lib/network/types';


interface ConnectionLineProps {
  connection: CanvasConnection;
  sourceDevice: CanvasDevice;
  targetDevice: CanvasDevice;
  isDark: boolean;
  isDragging?: boolean;
  totalSameConns: number;
  sameConnIndex: number;
  getPortPosition: (device: CanvasDevice, portId: string) => { x: number; y: number };
  CABLE_COLORS: Record<string, { primary: string; bg: string; text: string; border: string }>;
  isHovered?: boolean;
  onMouseEnter?: (e: React.MouseEvent<SVGPathElement>) => void;
  onMouseLeave?: () => void;
  showAnimation?: boolean;
  showLabel?: boolean;
  zoom?: number;
  graphicsQuality?: 'high' | 'low';
}

export const ConnectionLine = memo(function ConnectionLine({
  connection,
  sourceDevice,
  targetDevice,
  isDark,
  isDragging = false,
  totalSameConns,
  sameConnIndex,
  getPortPosition,
  CABLE_COLORS,
  isHovered = false,
  onMouseEnter,
  onMouseLeave,
  showAnimation = true,
  showLabel = true,
  zoom = 1, // Default zoom level
  graphicsQuality = 'high'
}: ConnectionLineProps) {
  // Get port positions for more accurate connection lines
  const source = getPortPosition(sourceDevice, connection.sourcePort);
  const target = getPortPosition(targetDevice, connection.targetPort);

  // Check cable compatibility - use pink color for incompatible cables
  const cableInfoForConnection = {
    connected: true,
    cableType: connection.cableType,
    sourceDevice: sourceDevice.type,
    targetDevice: targetDevice.type,
    sourcePort: connection.sourcePort,
    targetPort: connection.targetPort,
  };

  // Cast to specific types to satisfy TS if needed, but the logic is sound
  const isCompatible = isCableCompatible(cableInfoForConnection as CableInfo);

  // Check if either port is shutdown
  const sourcePort = sourceDevice.ports.find(p => p.id === connection.sourcePort);
  const targetPort = targetDevice.ports.find(p => p.id === connection.targetPort);
  const isShutdown = sourcePort?.shutdown || targetPort?.shutdown;

  // Check if either port is in STP blocking state
  const isSTPBlocking = sourcePort?.spanningTree?.state === 'blocking' || targetPort?.spanningTree?.state === 'blocking';

  // Determine device VLAN - only apply STP blocking color for VLAN 1
  const sourceVlan = sourceDevice.vlan || 1;
  const targetVlan = targetDevice.vlan || 1;
  const isVlan1 = sourceVlan === 1 && targetVlan === 1;

  const isPoweredOff = sourceDevice.status === 'offline' || targetDevice.status === 'offline';
  const isEffectivelyActive = connection.active && isCompatible && !isShutdown && !isPoweredOff && !isSTPBlocking;
  const color = !isCompatible ? CABLE_COLORS.error.primary :
    isShutdown || (isSTPBlocking && isVlan1) ? (isDark ? '#475569' : '#94a3b8') : // Gray if shutdown or STP blocking (VLAN 1 only)
      isPoweredOff ? (isDark ? '#374151' : '#9ca3af') : // Gray if device offline
        CABLE_COLORS[connection.cableType].primary;

  // Calculate offset for parallel lines (spread out from center)
  const maxOffset = 20;
  const offset = totalSameConns > 1
    ? (sameConnIndex - (totalSameConns - 1) / 2) * (maxOffset / Math.max(totalSameConns - 1, 1))
    : 0;

  // Calculate control points for smooth curve with offset
  const midX = (source.x + target.x) / 2;

  // Apply perpendicular offset for parallel lines
  const dx = target.x - source.x;
  const dy = target.y - source.y;
  const len = Math.sqrt(dx * dx + dy * dy) || 1; const perpX = -dy / len * offset;
  const perpY = dx / len * offset;

  const controlPoint1 = {
    x: midX + perpX,
    y: source.y + perpY + Math.abs(offset) * 0.5
  };
  const controlPoint2 = {
    x: midX + perpX,
    y: target.y + perpY - Math.abs(offset) * 0.5
  };

  const isWireless = connection.cableType === 'wireless';

  // For wireless connections, generate a sinusoidal wave path
  const buildWavePath = (sx: number, sy: number, tx: number, ty: number) => {
    const dx = tx - sx;
    const dy = ty - sy;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    const ux = dx / len; // unit vector along line
    const uy = dy / len;
    const px = -uy;      // perpendicular unit vector
    const py = ux;

    const waveCount = Math.max(3, Math.round(len / 28)); // ~28px per arc
    const amplitude = 8;
    const points: string[] = [`M ${sx} ${sy}`];

    for (let i = 0; i < waveCount; i++) {
      const t1 = (i + 0.5) / waveCount;
      const t2 = (i + 1) / waveCount;

      const mx = sx + ux * len * t1 + px * amplitude * (i % 2 === 0 ? 1 : -1);
      const my = sy + uy * len * t1 + py * amplitude * (i % 2 === 0 ? 1 : -1);

      const ex = sx + ux * len * t2;
      const ey = sy + uy * len * t2;

      points.push(`Q ${mx} ${my} ${ex} ${ey}`);
    }
    return points.join(' ');
  };

  const pathD = isWireless
    ? buildWavePath(source.x, source.y, target.x, target.y)
    : `M ${source.x} ${source.y} C ${controlPoint1.x} ${controlPoint1.y}, ${controlPoint2.x} ${controlPoint2.y}, ${target.x} ${target.y}`;

  const reversePathD = isWireless
    ? buildWavePath(target.x, target.y, source.x, source.y)
    : `M ${target.x} ${target.y} C ${controlPoint2.x} ${controlPoint2.y}, ${controlPoint1.x} ${controlPoint1.y}, ${source.x} ${source.y}`;

  return (
    <g data-connection-id={connection.id}>
      {/* Invisible wider path for hover detection */}
      <path
        d={pathD}
        stroke="transparent"
        strokeWidth={12}
        fill="none"
        style={{ cursor: 'pointer' }}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      />

      {/* Visual Connection line */}
      <path
        d={pathD}
        stroke={isCompatible ? color : '#ef4444'}
        strokeWidth={isHovered ? 6 : 3}
        fill="none"
        strokeDasharray={isCompatible ? 'none' : '6,3'}
        className="pointer-events-none"
        vectorEffect="non-scaling-stroke"
        style={{
          opacity: isHovered ? 0.6 : 0.25,
          filter: isHovered || (graphicsQuality === 'high' && isEffectivelyActive) ?
            'drop-shadow(0 0 0.5px ' + color + ') drop-shadow(0 0 1px ' + color + ')' :
            'none',
          transition: 'all 0.2s ease'
        }}
      />

      {/* Ambient glow for active connections in high graphics mode */}
      {graphicsQuality === 'high' && isEffectivelyActive && !isHovered && (
        <path
          d={pathD}
          stroke={color}
          strokeWidth={0.4}
          fill="none"
          className="pointer-events-none"
          vectorEffect="non-scaling-stroke"
          style={{
            opacity: 0.004,
            filter: 'url(#connectionGlowFilter)',
          }}
        />
      )}

      {/* Animated data flow - only for compatible cables and NOT during dragging */}
      {showAnimation && isEffectivelyActive && !isDragging && (
        <>
          <circle r={Math.max(2, 4 / zoom)} fill={color} opacity={0.25}>
            <animateMotion
              dur="2s"
              repeatCount="indefinite"
              path={pathD}
            />
          </circle>
          <circle r={Math.max(2, 4 / zoom)} fill={color} opacity={0.25}>
            <animateMotion
              dur="2s"
              repeatCount="indefinite"
              begin="1s"
              path={reversePathD}
            />
          </circle>
        </>
      )}
      {/* Connection label - port names near device edges, shown only on hover */}
      {showLabel && (() => {
        const bezierPoint = (t: number) => {
          if (isWireless) {
            return { x: source.x + (target.x - source.x) * t, y: source.y + (target.y - source.y) * t };
          }
          const mt = 1 - t;
          return {
            x: mt*mt*mt*source.x + 3*mt*mt*t*controlPoint1.x + 3*mt*t*t*controlPoint2.x + t*t*t*target.x,
            y: mt*mt*mt*source.y + 3*mt*mt*t*controlPoint1.y + 3*mt*t*t*controlPoint2.y + t*t*t*target.y
          };
        };
        const srcPos = bezierPoint(0.42);
        const tgtPos = bezierPoint(0.58);
        const srcLabel = { x: srcPos.x + perpX, y: srcPos.y + perpY };
        const tgtLabel = { x: tgtPos.x + perpX, y: tgtPos.y + perpY };
        const labelOffsetY = -10;
        return (
          <>
            <text
              x={srcLabel.x}
              y={srcLabel.y + labelOffsetY}
              fill="none"
              stroke={isDark ? '#0f172a' : '#ffffff'}
              strokeWidth="1"
              vectorEffect="non-scaling-stroke"
              strokeLinejoin="round"
              fontSize="11"
              textAnchor="middle"
              className="pointer-events-none select-none"
              fontWeight="bold"
              opacity={isHovered ? 0.9 : 0.75}
            >
              {connection.sourcePort}
            </text>
            <text
              x={srcLabel.x}
              y={srcLabel.y + labelOffsetY}
              fill={color}
              fontSize="11"
              textAnchor="middle"
              className="pointer-events-none select-none"
              fontWeight="bold"
              opacity={isHovered ? 0.9 : 0.75}
            >
              {connection.sourcePort}
            </text>
            <text
              x={tgtLabel.x}
              y={tgtLabel.y + labelOffsetY}
              fill="none"
              stroke={isDark ? '#0f172a' : '#ffffff'}
              strokeWidth="1"
              vectorEffect="non-scaling-stroke"
              strokeLinejoin="round"
              fontSize="11"
              textAnchor="middle"
              className="pointer-events-none select-none"
              fontWeight="bold"
              opacity={isHovered ? 0.9 : 0.75}
            >
              {connection.targetPort}
            </text>
            <text
              x={tgtLabel.x}
              y={tgtLabel.y + labelOffsetY}
              fill={color}
              fontSize="11"
              textAnchor="middle"
              className="pointer-events-none select-none"
              fontWeight="bold"
              opacity={isHovered ? 0.9 : 0.75}
            >
              {connection.targetPort}
            </text>
          </>
        );
      })()}
    </g>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.connection.id === nextProps.connection.id &&
    prevProps.connection.active === nextProps.connection.active &&
    prevProps.sourceDevice.x === nextProps.sourceDevice.x &&
    prevProps.sourceDevice.y === nextProps.sourceDevice.y &&
    prevProps.targetDevice.x === nextProps.targetDevice.x &&
    prevProps.targetDevice.y === nextProps.targetDevice.y &&
    prevProps.sourceDevice.ports.find(p => p.id === prevProps.connection.sourcePort)?.shutdown ===
    nextProps.sourceDevice.ports.find(p => p.id === nextProps.connection.sourcePort)?.shutdown &&
    prevProps.targetDevice.ports.find(p => p.id === prevProps.connection.targetPort)?.shutdown ===
    nextProps.targetDevice.ports.find(p => p.id === nextProps.connection.targetPort)?.shutdown &&
    prevProps.sourceDevice.ports.find(p => p.id === prevProps.connection.sourcePort)?.spanningTree?.state ===
    nextProps.sourceDevice.ports.find(p => p.id === nextProps.connection.sourcePort)?.spanningTree?.state &&
    prevProps.targetDevice.ports.find(p => p.id === prevProps.connection.targetPort)?.spanningTree?.state ===
    nextProps.targetDevice.ports.find(p => p.id === nextProps.connection.targetPort)?.spanningTree?.state &&
    prevProps.sourceDevice.status === nextProps.sourceDevice.status &&
    prevProps.targetDevice.status === nextProps.targetDevice.status &&
    prevProps.totalSameConns === nextProps.totalSameConns &&
    prevProps.sameConnIndex === nextProps.sameConnIndex &&
    prevProps.isDark === nextProps.isDark &&
    prevProps.isDragging === nextProps.isDragging &&
    prevProps.isHovered === nextProps.isHovered &&
    prevProps.showAnimation === nextProps.showAnimation &&
    prevProps.showLabel === nextProps.showLabel &&
    prevProps.zoom === nextProps.zoom
  );
});
