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
  /**
   * Budget switch for the decorative per-cable effects (SVG drop-shadow
   * filters, ambient glow layer and the flowing particles). Every one of them
   * costs a full-canvas repaint on a machine without GPU compositing, so the
   * canvas turns them off once a topology has enough cables that the repaint
   * cost outweighs the look. Hover highlighting is unaffected.
   */
  enableDecorativeEffects?: boolean;
}

/**
 * BOLT OPTIMIZATION:
 * Extracts derived STP blocking/alternate states for a specific device's port.
 * Allows comparing actual status changes rather than Map reference equality in the custom memo comparator.
 *
 * The runtime state is authoritative whenever it has an entry for the port, so
 * the device-object lookup (a linear scan over the port list) is only needed for
 * devices the simulation has not touched yet.
 */
const getPortSTPBlocking = (
  deviceStates: Map<string, SwitchState> | undefined,
  device: CanvasDevice,
  portId: string
): boolean => {
  if (deviceStates) {
    const sp = deviceStates.get(device.id)?.ports?.[portId];
    if (sp) {
      return sp.spanningTree?.state === 'blocking' || sp.spanningTree?.role === 'alternate';
    }
  }
  return device.ports.find(p => p.id === portId)?.spanningTree?.state === 'blocking';
};

/**
 * BOLT OPTIMIZATION:
 * Builds a comparable key from the wifi-relevant state of a device's wlan0 port
 * (shutdown/status/config) so the memo comparator re-renders the link when the
 * runtime/matching status that drives signal strength changes.
 *
 * The comparator builds this key twice per cable on every canvas render, so the
 * result is cached on the port-state object it is derived from: that object is
 * replaced (not mutated) whenever the port changes, which makes the cache
 * exactly as precise as recomputing it.
 */
const wlanSignalKeyCache = new WeakMap<object, string>();

