// pcPython3DModule.ts
// Python 3D Engine module providing Scene, Cube, Sphere, Cylinder, Plane, Prism,
// Material, Sun, Lamp, CSG union/subtract, and interactive web/desktop scene viewing.

import type {
  Python3DSceneState,
  Object3DData,
  Material3D,
  Light3D,
  SkyConfig,
  GridConfig,
  CameraConfig,
  SkyType,
} from './pcPython3DTypes';
import { generate3DSceneHtml } from './pcPython3DRenderer';
import { colors } from '@/lib/design-tokens/colors';

// Active 3D scenes per device
const active3DScenes: Record<string, Python3DSceneState> = {};
const active3DSceneListeners: Record<string, ((scene: Python3DSceneState | null) => void)[]> = {};

export function getActiveDevice3DScene(deviceId: string): Python3DSceneState | null {
  return active3DScenes[deviceId] || active3DScenes['default'] || null;
}

export function setActiveDevice3DScene(deviceId: string, scene: Python3DSceneState | null): void {
  if (scene) {
    active3DScenes[deviceId] = scene;
    active3DScenes['default'] = scene;
  } else {
    delete active3DScenes[deviceId];
    delete active3DScenes['default'];
  }
  const allListeners = new Set<((scene: Python3DSceneState | null) => void)>();
  Object.values(active3DSceneListeners).forEach(list => {
    list.forEach(cb => allListeners.add(cb));
  });
  allListeners.forEach(cb => cb(scene));
}

export function closeActiveDevice3DScene(deviceId: string): void {
  setActiveDevice3DScene(deviceId, null);
}

export function register3DSceneListener(
  deviceId: string,
  callback: (scene: Python3DSceneState | null) => void
): () => void {
  if (!active3DSceneListeners[deviceId]) {
    active3DSceneListeners[deviceId] = [];
  }
  active3DSceneListeners[deviceId].push(callback);
  
  // Immediately send current state if active
  const current = getActiveDevice3DScene(deviceId);
  if (current) callback(current);

  return () => {
    active3DSceneListeners[deviceId] = (active3DSceneListeners[deviceId] || []).filter(cb => cb !== callback);
  };
}

let idCounter = 1;
function genId(prefix = 'obj'): string {
  return `${prefix}_${Date.now()}_${idCounter++}`;
}

function parseNamedOrPosArgs(
  args: unknown[],
  namedKeys: string[],
  defaults: Record<string, unknown> = {}
): Record<string, unknown> {
  const result: Record<string, unknown> = { ...defaults };
  const last = args[args.length - 1];
  let hasNamed = false;

  if (last && typeof last === 'object' && !Array.isArray(last) && !(last instanceof PyObject3D)) {
    Object.assign(result, last);
    hasNamed = true;
  }

  const posCount = hasNamed ? args.length - 1 : args.length;
  for (let i = 0; i < posCount && i < namedKeys.length; i++) {
    if (args[i] !== undefined && args[i] !== null) {
      result[namedKeys[i]] = args[i];
    }
  }

  return result;
}

/**
 * Base Python 3D Object Class
 */
export class PyObject3D {
  public data: Object3DData;
  protected scene?: PyScene;

  constructor(data: Object3DData) {
    if (!data.position) data.position = [0, 0, 0];
    if (!data.rotation) data.rotation = [0, 0, 0];
    if (!data.scale) data.scale = [1, 1, 1];
    if (!data.material) data.material = { color: colors.status.info, roughness: 0.4, metalness: 0.2, wireframe: false, opacity: 1.0 };
    this.data = data;
  }

  get position(): [number, number, number] {
    if (!this.data.position) this.data.position = [0, 0, 0];
    return this.data.position;
  }

  set position(pos: unknown) {
    if (Array.isArray(pos)) {
      this.data.position = [Number(pos[0] || 0), Number(pos[1] || 0), Number(pos[2] || 0)];
    } else if (pos && typeof pos === 'object') {
      const p = pos as Record<string, unknown>;
      this.data.position = [Number(p.x || 0), Number(p.y || 0), Number(p.z || 0)];
    }
  }

  get rotation(): [number, number, number] {
    if (!this.data.rotation) this.data.rotation = [0, 0, 0];
    return this.data.rotation;
  }

  set rotation(rot: unknown) {
    if (Array.isArray(rot)) {
      this.data.rotation = [Number(rot[0] || 0), Number(rot[1] || 0), Number(rot[2] || 0)];
    }
  }

  get scale(): [number, number, number] {
    if (!this.data.scale) this.data.scale = [1, 1, 1];
    return this.data.scale;
  }

