import { memo } from 'react';
import { CanvasConnection, CanvasDevice } from './networkTopology.types';
import { isCableCompatible, CableInfo } from '@/lib/network/types';
import { Trash2 } from 'lucide-react';

const STUB_BG = 'var(--color-secondary-50)';
const STUB_BG_DARK = 'var(--color-secondary-950)';

interface ConnectionHandleProps {
  connection: CanvasConnection;
  sourceDevice: CanvasDevice;
  targetDevice: CanvasDevice;
  isDark: boolean;
  sameConnIndex: number;
  totalSameConns: number;
  getPortPosition: (device: CanvasDevice, portId: string) => { x: number; y: number };
  onDelete: (connId: string) => void;
}

const ConnectionHandle = memo(function ConnectionHandle({
  connection,
  sourceDevice,
  targetDevice,
  isDark,
  sameConnIndex,
  totalSameConns,
  getPortPosition,
  onDelete,
}: ConnectionHandleProps) {
  const source = getPortPosition(sourceDevice, connection.sourcePort);
  const target = getPortPosition(targetDevice, connection.targetPort);

  const maxOffset = 20;
  const offset = totalSameConns > 1
    ? (sameConnIndex - (totalSameConns - 1) / 2) * (maxOffset / Math.max(totalSameConns - 1, 1))
    : 0;

  const dx = target.x - source.x;
  const dy = target.y - source.y;
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  const midX = (source.x + target.x) / 2;
  const perpX = -dy / len * offset;
  const perpY = dx / len * offset;

  const controlPoint1 = {
    x: midX + perpX,
    y: source.y + perpY + Math.abs(offset) * 0.5,
  };
  const controlPoint2 = {
    x: midX + perpX,
    y: target.y + perpY - Math.abs(offset) * 0.5,
  };

  const tTrash = 0.5;
  const invT = 1 - tTrash;
  const trashX =
    invT * invT * invT * source.x +
    3 * invT * invT * tTrash * controlPoint1.x +
    3 * invT * tTrash * tTrash * controlPoint2.x +
    tTrash * tTrash * tTrash * target.x;
  const trashY =
    invT * invT * invT * source.y +
    3 * invT * invT * tTrash * controlPoint1.y +
    3 * invT * tTrash * tTrash * controlPoint2.y +
    tTrash * tTrash * tTrash * target.y;

  const cableInfo: CableInfo = {
    connected: true,
    cableType: connection.cableType,
    sourceDevice: sourceDevice.type,
    targetDevice: targetDevice.type,
    sourcePort: connection.sourcePort,
    targetPort: connection.targetPort,
  };
  const isCompatible = isCableCompatible(cableInfo);

  return (
    <g key={`handle-${connection.id}`} data-connection-handle-id={connection.id} data-export-hide="true">
      {isCompatible && connection.cableType !== 'wireless' && (
        <g transform={`translate(${trashX}, ${trashY})`} data-handle-inner="true">
          {/* Delete Button */}
          <g
            className="cursor-pointer group"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(connection.id);
            }}
          >
            <circle
              cx="0"
              cy="0"
              r="10"
              fill={isDark ? STUB_BG_DARK : STUB_BG}
              opacity="0.85"
              className="drop-shadow-sm group-hover:fill-error-500/20 transition-colors"
            />
            <Trash2
              className="w-3.5 h-3.5 text-error-500"
              width={14}
              height={14}
              style={{ transform: 'translate(-7px, -7px)' }}
            />
          </g>
        </g>
      )}
      {!isCompatible && (
        <g
          transform={`translate(${midX + perpX}, ${(source.y + target.y) / 2 + perpY})`}
          className="cursor-pointer group"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(connection.id);
          }}
        >
          <path d="M 0 -9 L -10 7 L 10 7 Z" fill="var(--color-error-500)" stroke="var(--color-secondary-50)" strokeWidth="1" />
          <text y="4" fontSize="10" fontStyle="normal" fontWeight="bold" fill="var(--color-secondary-50)" textAnchor="middle">
            !
          </text>
        </g>
      )}
    </g>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.connection.id === nextProps.connection.id &&
    prevProps.isDark === nextProps.isDark &&
    prevProps.sameConnIndex === nextProps.sameConnIndex &&
    prevProps.totalSameConns === nextProps.totalSameConns &&
    prevProps.sourceDevice.x === nextProps.sourceDevice.x &&
    prevProps.sourceDevice.y === nextProps.sourceDevice.y &&
    prevProps.targetDevice.x === nextProps.targetDevice.x &&
    prevProps.targetDevice.y === nextProps.targetDevice.y &&
    prevProps.connection.active === nextProps.connection.active
  );
});

export { ConnectionHandle };