const getWlan0SignalKey = (
  deviceStates: Map<string, SwitchState> | undefined,
  device: CanvasDevice
): string => {
  const wlan = deviceStates?.get(device.id)?.ports?.['wlan0'];
  if (!wlan) return 'none';

  const cached = wlanSignalKeyCache.get(wlan);
  if (cached !== undefined) return cached;

  const key = [
    wlan.shutdown ?? false,
    wlan.status ?? '',
    wlan.wifi?.mode ?? '',
    wlan.wifi?.ssid ?? '',
    wlan.wifi?.security ?? '',
    wlan.wifi?.password ?? '',
    wlan.wifi?.channel ?? '',
  ].map(String).join('|');

  wlanSignalKeyCache.set(wlan, key);
  return key;
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
  enableDecorativeEffects = true,
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

  const isErrdisabled = sourcePort?.status === 'err-disabled' || targetPort?.status === 'err-disabled';
  const speedMismatch = !!(sourcePort?.speed && targetPort?.speed && sourcePort.speed !== 'auto' && targetPort.speed !== 'auto' && sourcePort.speed !== targetPort.speed);
  const duplexMismatch = !!(sourcePort?.duplex && targetPort?.duplex && sourcePort.duplex !== 'auto' && targetPort.duplex !== 'auto' && sourcePort.duplex !== targetPort.duplex);

  let baseColor = !isCompatible || connection.active === false ? CABLE_COLORS.error.primary :
    isErrdisabled ? 'var(--color-rose-500)' :
    (speedMismatch || duplexMismatch) ? 'var(--color-amber-500)' :
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

  const baseSpacing = Math.min(36, Math.max(24, len * 0.12));
  const offset = totalSameConns > 1
    ? (sameConnIndex - (totalSameConns - 1) / 2) * baseSpacing
    : 0;

  // Midpoint spline calculation matching drag spline
  const midX = (source.x + target.x) / 2;
  const midY = (source.y + target.y) / 2;

  const perpX = (-dy / len) * offset;
  const perpY = (dx / len) * offset;

  const isHorizontal = Math.abs(dx) >= Math.abs(dy);

  const controlPoint1 = isHorizontal ? {
    x: midX + perpX,
    y: source.y + perpY
  } : {
    x: source.x + perpX,
    y: midY + perpY
  };

  const controlPoint2 = isHorizontal ? {
    x: midX + perpX,
    y: target.y + perpY
  } : {
    x: target.x + perpX,
    y: midY + perpY
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

  // Decorative effects only make sense while the canvas can afford them.
  // Hover/path highlighting is a direct feedback signal and always renders.
  const useDecorativeEffects = graphicsQuality === 'high' && enableDecorativeEffects;

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
            : (isHovered || (graphicsQuality === 'high' && useDecorativeEffects && isEffectivelyActive && !isWireless) ?
              'drop-shadow(0 0 0.5px ' + color + ') drop-shadow(0 0 1px ' + color + ')' :
              'none'),
        }}
      />
      {isWireless && (
        <path id={reverseMotionPathId} d={reversePathD} fill="none" stroke="none" pointerEvents="none" />
      )}

      {/* Ambient glow for active connections in high graphics mode */}
      {graphicsQuality === 'high' && useDecorativeEffects && isEffectivelyActive && !isHovered && !isWireless && (
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
      {(showAnimation || isPathHighlighted) && graphicsQuality === 'high' && useDecorativeEffects && isEffectivelyActive && !isDragging && (
        <>
          <circle r={isPathHighlighted ? Math.max(2.8, 4.5 / zoom) : Math.max(1.8, 3.2 / zoom)} fill={isPathHighlighted ? 'var(--color-emerald-300)' : color} style={{ filter: isDark || isPathHighlighted ? `drop-shadow(0 0 4px ${isPathHighlighted ? 'var(--color-emerald-400)' : color})` : 'none', opacity: isPathHighlighted ? 1 : (isDark ? 0.9 : 0.8) }}>
            <animateMotion
              dur={isPathHighlighted ? `${(parseFloat(durationSec.toString()) * 0.4).toFixed(2)}s` : animationDuration}
              repeatCount="indefinite"
            >
              <mpath href={`#${motionPathId}`} />
            </animateMotion>
          </circle>
          <circle r={isPathHighlighted ? Math.max(2.8, 4.5 / zoom) : Math.max(1.8, 3.2 / zoom)} fill={isPathHighlighted ? 'var(--color-emerald-300)' : color} style={{ filter: isDark || isPathHighlighted ? `drop-shadow(0 0 4px ${isPathHighlighted ? 'var(--color-emerald-400)' : color})` : 'none', opacity: isPathHighlighted ? 1 : (isDark ? 0.9 : 0.8) }}>
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
          </>
        );
      })()}
    </g>
  );
}, (prevProps, nextProps) => {
  // Object identity is the cheapest correct signal available here. Connections
  // and devices are updated with structural sharing (see updateChangedDevices),
  // so a new object always means something this cable draws has changed:
  // position, cable type, port shutdown, speed/duplex, STP role, err-disable…
  //
  // Comparing a fixed list of fields instead both missed those changes (leaving
  // stale cables on screen after e.g. a cable-type swap) and, because it had to
  // re-read those fields on every render, was slower than the identity check it
  // replaced.
  if (
    prevProps.connection !== nextProps.connection ||
    prevProps.sourceDevice !== nextProps.sourceDevice ||
    prevProps.targetDevice !== nextProps.targetDevice
  ) {
    return false;
  }

  if (
    prevProps.totalSameConns !== nextProps.totalSameConns ||
    prevProps.sameConnIndex !== nextProps.sameConnIndex ||
    prevProps.isDark !== nextProps.isDark ||
    prevProps.isDragging !== nextProps.isDragging ||
    prevProps.isHovered !== nextProps.isHovered ||
    prevProps.isPathHighlighted !== nextProps.isPathHighlighted ||
    prevProps.showAnimation !== nextProps.showAnimation ||
    prevProps.showLabel !== nextProps.showLabel ||
    prevProps.zoom !== nextProps.zoom ||
    prevProps.graphicsQuality !== nextProps.graphicsQuality ||
    prevProps.enableDecorativeEffects !== nextProps.enableDecorativeEffects
  ) {
    return false;
  }

  // Runtime state that lives outside the device objects: STP role per port.
  // Both sides are compared so a cable only repaints when its own endpoints
  // actually moved into (or out of) a blocking state.
  if (
    getPortSTPBlocking(prevProps.deviceStates, prevProps.sourceDevice, prevProps.connection.sourcePort) !==
      getPortSTPBlocking(nextProps.deviceStates, nextProps.sourceDevice, nextProps.connection.sourcePort) ||
    getPortSTPBlocking(prevProps.deviceStates, prevProps.targetDevice, prevProps.connection.targetPort) !==
      getPortSTPBlocking(nextProps.deviceStates, nextProps.targetDevice, nextProps.connection.targetPort)
  ) {
    return false;
  }

  // Only a wireless cable derives anything from the full device list and the
  // global state map (signal strength against the nearest matching AP). Wired
  // cables are done here, which is what keeps a topology-wide device-state tick
  // from repainting every link on the canvas. A wireless cable keeps depending
  // on the whole map because *any* AP's state can move its signal bars.
  if (prevProps.connection.cableType !== 'wireless') return true;

  return (
    prevProps.topologyDevices === nextProps.topologyDevices &&
    prevProps.deviceStates === nextProps.deviceStates &&
    getWlan0SignalKey(prevProps.deviceStates, prevProps.sourceDevice) ===
      getWlan0SignalKey(nextProps.deviceStates, nextProps.sourceDevice) &&
    getWlan0SignalKey(prevProps.deviceStates, prevProps.targetDevice) ===
      getWlan0SignalKey(nextProps.deviceStates, nextProps.targetDevice)
  );
});