  set scale(s: unknown) {
    if (Array.isArray(s)) {
      this.data.scale = [Number(s[0] || 1), Number(s[1] || 1), Number(s[2] || 1)];
    } else if (typeof s === 'number') {
      this.data.scale = [s, s, s];
    }
  }

  get x(): number { return this.position[0]; }
  set x(val: number) { this.position[0] = Number(val || 0); }

  get y(): number { return this.position[1]; }
  set y(val: number) { this.position[1] = Number(val || 0); }

  get z(): number { return this.position[2]; }
  set z(val: number) { this.position[2] = Number(val || 0); }

  get color(): string { return this.data.material.color; }
  set color(c: string) { this.data.material.color = String(c || colors.status.info); }

  public set_position(x: unknown, y?: unknown, z?: unknown): this {
    if (Array.isArray(x)) {
      this.position = x;
    } else if (x && typeof x === 'object') {
      const p = x as Record<string, unknown>;
      this.data.position = [Number(p.x || 0), Number(p.y || 0), Number(p.z || 0)];
    } else {
      this.data.position = [Number(x || 0), Number(y || 0), Number(z || 0)];
    }
    return this;
  }

  public move(dx: number, dy: number, dz: number): this {
    this.position[0] += Number(dx || 0);
    this.position[1] += Number(dy || 0);
    this.position[2] += Number(dz || 0);
    return this;
  }

  public set_rotation(rx: unknown, ry?: unknown, rz?: unknown): this {
    if (Array.isArray(rx)) {
      this.rotation = rx;
    } else {
      this.data.rotation = [Number(rx || 0), Number(ry || 0), Number(rz || 0)];
    }
    return this;
  }

  public rotate(drx: number, dry: number, drz: number): this {
    this.rotation[0] += Number(drx || 0);
    this.rotation[1] += Number(dry || 0);
    this.rotation[2] += Number(drz || 0);
    return this;
  }

  public set_scale(sx: unknown, sy?: unknown, sz?: unknown): this {
    if (Array.isArray(sx)) {
      this.scale = sx;
    } else {
      const sX = Number(sx || 1);
      const sY = sy !== undefined ? Number(sy) : sX;
      const sZ = sz !== undefined ? Number(sz) : sX;
      this.data.scale = [sX, sY, sZ];
    }
    return this;
  }

  public set_color(color: string): this {
    this.data.material.color = String(color || colors.status.info);
    return this;
  }

  public set_material(mat: Partial<Material3D>): this {
    Object.assign(this.data.material, mat);
    return this;
  }

  /**
   * Union / Merge with another 3D object (birleştirme)
   */
  public union(other: PyObject3D): PyCompound {
    const compound = new PyCompound([this, other], 'union');
    return compound;
  }

  public combine(other: PyObject3D): PyCompound {
    return this.union(other);
  }

  /**
   * Subtract another 3D object from this (birbirinden çıkarma)
   */
  public subtract(cutter: PyObject3D): PyCompound {
    cutter.data.operation = 'subtract';
    const compound = new PyCompound([this, cutter], 'subtract');
    return compound;
  }

  public difference(cutter: PyObject3D): PyCompound {
    return this.subtract(cutter);
  }

  public attachScene(scene: PyScene): void {
    this.scene = scene;
  }
}

export class PyPlane extends PyObject3D {
  constructor(...args: unknown[]) {
    const params = parseNamedOrPosArgs(args, ['width', 'height', 'color'], {
      width: 10,
      height: 10,
      color: colors.cables.console,
      roughness: 0.8,
      metalness: 0.1,
      wireframe: false,
      opacity: 1.0,
    });

    super({
      id: genId('plane'),
      name: 'Plane',
      type: 'plane',
      params: { width: Number(params.width), height: Number(params.height) },
      position: [0, 0, 0],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
      material: {
        color: String(params.color),
        roughness: Number(params.roughness ?? 0.8),
        metalness: Number(params.metalness ?? 0.1),
        wireframe: Boolean(params.wireframe),
        opacity: Number(params.opacity ?? 1.0),
      },
      operation: 'none',
    });
  }
}

