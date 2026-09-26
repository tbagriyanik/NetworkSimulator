import { colors } from '@/lib/design-tokens';
import { getWirelessSignalStrength } from '@/lib/network/connectivity';
import { memo } from 'react';
import { CanvasConnection, CanvasDevice } from './NetworkTopology/types/networkTopology.types';
import { SwitchState } from '@/lib/network/types';
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
  CABLE_COLORS: Record<string, { primary: string; bg: string; text: string; border: string; error?: { primary: string; bg: string; text: string; border: string } }>;
  isHovered?: boolean;
  onMouseEnter?: (e: React.MouseEvent<SVGPathElement>) => void;
  onMouseLeave?: () => void;
  onClick?: (e: React.MouseEvent) => void;
  showAnimation?: boolean;
  showLabel?: boolean;
  zoom?: number;
  graphicsQuality?: 'high' | 'low';
  deviceStates?: Map<string, SwitchState>;
  topologyDevices?: CanvasDevice[];
  isPathHighlighted?: boolean;
}

/**
 * BOLT OPTIMIZATION:
 * Extracts derived STP blocking/alternate states for a specific device's port.
 * Allows comparing actual status changes rather than Map reference equality in the custom memo comparator.
 */
const getPortSTPBlocking = (
  deviceStates: Map<string, SwitchState> | undefined,
  device: CanvasDevice,
  portId: string
): boolean => {
  const port = device.ports.find(p => p.id === portId);
  let isBlocking = port?.spanningTree?.state === 'blocking';

  if (deviceStates) {
    const dState = deviceStates.get(device.id);
    if (dState && dState.ports && dState.ports[portId]) {
      const sp = dState.ports[portId];
      isBlocking = sp.spanningTree?.state === 'blocking' || sp.spanningTree?.role === 'alternate';
    }
  }
  return isBlocking;
};

/**
 * BOLT OPTIMIZATION:
 * Builds a comparable key from the wifi-relevant state of a device's wlan0 port
 * (shutdown/status/config) so the memo comparator re-renders the link when the
 * runtime/matching status that drives signal strength changes.
 */
