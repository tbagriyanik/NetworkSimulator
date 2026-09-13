// pcPython3DTypes.ts
// 3D Scene, Object, Material, Light, and Environment types for embedded Python 3D engine

export type Object3DType =
  | 'plane'
  | 'cube'
  | 'sphere'
  | 'cylinder'
  | 'prism'
  | 'group'
  | 'compound';

export type CSGOperation = 'none' | 'union' | 'subtract';

export type SkyType = 'day' | 'night' | 'sunset' | 'gradient' | 'solid';

export type LightType = 'sun' | 'directional' | 'lamp' | 'point' | 'ambient' | 'spot';

export interface Material3D {
  color: string;
  roughness: number;
  metalness: number;
  wireframe: boolean;
  opacity: number;
  emissive?: string;
  flatShading?: boolean;
}

export interface Light3D {
  id: string;
  type: LightType;
  position: [number, number, number];
  target?: [number, number, number];
  color: string;
  intensity: number;
  distance?: number;
}

export interface SkyConfig {
  type: SkyType;
  topColor: string;
  bottomColor: string;
  stars?: boolean;
}

export interface GridConfig {
  enabled: boolean;
  size: number;
  divisions: number;
  colorCenterLine?: string;
  colorGrid?: string;
}

export interface CameraConfig {
  position: [number, number, number];
  target: [number, number, number];
  fov: number;
}

export interface Environment3D {
  sky: SkyConfig;
  grid: GridConfig;
  lights: Light3D[];
  camera: CameraConfig;
}

export interface Object3DData {
  id: string;
  name: string;
  type: Object3DType;
  params: Record<string, unknown>;
  position: [number, number, number];
  rotation: [number, number, number]; // in degrees [rx, ry, rz]
  scale: [number, number, number];
  material: Material3D;
  operation: CSGOperation;
  operands?: Object3DData[]; // for CSG subtract / union
}

export interface Python3DSceneState {
  id: string;
  deviceId: string;
  title: string;
  width: number;
  height: number;
  objects: Object3DData[];
  environment: Environment3D;
  autoRotate: boolean;
  mode: 'window' | 'browser';
}