export class PyCube extends PyObject3D {
  constructor(...args: unknown[]) {
    const params = parseNamedOrPosArgs(args, ['size', 'color', 'width', 'height', 'depth'], {
      size: 2,
      color: colors.status.info,
      roughness: 0.4,
      metalness: 0.2,
      wireframe: false,
      opacity: 1.0,
    });

    const w = Number(params.width || params.size || 2);
    const h = Number(params.height || params.size || 2);
    const d = Number(params.depth || params.size || 2);

    super({
      id: genId('cube'),
      name: 'Cube',
      type: 'cube',
      params: { width: w, height: h, depth: d, size: Number(params.size || 2) },
      position: [0, 0, 0],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
      material: {
        color: String(params.color),
        roughness: Number(params.roughness ?? 0.4),
        metalness: Number(params.metalness ?? 0.2),
        wireframe: Boolean(params.wireframe),
        opacity: Number(params.opacity ?? 1.0),
      },
      operation: 'none',
    });
  }
}

export class PySphere extends PyObject3D {
  constructor(...args: unknown[]) {
    const params = parseNamedOrPosArgs(args, ['radius', 'color', 'segments'], {
      radius: 1.5,
      color: colors.status.offline,
      segments: 24,
      roughness: 0.3,
      metalness: 0.3,
      wireframe: false,
      opacity: 1.0,
    });

    super({
      id: genId('sphere'),
      name: 'Sphere',
      type: 'sphere',
      params: { radius: Number(params.radius), segments: Number(params.segments) },
      position: [0, 0, 0],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
      material: {
        color: String(params.color),
        roughness: Number(params.roughness ?? 0.3),
        metalness: Number(params.metalness ?? 0.3),
        wireframe: Boolean(params.wireframe),
        opacity: Number(params.opacity ?? 1.0),
      },
      operation: 'none',
    });
  }
}

export class PyCylinder extends PyObject3D {
  constructor(...args: unknown[]) {
    const params = parseNamedOrPosArgs(args, ['radius', 'height', 'color', 'segments'], {
      radius: 1,
      height: 2,
      color: colors.status.online,
      segments: 24,
      roughness: 0.4,
      metalness: 0.2,
      wireframe: false,
      opacity: 1.0,
    });

    super({
      id: genId('cylinder'),
      name: 'Cylinder',
      type: 'cylinder',
      params: {
        radius: Number(params.radius),
        height: Number(params.height),
        segments: Number(params.segments),
      },
      position: [0, 0, 0],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
      material: {
        color: String(params.color),
        roughness: Number(params.roughness ?? 0.4),
        metalness: Number(params.metalness ?? 0.2),
        wireframe: Boolean(params.wireframe),
        opacity: Number(params.opacity ?? 1.0),
      },
      operation: 'none',
    });
  }
}

export class PyPrism extends PyObject3D {
  constructor(...args: unknown[]) {
    const params = parseNamedOrPosArgs(args, ['sides', 'radius', 'height', 'color'], {
      sides: 3, // triangular prism by default
      radius: 1.5,
      height: 2,
      color: colors.status.warning,
      roughness: 0.4,
      metalness: 0.2,
      wireframe: false,
      opacity: 1.0,
    });

    super({
      id: genId('prism'),
      name: 'Prism',
      type: 'prism',
      params: {
        sides: Math.max(3, Number(params.sides)),
        radius: Number(params.radius),
        height: Number(params.height),
      },
      position: [0, 0, 0],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
      material: {
        color: String(params.color),
        roughness: Number(params.roughness ?? 0.4),
        metalness: Number(params.metalness ?? 0.2),
        wireframe: Boolean(params.wireframe),
        opacity: Number(params.opacity ?? 1.0),
      },
      operation: 'none',
    });
  }
}

export class PyCompound extends PyObject3D {
  public operands: PyObject3D[] = [];

  constructor(objects: PyObject3D[], op: 'union' | 'subtract' | 'group' = 'union') {
    const primary = (objects && objects[0]) ? objects[0] : new PyCube();
    const primPos = (primary && primary.data && Array.isArray(primary.data.position)) ? primary.data.position : [0, 0, 0];
    const primRot = (primary && primary.data && Array.isArray(primary.data.rotation)) ? primary.data.rotation : [0, 0, 0];
    const primScale = (primary && primary.data && Array.isArray(primary.data.scale)) ? primary.data.scale : [1, 1, 1];
    const primMat = (primary && primary.data && primary.data.material) ? { ...primary.data.material } : { color: colors.status.info, roughness: 0.4, metalness: 0.2, wireframe: false, opacity: 1.0 };

    super({
      id: genId('compound'),
      name: op === 'subtract' ? 'Difference' : 'Union',
      type: 'compound',
      params: {},
      position: [primPos[0], primPos[1], primPos[2]],
      rotation: [primRot[0], primRot[1], primRot[2]],
      scale: [primScale[0], primScale[1], primScale[2]],
      material: primMat,
      operation: op === 'group' ? 'none' : op,
      operands: (objects || []).slice(1).filter(o => o && o.data).map(o => o.data),
    });
    this.operands = objects || [];
  }
}

