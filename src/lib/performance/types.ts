export interface SpatialCell {
  id: string;
  bounds: SpatialBounds;
  nodeIds: string[];
  connectionIds: string[];
}

export interface SpatialBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface SpatialPartition {
  cells: Map<string, SpatialCell>;
  cellSize: number;
  bounds: SpatialBounds;
  nodePositions: Map<string, { x: number; y: number }>;
}

export interface SpatialQuery {
  bounds: SpatialBounds;
  results?: string[];
  includeMargin?: boolean;
  marginSize?: number;
}
