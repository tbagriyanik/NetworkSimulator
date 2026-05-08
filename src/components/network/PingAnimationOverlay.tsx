import React, { useLayoutEffect, useRef, useState } from 'react';
import { CanvasDevice, CanvasConnection } from './networkTopology.types';

interface PingAnimationOverlayProps {
  pingAnimation: {
    path: string[];
    currentHopIndex: number;
    progress: number;
    frame: number;
    success: boolean | null;
    sourceId: string;
    targetId: string;
    hopCount: number;
    failedAtHop?: number;
    error?: string;
  } | null;
  devices: CanvasDevice[];
  connections: CanvasConnection[];
  getPortPosition: (device: CanvasDevice, portId: string) => { x: number; y: number };
  getDeviceCenter: (device: CanvasDevice) => { x: number; y: number };
  language: 'tr' | 'en';
}

export function PingAnimationOverlay({
  pingAnimation,
  devices,
  connections,
  getPortPosition,
  getDeviceCenter,
  language
}: PingAnimationOverlayProps) {
  const groupRef = useRef<SVGGElement>(null);
  const innerGroupRef = useRef<SVGGElement>(null);
  const [, setRenderTrigger] = useState(0);

  // Calculate animation values regardless of pingAnimation state
  let bezierX = 0;
  let bezierY = 0;
  let envelopeOffsetX = 0;
  let envelopeOffsetY = 0;
  let hopCount = 0;
  let shouldRender = false;

  let errorX = 0;
  let errorY = 0;
  let isFirewallBlock = false;

  if (pingAnimation) {
    const { path, currentHopIndex, progress, success, failedAtHop, error } = pingAnimation;
    if (path && path.length >= 2 && (success === null || (success === false && currentHopIndex === failedAtHop))) {
      shouldRender = true;
      hopCount = pingAnimation.hopCount;

      // Get current hop devices
      const fromDevice = devices.find(d => d.id === path[currentHopIndex]);
      const toDevice = devices.find(d => d.id === path[currentHopIndex + 1]);

      if (fromDevice && toDevice) {
        // Find connection between these devices to get the bezier curve
        const conn = connections.find(
          c => (c.sourceDeviceId === fromDevice.id && c.targetDeviceId === toDevice.id) ||
            (c.sourceDeviceId === toDevice.id && c.targetDeviceId === fromDevice.id)
        );

        // Get port positions for this connection
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
        const midY = (source.y + target.y) / 2;

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

        const controlPoint1 = {
          x: midX + perpX,
          y: source.y + perpY + Math.abs(offset) * 0.5 - (!conn ? 50 : 0)
        };
        const controlPoint2 = {
          x: midX + perpX,
          y: target.y + perpY - Math.abs(offset) * 0.5 - (!conn ? 50 : 0)
        };

        // Bezier curve calculation (Cubic Bezier)
        const t = progress;
        const t2 = t * t;
        const t3 = t2 * t;
        const mt = 1 - t;
        const mt2 = mt * mt;
        const mt3 = mt2 * mt;

        bezierX = mt3 * source.x + 3 * mt2 * t * controlPoint1.x + 3 * mt * t2 * controlPoint2.x + t3 * target.x;
        bezierY = mt3 * source.y + 3 * mt2 * t * controlPoint1.y + 3 * mt * t2 * controlPoint2.y + t3 * target.y;

        // Calculate angle for the envelope with smooth rotation
        const angle = Math.atan2(target.y - source.y, target.x - source.x);

        // Offset envelope slightly to the side of the line
        envelopeOffsetX = Math.sin(angle) * 20;
        envelopeOffsetY = -Math.cos(angle) * 20;

        // If animation is at the failure point, show red X
        if (success === false && currentHopIndex === failedAtHop) {
          isFirewallBlock = error?.toLowerCase().includes('firewall') || false;
          errorX = bezierX + envelopeOffsetX;
          errorY = bezierY + envelopeOffsetY;
        }
      }
    }
  }

  // Use useLayoutEffect to update DOM directly - bypassing React rendering
  useLayoutEffect(() => {
    if (!innerGroupRef.current || !shouldRender) return;

    // Update transform directly on DOM
    const transformStr = `translate(${bezierX + envelopeOffsetX}, ${bezierY + envelopeOffsetY})`;
    innerGroupRef.current.setAttribute('transform', transformStr);

    // Force a minimal re-render to ensure React knows the component is active
    setRenderTrigger(prev => prev + 1);
  }, [bezierX, bezierY, envelopeOffsetX, envelopeOffsetY, hopCount, shouldRender]);

  if (!shouldRender) return null;

  return (
    <g ref={groupRef}>
      {pingAnimation?.success === false && pingAnimation.currentHopIndex === pingAnimation.failedAtHop && (
        <g transform={`translate(${errorX}, ${errorY})`} className="animate-in fade-in zoom-in duration-300">
          {/* Outer glow */}
          <circle r="15" fill="red" opacity="0.2" className="animate-pulse" />
          {/* The X */}
          <path
            d="M-8 -8 L8 8 M8 -8 L-8 8"
            stroke="red"
            strokeWidth="4"
            strokeLinecap="round"
          />
          {isFirewallBlock && (
            <g transform="translate(0, 25)">
              <rect
                x="-25"
                y="-8"
                width="50"
                height="16"
                rx="4"
                fill="red"
                className="animate-pulse"
              />
              <text
                textAnchor="middle"
                dominantBaseline="middle"
                fill="white"
                fontSize="10"
                fontWeight="black"
                className="select-none"
              >
                BLOCKED
              </text>
            </g>
          )}
        </g>
      )}

      <g
        ref={innerGroupRef}
        transform={`translate(${bezierX + envelopeOffsetX}, ${bezierY + envelopeOffsetY})`}
        opacity={pingAnimation?.success === false && pingAnimation.currentHopIndex === pingAnimation.failedAtHop ? 0.3 : 0.9}
      >
        {/* Hop Count Badge */}
        {hopCount > 0 && (
          <g transform="translate(0, -22)">
            <rect
              x="-12" y="-10" width="24" height="14" rx="4"
              fill="#0891b2"
              stroke="white"
              strokeWidth="1"
            />
            <text
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize="10"
              fontWeight="bold"
              fill="white"
              y="-2"
            >
              {language === 'tr' ? `Hop: ${hopCount}` : `Hop: ${hopCount}`}
            </text>
          </g>
        )}

        {/* Envelope body */}
        <rect
          x="-12" y="-8" width="24" height="16" rx="2"
          fill="#06b6d4"
          stroke="#0891b2"
          strokeWidth="1.5"
        />
        {/* Envelope flap */}
        <path
          d="M-9 -5 L0 3 L9 -5"
          fill="none"
          stroke="white"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </g>
    </g>
  );
}