/**
 * Scene Class
 */
export class PyScene {
  public deviceId: string;
  public title: string;
  public objects: PyObject3D[] = [];
  public lights: Light3D[] = [];
  public sky: SkyConfig = {
    type: 'day',
    topColor: colors.theme.accent,
    bottomColor: colors.sky[50],
    stars: false,
  };
  public grid: GridConfig = {
    enabled: true,
    size: 20,
    divisions: 20,
    colorCenterLine: colors.cables.console,
    colorGrid: colors.topology.gridLine,
  };
  public camera: CameraConfig = {
    position: [10, 10, 14],
    target: [0, 0, 0],
    fov: 45,
  };
  public autoRotate = false;

  constructor(deviceId: string, ...args: unknown[]) {
    this.deviceId = deviceId;
    const params = parseNamedOrPosArgs(args, ['title', 'sky', 'grid'], {
      title: '3D Sahne',
      sky: 'day',
      grid: true,
    });
    this.title = String(params.title);
    if (params.sky) this.set_sky(params.sky as string);
    this.grid.enabled = Boolean(params.grid);

    // Default Lighting
    this.add_sun([5, 12, 5], 1.0, colors.common.white);
    this.add_lamp([0, 4, 0], 0.8, colors.orange[100], 15);
    this.add_ambient(0.3, colors.common.white);
  }

  public add(...objs: unknown[]): this {
    objs.forEach(o => {
      if (o instanceof PyObject3D) {
        o.attachScene(this);
        this.objects.push(o);
      } else if (Array.isArray(o)) {
        this.add(...o);
      }
    });
    return this;
  }

  public remove(obj: PyObject3D): this {
    this.objects = this.objects.filter(o => o !== obj);
    return this;
  }

  public set_sky(typeOrPreset: string, topColor?: string, bottomColor?: string): this {
    const p = typeOrPreset.toLowerCase();
    if (p === 'day') {
      this.sky = { type: 'day', topColor: colors.theme.accent, bottomColor: colors.sky[50], stars: false };
    } else if (p === 'night') {
      this.sky = { type: 'night', topColor: colors.slate[950], bottomColor: colors.topology.bg, stars: true };
    } else if (p === 'sunset') {
      this.sky = { type: 'sunset', topColor: colors.purple[900], bottomColor: colors.orange['500'], stars: false };
    } else {
      this.sky = {
        type: 'gradient' as SkyType,
        topColor: topColor || colors.topology.canvasBg,
        bottomColor: bottomColor || colors.topology.bg,
        stars: false,
      };
    }
    return this;
  }

  public show_grid(enabled = true, size = 20, divisions = 20): this {
    this.grid.enabled = Boolean(enabled);
    this.grid.size = Number(size || 20);
    this.grid.divisions = Number(divisions || 20);
    return this;
  }

  public add_sun(...args: unknown[]): this {
    const params = parseNamedOrPosArgs(args, ['position', 'intensity', 'color'], {
      position: [5, 10, 5],
      intensity: 1.0,
      color: colors.common.white,
    });
    const pos = Array.isArray(params.position) ? params.position : [5, 10, 5];
    this.lights.push({
      id: genId('sun'),
      type: 'sun',
      position: [Number(pos[0] || 5), Number(pos[1] || 10), Number(pos[2] || 5)],
      color: String(params.color),
      intensity: Number(params.intensity),
    });
    return this;
  }

  public add_lamp(...args: unknown[]): this {
    const params = parseNamedOrPosArgs(args, ['position', 'intensity', 'color', 'distance'], {
      position: [0, 4, 0],
      intensity: 1.0,
      color: colors.orange[100],
      distance: 20,
    });
    const pos = Array.isArray(params.position) ? params.position : [0, 4, 0];
    this.lights.push({
      id: genId('lamp'),
      type: 'lamp',
      position: [Number(pos[0] || 0), Number(pos[1] || 4), Number(pos[2] || 0)],
      color: String(params.color),
      intensity: Number(params.intensity),
      distance: Number(params.distance),
    });
    return this;
  }

  public add_ambient(...args: unknown[]): this {
    const params = parseNamedOrPosArgs(args, ['intensity', 'color'], {
      intensity: 0.3,
      color: colors.common.white,
    });
    this.lights.push({
      id: genId('ambient'),
      type: 'ambient',
      position: [0, 0, 0],
      color: String(params.color),
      intensity: Number(params.intensity),
    });
    return this;
  }