const getWlan0SignalKey = (
  deviceStates: Map<string, SwitchState> | undefined,
  device: CanvasDevice
): string => {
  const wlan = deviceStates?.get(device.id)?.ports?.['wlan0'];
  if (!wlan) return 'none';
  return [
    wlan.shutdown ?? false,
    wlan.status ?? '',
    wlan.wifi?.mode ?? '',
    wlan.wifi?.ssid ?? '',
    wlan.wifi?.security ?? '',
    wlan.wifi?.password ?? '',
    wlan.wifi?.channel ?? '',
  ].map(String).join('|');
};

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
  onClick,
  showAnimation = true,
  showLabel = true,
  zoom = 1, // Default zoom level
  graphicsQuality = 'high',
  deviceStates,
  topologyDevices,
  isPathHighlighted = false,
}: ConnectionLineProps) {
  // Get port positions for more accurate connection lines
  const source = getPortPosition(sourceDevice, connection.sourcePort);
  const target = getPortPosition(targetDevice, connection.targetPort);

  // Check cable compatibility - use pink color for incompatible cables
  const cableInfoForConnection: CableInfo = {
    connected: true,
    cableType: connection.cableType,
    sourceDevice: sourceDevice.type,
    targetDevice: targetDevice.type,
    sourcePort: connection.sourcePort,
    targetPort: connection.targetPort,
  };

  const isCompatible = isCableCompatible(cableInfoForConnection);

  // Check if either port is shutdown
  const sourcePort = sourceDevice.ports.find(p => p.id === connection.sourcePort);
  const targetPort = targetDevice.ports.find(p => p.id === connection.targetPort);
  // Wireless links represent an association, not a physical cable port.
  // The wlan0 placeholder may remain shutdown on clients, and WLCs may not
  // expose a wlan0 port at all; neither should make an active link gray.
  const isShutdown = connection.cableType === 'wireless'
    ? false
    : sourcePort?.shutdown || targetPort?.shutdown;

  // BOLT: Use helper function to resolve actual STP blocking state
  const sourceSTPBlocking = getPortSTPBlocking(deviceStates, sourceDevice, connection.sourcePort);
  const targetSTPBlocking = getPortSTPBlocking(deviceStates, targetDevice, connection.targetPort);
  const isSTPBlocking = sourceSTPBlocking || targetSTPBlocking;

  // Determine device VLAN - only apply STP blocking color for VLAN 1
  const sourceVlan = sourceDevice.vlan || 1;
  const targetVlan = targetDevice.vlan || 1;
  const isVlan1 = sourceVlan === 1 && targetVlan === 1;

  const isPoweredOff = sourceDevice.status === 'offline' || targetDevice.status === 'offline';
  const isEffectivelyActive = connection.active && isCompatible && !isShutdown && !isPoweredOff && !isSTPBlocking;

  const isWireless = connection.cableType === 'wireless';
  const wirelessSsidColors = [
    ...colors.wirelessSsid,
  ];
  const activeWirelessColor = isWireless && typeof connection.ssidIndex === 'number'
    ? wirelessSsidColors[connection.ssidIndex % wirelessSsidColors.length]
    : (CABLE_COLORS.wireless?.primary || colors.wirelessSsid[0]);
  // Compute signal strength for wireless connections to sync cable visual with device Wi-Fi status.
  // DeviceRenderer evaluates the client against ALL topology devices (nearest matching AP), so the
  // drawn link must use the same inputs — otherwise the cable and the device bars disagree. Both ends
  // are probed because a wireless cable can be drawn in either direction (client→AP or AP→client).
  let wirelessStrength: number | undefined;
  if (isWireless) {
    const signalDevices = topologyDevices ?? [targetDevice];
    const sourceStrength = getWirelessSignalStrength(sourceDevice, signalDevices, deviceStates);
    wirelessStrength = sourceStrength > 0
      ? sourceStrength
      : getWirelessSignalStrength(targetDevice, signalDevices, deviceStates);
  }

  let baseColor = !isCompatible || connection.active === false ? CABLE_COLORS.error.primary :
    isShutdown || (isSTPBlocking && isVlan1) ? (isDark ? 'var(--color-secondary-400)' : 'var(--color-secondary-400)') :
      isPoweredOff ? (isDark ? 'var(--color-secondary-400)' : 'var(--color-secondary-400)') :
        (isWireless ? activeWirelessColor : CABLE_COLORS[connection.cableType].primary);
  // Override color for wireless connections with zero strength
  if (isWireless && wirelessStrength === 0) {
    baseColor = CABLE_COLORS.wireless?.error?.primary || 'var(--color-warning-500)';
  }
  const color = baseColor;

  // Apply perpendicular offset for parallel lines
  const dx = target.x - source.x;
  const dy = target.y - source.y;
  const len = Math.sqrt(dx * dx + dy * dy) || 1;

  // Calculate offset for parallel lines (spread out smoothly from center)
  // Give distinct, graceful arch curvature when 2 or more cables connect the same pair of devices
  const baseSpacing = Math.min(36, Math.max(24, len * 0.12));
  const offset = totalSameConns > 1
    ? (sameConnIndex - (totalSameConns - 1) / 2) * baseSpacing
    : 0;

  // Calculate control points for smooth natural curve with perpendicular offset
  const midX = (source.x + target.x) / 2;
  const midY = (source.y + target.y) / 2;

  const perpX = (-dy / len) * offset;
  const perpY = (dx / len) * offset;

  // Curvature bowing: control points arc outward around the midpoint
  const controlPoint1 = {
    x: source.x + (dx * 0.28) + perpX * 1.15,
    y: source.y + (dy * 0.28) + perpY * 1.15,
  };
  const controlPoint2 = {
    x: target.x - (dx * 0.28) + perpX * 1.15,
    y: target.y - (dy * 0.28) + perpY * 1.15,
  };

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

  // Use the actual rendered SVG paths as the motion path. This keeps the
  // animated dots on every crest and trough of the wireless wave instead of
  // letting the browser approximate a separate straight route.
  const motionPathId = `connection-motion-${connection.id.replace(/[^a-zA-Z0-9_-]/g, '-')}`;
  const reverseMotionPathId = `${motionPathId}-reverse`;

  const reversePathD = isWireless
    ? buildWavePath(target.x, target.y, source.x, source.y)
    : `M ${target.x} ${target.y} C ${controlPoint2.x} ${controlPoint2.y}, ${controlPoint1.x} ${controlPoint1.y}, ${source.x} ${source.y}`;

  // Keep the apparent travel speed consistent with the physical distance:
  // nearby devices animate smoothly and moderately, while distant devices animate gently.
  const durationSec = Math.min(10, Math.max(3.8, len / 55));
  const animationDuration = `${durationSec}s`;
  const reverseBeginOffset = `${(durationSec / 2).toFixed(2)}s`;

  const getLineOpacity = (): number => {
    if (isPathHighlighted) return 1;
    if (isHovered) return 0.9;
    if (isEffectivelyActive) {
      if (isWireless) {
        return wirelessStrength !== undefined ? 0.2 + (wirelessStrength / 5) * 0.6 : 0.1;
      }
      return 0.4;
    }
    return 0.65;
  };

  return (
    <g data-connection-id={connection.id}>
      {/* Invisible wider path for hover detection */}
      <path
        d={pathD}
        id={motionPathId}
        stroke="transparent"
        strokeWidth={12}
        fill="none"
        style={{ cursor: 'pointer' }}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        onClick={onClick}
      />

      {/* Visual Connection line */}
      <path
        d={pathD}
        stroke={isPathHighlighted ? 'var(--color-emerald-400)' : (isCompatible && connection.active !== false ? color : 'var(--color-error-500)')}
        strokeWidth={isPathHighlighted ? 6 : (isHovered ? 7 : 3)}
        fill="none"
        strokeDasharray={isCompatible && connection.active !== false ? 'none' : '6,3'}
        className="pointer-events-none"
        vectorEffect="non-scaling-stroke"
        style={{
          // Inactive cables (powered off / shutdown) get higher opacity so they're visible in dark mode
          opacity: getLineOpacity(),
          filter: isPathHighlighted
            ? 'drop-shadow(0 0 3px var(--color-emerald-400)) drop-shadow(0 0 8px var(--color-emerald-500))'
            : (isHovered || (graphicsQuality === 'high' && isEffectivelyActive && !isWireless) ?
              'drop-shadow(0 0 0.5px ' + color + ') drop-shadow(0 0 1px ' + color + ')' :
              'none'),
          transition: isDragging ? 'none' : 'stroke 0.2s ease, stroke-width 0.2s ease, opacity 0.2s ease, filter 0.2s ease'
        }}
      />
      {isWireless && (
        <path id={reverseMotionPathId} d={reversePathD} fill="none" stroke="none" pointerEvents="none" />
      )}

      {/* Ambient glow for active connections in high graphics mode */}
      {graphicsQuality === 'high' && isEffectivelyActive && !isHovered && !isWireless && (
        <path
          d={pathD}
          stroke={isPathHighlighted ? 'var(--color-emerald-400)' : color}
          strokeWidth={isPathHighlighted ? 2 : 0.4}
          fill="none"
          className="pointer-events-none"
          vectorEffect="non-scaling-stroke"
          style={{
            opacity: isPathHighlighted ? 0.8 : 0.004,
            filter: 'url(#connectionGlowFilter)',
          }}
        />
      )}

      {/* Animated data flow - subtle glowing particles */}
      {(showAnimation || isPathHighlighted) && graphicsQuality === 'high' && isEffectivelyActive && !isDragging && (
        <>
          <circle r={isPathHighlighted ? Math.max(2.8, 4.5 / zoom) : Math.max(1.8, 3.2 / zoom)} fill={isPathHighlighted ? 'var(--color-emerald-300)' : color} className="animate-pulse" style={{ filter: isDark || isPathHighlighted ? `drop-shadow(0 0 4px ${isPathHighlighted ? 'var(--color-emerald-400)' : color})` : 'none', opacity: isPathHighlighted ? 1 : (isDark ? 0.9 : 0.8) }}>
            <animateMotion
              dur={isPathHighlighted ? `${(parseFloat(durationSec.toString()) * 0.4).toFixed(2)}s` : animationDuration}
              repeatCount="indefinite"
            >
              <mpath href={`#${motionPathId}`} />
            </animateMotion>
          </circle>
          <circle r={isPathHighlighted ? Math.max(2.8, 4.5 / zoom) : Math.max(1.8, 3.2 / zoom)} fill={isPathHighlighted ? 'var(--color-emerald-300)' : color} className="animate-pulse" style={{ filter: isDark || isPathHighlighted ? `drop-shadow(0 0 4px ${isPathHighlighted ? 'var(--color-emerald-400)' : color})` : 'none', opacity: isPathHighlighted ? 1 : (isDark ? 0.9 : 0.8) }}>
            <animateMotion
              dur={isPathHighlighted ? `${(parseFloat(durationSec.toString()) * 0.4).toFixed(2)}s` : animationDuration}
              repeatCount="indefinite"
              begin={reverseBeginOffset}
            >
              <mpath href={`#${reverseMotionPathId}`} />
            </animateMotion>
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
            x: mt * mt * mt * source.x + 3 * mt * mt * t * controlPoint1.x + 3 * mt * t * t * controlPoint2.x + t * t * t * target.x,
            y: mt * mt * mt * source.y + 3 * mt * mt * t * controlPoint1.y + 3 * mt * t * t * controlPoint2.y + t * t * t * target.y
          };
        };
        const srcPos = bezierPoint(0.30);
        const tgtPos = bezierPoint(0.70);
        // Calculate label orientation offset
        const angle = Math.atan2(dy, dx);
        const isVertical = Math.abs(Math.sin(angle)) > 0.7;
        const orientX = isVertical ? 15 : 0;
        const orientY = isVertical ? 0 : -12;

        const srcLabel = { x: srcPos.x + perpX + orientX, y: srcPos.y + perpY + orientY };
        const tgtLabel = { x: tgtPos.x + perpX + orientX, y: tgtPos.y + perpY + orientY };

        const badgeX = midX + perpX;
        const badgeY = midY + perpY - 26;

        return (
          <>
            {/* Background for labels to improve readability */}
            <rect
              x={srcLabel.x - 20}
              y={srcLabel.y - 8}
              width="40"
              height="14"
              rx="4"
              fill={isDark ? 'var(--color-secondary-900)' : 'var(--color-background)'}
              opacity={isHovered ? 0.8 : 0.4}
              className="pointer-events-none"
            />
            <text
              x={srcLabel.x}
              y={srcLabel.y + 3}
              fill={color}
              fontSize="10"
              textAnchor="middle"
              className="pointer-events-none select-none"
              fontWeight="bold"
              opacity={isHovered ? 1 : 0.8}
            >
              {connection.sourcePort}
            </text>
            <rect
              x={tgtLabel.x - 20}
              y={tgtLabel.y - 8}
              width="40"
              height="14"
              rx="4"
              fill={isDark ? 'var(--color-secondary-900)' : 'var(--color-background)'}
              opacity={isHovered ? 0.8 : 0.4}
              className="pointer-events-none"
            />
            <text
              x={tgtLabel.x}
              y={tgtLabel.y + 3}
              fill={color}
              fontSize="10"
              textAnchor="middle"
              className="pointer-events-none select-none"
              fontWeight="bold"
              opacity={isHovered ? 1 : 0.8}
            >
              {connection.targetPort}
            </text>

            {/* Midpoint Link Telemetry Tooltip Badge when Hovered - elevated above delete button */}
            {isHovered && (
              <g className="pointer-events-none select-none">
                <rect
                  x={badgeX - 54}
                  y={badgeY - 11}
                  width="108"
                  height="22"
                  rx="6"
                  fill={isDark ? 'var(--color-slate-900)' : 'var(--color-common-white)'}
                  stroke={isEffectivelyActive ? 'var(--color-emerald-500)' : 'var(--color-rose-500)'}
                  strokeWidth="1.5"
                  className="shadow-md"
                  opacity={0.98}
                />
                <text
                  x={badgeX}
                  y={badgeY + 4}
                  fill={isDark ? 'var(--color-sky-400)' : 'var(--color-sky-600)'}
                  fontSize="9.5"
                  textAnchor="middle"
                  fontFamily="monospace"
                  fontWeight="bold"
                >
                  {isEffectivelyActive ? '⚡ 1 Gbps | UP' : '⛔ Link DOWN'}
                </text>
              </g>
            )}
          </>
        );
      })()}
    </g>
  );
}, (prevProps, nextProps) => {
  // BOLT OPTIMIZATION: Compare derived STP blocking state from deviceStates map, rather than map referential equality.
  // This avoids re-rendering all connection lines when irrelevant device states update.
  return (
    prevProps.connection.id === nextProps.connection.id &&
    prevProps.connection.active === nextProps.connection.active &&
    prevProps.connection.ssidIndex === nextProps.connection.ssidIndex &&
    prevProps.sourceDevice.x === nextProps.sourceDevice.x &&
    prevProps.sourceDevice.y === nextProps.sourceDevice.y &&
    prevProps.targetDevice.x === nextProps.targetDevice.x &&
    prevProps.targetDevice.y === nextProps.targetDevice.y &&
    prevProps.sourceDevice.ports.find(p => p.id === prevProps.connection.sourcePort)?.shutdown ===
    nextProps.sourceDevice.ports.find(p => p.id === nextProps.connection.sourcePort)?.shutdown &&
    prevProps.targetDevice.ports.find(p => p.id === nextProps.connection.targetPort)?.shutdown ===
    nextProps.targetDevice.ports.find(p => p.id === nextProps.connection.targetPort)?.shutdown &&
    prevProps.sourceDevice.status === nextProps.sourceDevice.status &&
    prevProps.targetDevice.status === nextProps.targetDevice.status &&
    prevProps.totalSameConns === nextProps.totalSameConns &&
    prevProps.sameConnIndex === nextProps.sameConnIndex &&
    prevProps.isDark === nextProps.isDark &&
    prevProps.isDragging === nextProps.isDragging &&
    prevProps.isHovered === nextProps.isHovered &&
    prevProps.isPathHighlighted === nextProps.isPathHighlighted &&
    prevProps.showAnimation === nextProps.showAnimation &&
    prevProps.showLabel === nextProps.showLabel &&
    prevProps.zoom === nextProps.zoom &&
    getPortSTPBlocking(prevProps.deviceStates, prevProps.sourceDevice, prevProps.connection.sourcePort) ===
    getPortSTPBlocking(nextProps.deviceStates, nextProps.sourceDevice, nextProps.connection.sourcePort) &&
    getPortSTPBlocking(prevProps.deviceStates, prevProps.targetDevice, prevProps.connection.targetPort) ===
    getPortSTPBlocking(nextProps.deviceStates, nextProps.targetDevice, nextProps.connection.targetPort) &&
    prevProps.topologyDevices === nextProps.topologyDevices &&
    getWlan0SignalKey(prevProps.deviceStates, prevProps.sourceDevice) ===
    getWlan0SignalKey(nextProps.deviceStates, nextProps.sourceDevice) &&
    getWlan0SignalKey(prevProps.deviceStates, prevProps.targetDevice) ===
    getWlan0SignalKey(nextProps.deviceStates, nextProps.targetDevice)
  );
});

