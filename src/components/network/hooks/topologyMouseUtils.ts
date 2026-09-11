import { VIRTUAL_CANVAS_WIDTH_DESKTOP, VIRTUAL_CANVAS_HEIGHT_DESKTOP } from '../networkTopology.constants';

export interface Position {
  x: number;
  y: number;
}

export function computeSnappedPosition(
  x: number,
  y: number,
  doSnap: boolean,
  gridSize: number = 20,
  minX: number = 20,
  minY: number = 20,
  maxX: number = VIRTUAL_CANVAS_WIDTH_DESKTOP - 100,
  maxY: number = VIRTUAL_CANVAS_HEIGHT_DESKTOP - 100
): Position {
  let targetX = x;
  let targetY = y;

  if (doSnap) {
    targetX = Math.round(targetX / gridSize) * gridSize;
    targetY = Math.round(targetY / gridSize) * gridSize;
  }

  return {
    x: Math.max(minX, Math.min(targetX, maxX)),
    y: Math.max(minY, Math.min(targetY, maxY)),
  };
}

export function computeDeltaPositions(
  startPositions: Record<string, Position>,
  devicesToMove: string[],
  dx: number,
  dy: number,
  doSnap: boolean
): Map<string, Position> {
  const result = new Map<string, Position>();

  devicesToMove.forEach((id) => {
    const initialPos = startPositions[id];
    if (!initialPos) return;

    const rawX = initialPos.x + dx;
    const rawY = initialPos.y + dy;

    result.set(id, computeSnappedPosition(rawX, rawY, doSnap));
  });

  return result;
}