  public add_spot(...args: unknown[]): this {
    const params = parseNamedOrPosArgs(args, ['position', 'target', 'intensity', 'color'], {
      position: [0, 8, 0],
      target: [0, 0, 0],
      intensity: 1.0,
      color: colors.common.white,
    });
    const pos = Array.isArray(params.position) ? params.position : [0, 8, 0];
    const tgt = Array.isArray(params.target) ? params.target : [0, 0, 0];
    this.lights.push({
      id: genId('spot'),
      type: 'spot',
      position: [Number(pos[0] || 0), Number(pos[1] || 8), Number(pos[2] || 0)],
      target: [Number(tgt[0] || 0), Number(tgt[1] || 0), Number(tgt[2] || 0)],
      color: String(params.color),
      intensity: Number(params.intensity),
    });
    return this;
  }

  public set_camera(...args: unknown[]): this {
    const params = parseNamedOrPosArgs(args, ['position', 'target', 'fov'], {
      position: [10, 10, 14],
      target: [0, 0, 0],
      fov: 45,
    });
    const pos = Array.isArray(params.position) ? params.position : [10, 10, 14];
    const tgt = Array.isArray(params.target) ? params.target : [0, 0, 0];
    this.camera.position = [Number(pos[0] || 10), Number(pos[1] || 10), Number(pos[2] || 14)];
    this.camera.target = [Number(tgt[0] || 0), Number(tgt[1] || 0), Number(tgt[2] || 0)];
    this.camera.fov = Number(params.fov || 45);
    return this;
  }

  public toState(mode: 'window' | 'browser' = 'window'): Python3DSceneState {
    return {
      id: genId('scene_state'),
      deviceId: this.deviceId,
      title: this.title,
      width: 800,
      height: 560,
      mode,
      autoRotate: this.autoRotate,
      objects: this.objects.map(o => o.data),
      environment: {
        sky: { ...this.sky },
        grid: { ...this.grid },
        lights: [...this.lights],
        camera: { ...this.camera },
      },
    };
  }

  public show(mode: 'window' | 'browser' = 'window'): void {
    const state = this.toState(mode);
    setActiveDevice3DScene(this.deviceId, state);
  }

  public render(mode: 'window' | 'browser' = 'window'): void {
    this.show(mode);
  }

  public export_html(): string {
    const state = this.toState('browser');
    return generate3DSceneHtml(state);
  }
}

/**
 * Creates a Python-callable constructor wrapper that allows instantiation
 * both with `new Class(...)` and direct function call `Class(...)`.
 */
function callable<T extends new (...args: unknown[]) => unknown>(ClassType: T) {
  const fn = function (...args: unknown[]) {
    return new ClassType(...args);
  };
  Object.setPrototypeOf(fn, ClassType);
  fn.prototype = ClassType.prototype;
  return fn as unknown as T;
}

export function createPython3DModule(deviceId: string): Record<string, unknown> {
  const SceneClass = callable(
    class extends PyScene {
      constructor(...args: unknown[]) {
        super(deviceId, ...args);
      }
    }
  );

  return {
    Scene: SceneClass,
    Plane: callable(PyPlane),
    Cube: callable(PyCube),
    Box: callable(PyCube),
    Sphere: callable(PySphere),
    Cylinder: callable(PyCylinder),
    Silindir: callable(PyCylinder),
    Prism: callable(PyPrism),
    Prizma: callable(PyPrism),
    Group: callable(
      class extends PyCompound {
        constructor(...args: unknown[]) {
          const objs = args.flat().filter(a => a instanceof PyObject3D) as PyObject3D[];
          super(objs, 'group');
        }
      }
    ),
    Material: (params: unknown) => {
      if (params && typeof params === 'object') return params;
      return { color: colors.status.info, roughness: 0.4, metalness: 0.2 };
    },
    // Global helper functions
    show: (scene: unknown, mode: 'window' | 'browser' = 'window') => {
      if (scene instanceof PyScene) {
        scene.show(mode);
      }
    },
    combine: (...objs: unknown[]) => {
      const flat = objs.flat().filter(a => a instanceof PyObject3D) as PyObject3D[];
      if (flat.length >= 2) return flat[0].union(flat[1]);
      return flat[0] || null;
    },
    subtract: (base: unknown, cutter: unknown) => {
      if (base instanceof PyObject3D && cutter instanceof PyObject3D) {
        return base.subtract(cutter);
      }
      return base;
    },
  };
}
