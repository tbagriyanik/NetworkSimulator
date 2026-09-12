import React from 'react';
import { CanvasDevice, CanvasConnection } from '../networkTopology.types';
import { BroadcastAnimTarget } from '../hooks/usePingSequence';

export interface PingAnimationOverlayProps {
  pingAnimation: {
    sourceId: string;
    targetId: string;
    path: string[];
    currentHopIndex: number;
    progress: number;
    success: boolean | null;
    error?: string;
    broadcastTargets?: string[];
    broadcastAnim?: BroadcastAnimTarget[];
    broadcastProgress?: number;
  } | null;
  deviceMap: Map<string, CanvasDevice>;
  connections: CanvasConnection[];
  getPortPosition: (device: CanvasDevice, portId: string) => { x: number; y: number };
  getDeviceCenter: (device: CanvasDevice) => { x: number; y: number };
  graphicsQuality: 'low' | 'medium' | 'high';
  isDark: boolean;
  t: Record<string, string>;
  handleEnvelopeClick: (e: React.MouseEvent) => void;
}

export const PingAnimationOverlay: React.FC<PingAnimationOverlayProps> = ({
  pingAnimation,
  deviceMap,
  connections,
  getPortPosition,
  getDeviceCenter,
  graphicsQuality,
  isDark,
  t,
  handleEnvelopeClick,
}) => {
  if (!pingAnimation) return null;

  const { path, currentHopIndex, progress, success, error, broadcastAnim = [], broadcastProgress = 0 } = pingAnimation;

  const isBroadcastActive = broadcastAnim.length > 0 && broadcastProgress > 0 && broadcastProgress < 1;
  const broadcastFrom = broadcastAnim.length > 0 ? broadcastAnim[0] : null;
  const broadcastLabelX = broadcastFrom ? broadcastFrom.fromX : 0;
  const broadcastLabelY = broadcastFrom ? broadcastFrom.fromY - 55 : -55;

  // Show error message if ping failed
  if (success === false && error) {
    return (
      <g key="ping-error" opacity={0.95}>
        <foreignObject x="20" y="20" width="300" height="auto">
          <div className={`p-3 rounded-lg shadow-lg border ${isDark ? 'bg-red-950/80 border-red-500/50' : 'bg-red-50 border-red-200'}`}>
            <div className={`text-sm font-bold ${isDark ? 'text-red-300' : 'text-red-800'}`}>
              {t.pingFailed}
            </div>
            <div className={`text-xs mt-1 leading-relaxed ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
              {error}
            </div>
          </div>
        </foreignObject>
      </g>
    );
  }

  // Show success message if ping succeeded
  if (success === true) {
    return (
      <g key="ping-success" opacity={0.95}>
        <foreignObject x="20" y="20" width="300" height="auto">
          <div className={`p-3 rounded-lg shadow-lg border ${isDark ? 'bg-success-500/20 border-success-500/50' : 'bg-success-50 border-success-200'}`}>
            <div className={`text-sm font-bold ${isDark ? 'text-success-300' : 'text-success-700'}`}>
              {t.pingSuccess}
            </div>
          </div>
        </foreignObject>
      </g>
    );
  }

  if (!path || path.length < 2 || success !== null) return null;

  const fromDevice = deviceMap.get(path[currentHopIndex]);
  const toDevice = deviceMap.get(path[currentHopIndex + 1]);
  if (!fromDevice || !toDevice) return null;

  const conn = connections.find(
    c => ((c.sourceDeviceId === fromDevice.id && c.targetDeviceId === toDevice.id) ||
      (c.sourceDeviceId === toDevice.id && c.targetDeviceId === fromDevice.id)) &&
      c.active !== false
  );

  let source: { x: number; y: number };
  let target: { x: number; y: number };

  if (conn) {
    source = getPortPosition(fromDevice, conn.sourceDeviceId === fromDevice.id ? conn.sourcePort : conn.targetPort);
    target = getPortPosition(toDevice, conn.sourceDeviceId === toDevice.id ? conn.sourcePort : conn.targetPort);
  } else {
    source = getDeviceCenter(fromDevice);
    target = getDeviceCenter(toDevice);
  }

  const midX = (source.x + target.x) / 2;
  const sameDeviceConnections = connections.filter(
    c => (c.sourceDeviceId === fromDevice.id && c.targetDeviceId === toDevice.id) ||
      (c.sourceDeviceId === toDevice.id && c.targetDeviceId === fromDevice.id)
  );
  const sameConnIndex = conn ? sameDeviceConnections.findIndex(c => c.id === conn.id) : 0;
  const totalSameConns = sameDeviceConnections.length;
  const maxOffset = 20;
  const offset = totalSameConns > 1
    ? (sameConnIndex - (totalSameConns - 1) / 2) * (maxOffset / Math.max(totalSameConns - 1, 1))
    : 0;

  const dx = target.x - source.x;
  const dy = target.y - source.y;
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  const perpX = -dy / len * offset;
  const perpY = dx / len * offset;

  const controlPoint1 = { x: midX + perpX, y: source.y + perpY + Math.abs(offset) * 0.5 };
  const controlPoint2 = { x: midX + perpX, y: target.y + perpY - Math.abs(offset) * 0.5 };

  const progressVal = progress;
  const p2 = progressVal * progressVal; const p3 = p2 * progressVal;
  const mt = 1 - progressVal; const mt2 = mt * mt; const mt3 = mt2 * mt;

  const bezierX = mt3 * source.x + 3 * mt2 * progressVal * controlPoint1.x + 3 * mt * p2 * controlPoint2.x + p3 * target.x;
  const bezierY = mt3 * source.y + 3 * mt2 * progressVal * controlPoint1.y + 3 * mt * p2 * controlPoint2.y + p3 * target.y;

  const tangentDx = -3 * mt2 * source.x + 3 * (mt2 - 2 * mt * progressVal) * controlPoint1.x + 3 * (2 * mt * progressVal - p2) * controlPoint2.x + 3 * p2 * target.x;
  const tangentDy = -3 * mt2 * source.y + 3 * (mt2 - 2 * mt * progressVal) * controlPoint1.y + 3 * (2 * mt * progressVal - p2) * controlPoint2.y + 3 * p2 * target.y;
  const tangentLen = Math.sqrt(tangentDx * tangentDx + tangentDy * tangentDy) || 1;

  const cableOffset = 20;
  const envelopeX = bezierX + (tangentDy / tangentLen * cableOffset);
  const envelopeY = bezierY + (-tangentDx / tangentLen * cableOffset);

  const getBezierPoint = (t: number) => {
    const mt = 1 - t;
    return {
      x: mt * mt * mt * source.x + 3 * mt * mt * t * controlPoint1.x + 3 * mt * t * t * controlPoint2.x + t * t * t * target.x,
      y: mt * mt * mt * source.y + 3 * mt * mt * t * controlPoint1.y + 3 * mt * t * t * controlPoint2.y + t * t * t * target.y,
    };
  };

  return (
    <g key="ping-animation" opacity={0.9}>
      {/* Broadcast ARP notification packets fanning out from the switch */}
      {isBroadcastActive && (
        <g key="arp-broadcast">
          {/* Label above the switch */}
          <g transform={`translate(${broadcastLabelX}, ${broadcastLabelY})`}>
            <rect
              x="-86"
              y="-14"
              width="172"
              height="28"
              rx="6"
              fill={isDark ? 'rgba(245, 158, 11, 0.16)' : 'rgba(245, 158, 11, 0.14)'}
              stroke="var(--color-warning-500)"
              strokeWidth="1.2"
              className="animate-pulse"
              style={{ pointerEvents: 'none' }}
            />
            <text
              y="-4"
              textAnchor="middle"
              fill="var(--color-warning-500)"
              fontSize="10"
              fontWeight="bold"
              fontFamily="var(--font-geist-mono)"
              style={{ userSelect: 'none', pointerEvents: 'none' }}
            >
              {t.arpBroadcast || 'ARP Broadcast'} — ff:ff:ff:ff:ff:ff
            </text>
            <text
              y="9"
              textAnchor="middle"
              fill={isDark ? 'var(--color-warning-300)' : 'var(--color-warning-700)'}
              fontSize="7.5"
              style={{ userSelect: 'none', pointerEvents: 'none' }}
            >
              {t.broadcastNotification || 'Flooded to all connected devices'}
            </text>
          </g>

          {/* Notification packets radiating from the switch to each device */}
          {broadcastAnim.map((bt, i) => {
            const bx = bt.fromX + (bt.toX - bt.fromX) * broadcastProgress;
            const by = bt.fromY + (bt.toY - bt.fromY) * broadcastProgress;
            return (
              <g key={`broadcast-packet-${bt.targetId}-${i}`} transform={`translate(${bx}, ${by})`}>
                <circle cx="0" cy="0" r="10" fill="var(--color-warning-500)" opacity="0.16" className="animate-ping-glow" style={{ pointerEvents: 'none' }} />
                <rect x="-10" y="-7" width="20" height="14" rx="2" fill="var(--color-warning-500)" style={{ stroke: 'var(--color-warning-600)', strokeWidth: '1.5' }} />
                <path d="M-8 -3 L0 4 L8 -3" fill="none" stroke="var(--color-white)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                {graphicsQuality === 'high' && i < 3 && (
                  <circle cx="0" cy="0" r="13" fill="none" stroke="var(--color-warning-400)" strokeWidth="0.75" opacity={0.5 * (1 - broadcastProgress)} style={{ pointerEvents: 'none' }} />
                )}
              </g>
            );
          })}
        </g>
      )}

      {/* Packet trail - fading small circles behind envelope in high graphics */}
      {graphicsQuality === 'high' && (
        [0.03, 0.06, 0.09, 0.12, 0.15].map((offset, i) => {
          const trailT = progressVal - offset;
          if (trailT < 0) return null;
          const pt = getBezierPoint(trailT);
          const mtT = 1 - trailT;
          const tDx = -3 * mtT * mtT * source.x + 3 * (mtT * mtT - 2 * mtT * trailT) * controlPoint1.x + 3 * (2 * mtT * trailT - trailT * trailT) * controlPoint2.x + 3 * trailT * trailT * target.x;
          const tDy = -3 * mtT * mtT * source.y + 3 * (mtT * mtT - 2 * mtT * trailT) * controlPoint1.y + 3 * (2 * mtT * trailT - trailT * trailT) * controlPoint2.y + 3 * trailT * trailT * target.y;
          const tLen = Math.sqrt(tDx * tDx + tDy * tDy) || 1;
          const tx = pt.x + (tDy / tLen * cableOffset);
          const ty = pt.y + (-tDx / tLen * cableOffset);
          const opacity = Math.max(0, 0.35 - i * 0.06);
          const radius = Math.max(0.75, 2.2 - i * 0.35);
          return (
            <circle
              key={i}
              cx={tx}
              cy={ty}
              r={radius}
              fill="var(--color-accent-500)"
              opacity={opacity}
              filter={i === 0 ? 'url(#packetGlow)' : undefined}
              className={i === 0 ? 'animate-ping-trail' : undefined}
              style={{ pointerEvents: 'none' }}
            />
          );
        })
      )}

      <g
        transform={`translate(${envelopeX}, ${envelopeY})`}
        className="cursor-pointer"
        onClick={handleEnvelopeClick}
      >
        {/* Glow highlight */}
        {graphicsQuality === 'high' ? (
          <circle cx="0" cy="0" r="12" style={{ fill: 'var(--color-accent-500)' }} opacity="0.2" filter="url(#packetGlow)" className="animate-ping-glow" />
        ) : (
          <circle cx="0" cy="0" r="10" style={{ fill: 'var(--color-accent-500)' }} opacity="0.1" className="animate-ping-glow-low" />
        )}
        <rect x="-10" y="-7" width="20" height="14" rx="2" fill="var(--color-accent-500)" style={{ stroke: 'var(--color-accent-600)', strokeWidth: '1.5' }} />
        <path d="M-8 -3 L0 4 L8 -3" fill="none" stroke="var(--color-white)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </g>
    </g>
  );
};
