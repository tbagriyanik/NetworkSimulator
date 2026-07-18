import React from 'react';
import { CanvasDevice, CanvasConnection } from '../networkTopology.types';

export interface PingAnimationOverlayProps {
  pingAnimation: {
    sourceId: string;
    targetId: string;
    path: string[];
    currentHopIndex: number;
    progress: number;
    success: boolean | null;
    error?: string;
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

  const { path, currentHopIndex, progress, success, error } = pingAnimation;

  // Show error message if ping failed
  if (success === false && error) {
    return (
      <g key="ping-error" opacity={0.95}>
        <foreignObject x="20" y="20" width="300" height="auto">
          <div className={`p-3 rounded-lg shadow-lg border ${isDark ? 'bg-error-500/20 border-error-500/50' : 'bg-error-50 border-error-200'}`}>
            <div className={`text-sm font-bold ${isDark ? 'text-error-300' : 'text-error-700'}`}>
              {t.pingFailed}
            </div>
            <div className={`text-xs mt-1 ${isDark ? 'text-error-200' : 'text-error-600'}`}>
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
    c => (c.sourceDeviceId === fromDevice.id && c.targetDeviceId === toDevice.id) ||
      (c.sourceDeviceId === toDevice.id && c.targetDeviceId === fromDevice.id)
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

  const envelopeX = bezierX + (tangentDy / tangentLen * 20);
  const envelopeY = bezierY + (-tangentDx / tangentLen * 20);

  const getBezierPoint = (t: number) => {
    const mt = 1 - t;
    return {
      x: mt * mt * mt * source.x + 3 * mt * mt * t * controlPoint1.x + 3 * mt * t * t * controlPoint2.x + t * t * t * target.x,
      y: mt * mt * mt * source.y + 3 * mt * mt * t * controlPoint1.y + 3 * mt * t * t * controlPoint2.y + t * t * t * target.y,
    };
  };

  return (
    <g key="ping-animation" opacity={0.9}>
      {/* Packet trail - fading circles behind envelope in high graphics */}
      {graphicsQuality === 'high' && (
        [0.03, 0.06, 0.09, 0.12, 0.15].map((offset, i) => {
          const trailT = progressVal - offset;
          if (trailT < 0) return null;
          const pt = getBezierPoint(trailT);
          const mtT = 1 - trailT;
          const tDx = -3 * mtT * mtT * source.x + 3 * (mtT * mtT - 2 * mtT * trailT) * controlPoint1.x + 3 * (2 * mtT * trailT - trailT * trailT) * controlPoint2.x + 3 * trailT * trailT * target.x;
          const tDy = -3 * mtT * mtT * source.y + 3 * (mtT * mtT - 2 * mtT * trailT) * controlPoint1.y + 3 * (2 * mtT * trailT - trailT * trailT) * controlPoint2.y + 3 * trailT * trailT * target.y;
          const tLen = Math.sqrt(tDx * tDx + tDy * tDy) || 1;
          const tx = pt.x + (tDy / tLen * 20);
          const ty = pt.y + (-tDx / tLen * 20);
          const opacity = Math.max(0, 0.4 - i * 0.07);
          const radius = Math.max(1.5, 5 - i * 0.7);
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
          <circle cx="0" cy="0" r="16" style={{ fill: 'var(--color-accent-500)' }} opacity="0.2" filter="url(#packetGlow)" className="animate-ping-glow" />
        ) : (
          <circle cx="0" cy="0" r="14" style={{ fill: 'var(--color-accent-500)' }} opacity="0.1" className="animate-ping-glow-low" />
        )}
        <rect x="-10" y="-7" width="20" height="14" rx="2" fill="var(--color-accent-500)" style={{ stroke: 'var(--color-accent-600)', strokeWidth: '1.5' }} />
        <path d="M-8 -3 L0 4 L8 -3" fill="none" stroke="var(--color-white)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </g>
    </g>
  );
};
